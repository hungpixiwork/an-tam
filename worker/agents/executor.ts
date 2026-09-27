// Duyệt + thực thi hành động agent.
//   pending → approved (UPDATE … WHERE status='pending'; 0 dòng → 409, không chạy lần 2)
//   → executing → done | failed. Phần ghi nội bộ + trạng thái 'done' + audit nằm trong MỘT batch
//   (lỗi = rollback cả cụm). Tích hợp chưa kết nối → failed "Cần kết nối <tên>" — không báo thành công giả.

import type { Env } from '../env';
import type { AgentActionStatus } from '../../shared/types/api';
import { ACTION_TYPES, isActionType, type ActionType } from '../../shared/agent/actions';
import { TOOL_NAME, TOOL_PROVIDER, type ToolKey } from '../../shared/agent/tools';
import { addDays } from '../../shared/engine/scheduler';
import { formatVndFull } from '../../shared/format';
import { batchWithAudit, maskSummary, writeAudit } from '../lib/audit';
import { ApiError, notFound } from '../lib/http';
import { afterChange } from '../lib/refresh';
import { loadIntegration } from '../integrations/tokens';
import { pushApproved, syncInfo } from '../integrations/google/sync';
import { getAccessToken } from '../integrations/tokens';

interface Row { id: string; run_id: string | null; agent: string | null; type: string; title: string; payload_json: string; status: AgentActionStatus; expires_at: string }

export class NeedsIntegration extends Error {}

const loadRow = async (db: D1Database, userId: string, id: string) => {
  const row = await db.prepare('SELECT id, run_id, agent, type, title, payload_json, status, expires_at FROM agent_actions WHERE id = ? AND user_id = ?').bind(id, userId).first<Row>();
  if (!row) throw notFound('Không tìm thấy hành động');
  return row;
};

/** Thêm 1 dòng vào nhật ký của lượt chạy (timeline). */
async function appendStep(db: D1Database, userId: string, runId: string | null, agent: string, title: string, ok: boolean, detail?: string) {
  if (!runId) return;
  await db.prepare(
    `INSERT INTO agent_steps (id, run_id, user_id, idx, agent, kind, title, detail_masked, status, finished_at)
     VALUES (?, ?, ?, (SELECT COALESCE(MAX(idx), 0) + 1 FROM agent_steps WHERE run_id = ?), ?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), runId, userId, runId, agent, ok ? 'tool' : 'error', title, detail ?? null, ok ? 'done' : 'failed', new Date().toISOString()).run();
}

/** Tích hợp đã kết nối và đủ quyền cho công cụ này chưa. */
async function toolReady(env: Env, userId: string, tool: ToolKey): Promise<boolean> {
  const { provider, scope } = TOOL_PROVIDER[tool];
  const row = await loadIntegration(env.DB, userId, provider);
  if (!row || row.status !== 'connected') return false;
  return scope ? row.scopes.split(' ').some((s) => scope.test(s)) : true;
}

interface Outcome { statements: D1PreparedStatement[]; result: Record<string, unknown>; summary: string; after?: () => Promise<Record<string, unknown>>; refresh?: string }

/** Lệnh ghi cho từng loại hành động (chưa chạy). */
async function prepare(env: Env, userId: string, row: Row, type: ActionType): Promise<Outcome> {
  const db = env.DB;
  const payload = ACTION_TYPES[type].schema.parse(JSON.parse(row.payload_json));
  switch (type) {
    case 'calendar.create_events': {
      const p = payload as ReturnType<typeof ACTION_TYPES['calendar.create_events']['schema']['parse']>;
      const ids = p.events.map(() => crypto.randomUUID());
      const days = p.events.map((e) => e.startsAt.slice(0, 10)).sort();
      return {
        statements: p.events.map((e, i) =>
          db.prepare("INSERT INTO calendar_events (id, user_id, title, note, category, starts_at, ends_at, source, action_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'agent', ?)")
            .bind(ids[i], userId, e.title, e.note ?? '', e.category, e.startsAt, e.endsAt, row.id),
        ),
        result: { eventIds: ids, count: ids.length },
        summary: `Thêm ${ids.length} sự kiện vào lịch`,
        // Giống trang Lịch AI: đã kết nối Google → đẩy lên lịch "An Tâm"; lỗi mạng không làm hỏng việc tạo lịch nội bộ
        after: async () => {
          if ((await syncInfo(env, userId)).status !== 'connected') return { pushed: 0, google: false };
          const pushed = await getAccessToken(env, userId)
            .then((token) => pushApproved(env, userId, token, days[0], addDays(days[days.length - 1], 1)))
            .catch(() => 0);
          return { pushed, google: true };
        },
      };
    }
    case 'budget.set': {
      const p = payload as ReturnType<typeof ACTION_TYPES['budget.set']['schema']['parse']>;
      return {
        statements: [
          db.prepare(
            "INSERT INTO budgets (user_id, month, category, limit_amount) VALUES (?, ?, 'all', ?) ON CONFLICT (user_id, month, category) DO UPDATE SET limit_amount = excluded.limit_amount, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
          ).bind(userId, p.month, p.limit),
        ],
        result: { month: p.month, limit: p.limit },
        summary: `Đặt ngân sách tháng ${p.month}`,
        refresh: `Tháng ${p.month.slice(5)}/${p.month.slice(0, 4)}: ngân sách chi ${formatVndFull(p.limit)} (An Tâm AI đề xuất).`,
      };
    }
    case 'goal.update_progress': {
      const p = payload as ReturnType<typeof ACTION_TYPES['goal.update_progress']['schema']['parse']>;
      const goal = await db.prepare('SELECT id FROM goals WHERE id = ? AND user_id = ?').bind(p.goalId, userId).first();
      if (!goal) throw new Error('Mục tiêu không còn tồn tại');
      return {
        statements: [db.prepare('UPDATE goals SET monthly_contribution = ? WHERE id = ? AND user_id = ?').bind(p.monthlyAfter, p.goalId, userId)],
        result: { goalId: p.goalId, monthly: p.monthlyAfter },
        summary: `Cập nhật mức để dành cho mục tiêu "${p.goalTitle}"`,
        refresh: `Mục tiêu "${p.goalTitle}": để dành ${formatVndFull(p.monthlyAfter)}/tháng.`,
      };
    }
    case 'reminder.create': {
      const p = payload as ReturnType<typeof ACTION_TYPES['reminder.create']['schema']['parse']>;
      const [h, m] = p.time.split(':').map(Number);
      const end = `${String(h + Math.floor((m + 15) / 60)).padStart(2, '0')}:${String((m + 15) % 60).padStart(2, '0')}`;
      const ids = p.dates.map(() => crypto.randomUUID());
      return {
        statements: p.dates.map((d, i) =>
          db.prepare("INSERT INTO calendar_events (id, user_id, title, note, category, starts_at, ends_at, source, action_id) VALUES (?, ?, ?, 'Nhắc nhở của An Tâm AI', ?, ?, ?, 'agent', ?)")
            .bind(ids[i], userId, p.title, p.category, `${d}T${p.time}`, `${d}T${end}`, row.id),
        ),
        result: { eventIds: ids, count: ids.length },
        summary: `Tạo ${ids.length} nhắc nhở`,
      };
    }
    case 'gmail.send':
    case 'sheets.update_budget':
    case 'notion.weekly_report': {
      const tool = ACTION_TYPES[type].integration as ToolKey;
      if (!(await toolReady(env, userId, tool))) throw new NeedsIntegration(`Cần kết nối ${TOOL_NAME[tool]}`);
      // Đã kết nối nhưng bản này chưa có trình gửi cho công cụ này → báo rõ, không giả thành công
      throw new NeedsIntegration(`${TOOL_NAME[tool]} chưa được hỗ trợ trong phiên bản này`);
    }
  }
}

export interface ExecResult { id: string; status: AgentActionStatus; error: string | null; result?: Record<string, unknown> | null }

/** Duyệt và thực thi một hành động. Gọi 2 lần với cùng id → lần 2 nhận 409, không thực thi lại. */
export async function approveAndExecute(env: Env, userId: string, id: string, approver: 'user' | 'auto' = 'user'): Promise<ExecResult> {
  const db = env.DB;
  const salt = { salt: env.AUDIT_HASH_SALT };
  const row = await loadRow(db, userId, id);
  const now = new Date().toISOString();
  if (row.status === 'pending' && row.expires_at <= now) {
    await db.prepare("UPDATE agent_actions SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'pending'").bind(now, id).run();
    throw new ApiError(409, 'expired', 'Đề xuất đã hết hạn, vui lòng lập kế hoạch lại');
  }
  const claim = await db.prepare("UPDATE agent_actions SET status = 'approved', approver = ?, decided_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status = 'pending'")
    .bind(approver, now, now, id, userId).run();
  if (!claim.meta.changes) throw new ApiError(409, 'already_decided', 'Hành động này đã được xử lý');
  await writeAudit(db, {
    userId, actor: 'user', agent: row.agent, action: 'action.approve', entityType: 'agent_action', entityId: id, actionId: id, runId: row.run_id,
    summaryMasked: maskSummary(`Duyệt: ${row.title}`), status: 'approved', approver,
  }, salt);

  await db.prepare("UPDATE agent_actions SET status = 'executing', updated_at = ? WHERE id = ? AND status = 'approved'").bind(new Date().toISOString(), id).run();
  const agent = row.agent ?? 'planner';
  try {
    if (!isActionType(row.type)) throw new Error('Loại hành động không được hỗ trợ');
    const out = await prepare(env, userId, row, row.type);
    const done = new Date().toISOString();
    await batchWithAudit(
      db,
      [
        ...out.statements,
        db.prepare("UPDATE agent_actions SET status = 'done', executed_at = ?, updated_at = ?, result_json = ? WHERE id = ? AND status = 'executing'").bind(done, done, JSON.stringify(out.result), id),
      ],
      { userId, actor: 'agent', agent, action: row.type, entityType: 'agent_action', entityId: id, actionId: id, runId: row.run_id, summaryMasked: maskSummary(out.summary), status: 'completed', approver },
      salt,
    );
    let result = out.result;
    if (out.after) {
      result = { ...result, ...(await out.after()) };
      await db.prepare('UPDATE agent_actions SET result_json = ? WHERE id = ?').bind(JSON.stringify(result), id).run();
    }
    if (out.refresh) await afterChange(db, userId, { title: 'An Tâm AI cập nhật kế hoạch', detail: out.refresh });
    const where = result.google ? 'Google Calendar' : 'lịch';
    const title = row.type === 'calendar.create_events' ? `Đã thêm ${result.count} sự kiện vào ${where}` : `Đã thực hiện: ${row.title}`;
    await appendStep(db, userId, row.run_id, agent, title, true);
    await finishRun(db, userId, row.run_id);
    return { id, status: 'done', error: null, result };
  } catch (err) {
    const message = err instanceof NeedsIntegration ? err.message : err instanceof Error && err.message.length < 120 ? err.message : 'Thực thi không thành công';
    const t = new Date().toISOString();
    await db.prepare("UPDATE agent_actions SET status = 'failed', error = ?, updated_at = ?, executed_at = ? WHERE id = ?").bind(message, t, t, id).run();
    await writeAudit(db, {
      userId, actor: 'agent', agent, action: row.type, entityType: 'agent_action', entityId: id, actionId: id, runId: row.run_id,
      summaryMasked: maskSummary(`${row.title}: ${message}`), status: 'failed', approver,
    }, salt);
    await appendStep(db, userId, row.run_id, agent, `${row.title}: ${message}`, false);
    await finishRun(db, userId, row.run_id);
    return { id, status: 'failed', error: message };
  }
}

/** Mọi hành động của lượt chạy đã được quyết → lượt chạy hoàn tất. */
async function finishRun(db: D1Database, userId: string, runId: string | null) {
  if (!runId) return;
  const t = new Date().toISOString();
  await db.prepare(
    `UPDATE agent_runs SET status = 'completed', completed_at = ?, updated_at = ?
     WHERE id = ? AND user_id = ? AND status = 'awaiting_approval'
       AND NOT EXISTS (SELECT 1 FROM agent_actions WHERE run_id = ? AND status IN ('pending', 'approved', 'executing'))`,
  ).bind(t, t, runId, userId, runId).run();
}

/** Từ chối (hoặc yêu cầu điều chỉnh) một hành động đang chờ. */
export async function decline(env: Env, userId: string, id: string, kind: 'rejected' | 'changes_requested', note?: string): Promise<Row> {
  const db = env.DB;
  const row = await loadRow(db, userId, id);
  const now = new Date().toISOString();
  const res = await db.prepare("UPDATE agent_actions SET status = ?, approver = 'user', note = ?, decided_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status = 'pending'")
    .bind(kind, note ?? null, now, now, id, userId).run();
  if (!res.meta.changes) throw new ApiError(409, 'already_decided', 'Hành động này đã được xử lý');
  await writeAudit(db, {
    userId, actor: 'user', agent: row.agent, action: kind === 'rejected' ? 'action.reject' : 'action.request_changes', entityType: 'agent_action', entityId: id, actionId: id, runId: row.run_id,
    summaryMasked: maskSummary(`${kind === 'rejected' ? 'Từ chối' : 'Yêu cầu điều chỉnh'}: ${row.title}`), status: 'rejected', approver: 'user',
  }, { salt: env.AUDIT_HASH_SALT });
  await finishRun(db, userId, row.run_id);
  return row;
}
