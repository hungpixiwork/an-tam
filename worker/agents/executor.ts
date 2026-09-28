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
import { lifeChoiceInsertStatements } from '../routes/lifeChoices';
import { insertGoal } from '../routes/goals';
import { userPlan } from '../lib/usage';
import { PLANS, PLAN_LABEL } from '../../shared/plans';

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
    case 'safety.set_target': {
      const p = payload as ReturnType<typeof ACTION_TYPES['safety.set_target']['schema']['parse']>;
      const goalId = p.goalId ?? crypto.randomUUID();
      const current = p.goalId ? null : (await db.prepare(
        "SELECT COALESCE(SUM(value), 0) AS v FROM holdings WHERE user_id = ? AND category = 'cash'",
      ).bind(userId).first<{ v: number }>())?.v ?? 0;
      return {
        statements: [
          db.prepare('UPDATE financial_profiles SET emergency_target_months = ? WHERE user_id = ?').bind(p.months, userId),
          p.goalId
            ? db.prepare('UPDATE goals SET target_amount = ?, monthly_contribution = ?, target_month = ? WHERE id = ? AND user_id = ?')
              .bind(p.targetAmount, p.monthly, p.targetMonth, p.goalId, userId)
            : insertGoal(db, userId, {
              kind: 'emergency', title: 'Quỹ dự phòng', targetAmount: p.targetAmount, currentAmount: current ?? 0, targetMonth: p.targetMonth,
              monthlyContribution: p.monthly, priority: 1, icon: 'umbrella', horizon: 'short',
            }, goalId),
        ],
        result: { goalId, created: !p.goalId, months: p.months },
        summary: `Đặt quỹ dự phòng ${p.months} tháng chi tiêu`,
        refresh: `Quỹ dự phòng: mục tiêu ${p.months} tháng (${formatVndFull(p.targetAmount)}), để dành ${formatVndFull(p.monthly)}/tháng.`,
      };
    }
    case 'holding.rebalance': {
      const p = payload as ReturnType<typeof ACTION_TYPES['holding.rebalance']['schema']['parse']>;
      const from = await db.prepare('SELECT value FROM holdings WHERE id = ? AND user_id = ?').bind(p.fromId, userId).first<{ value: number }>();
      const to = await db.prepare('SELECT value FROM holdings WHERE id = ? AND user_id = ?').bind(p.toId, userId).first<{ value: number }>();
      if (!from || !to) throw new Error('Khoản tài sản không còn tồn tại');
      if (from.value < p.amount) throw new Error('Giá trị hiện tại nhỏ hơn số tiền cần chuyển');
      return {
        statements: [
          db.prepare('UPDATE holdings SET value = value - ? WHERE id = ? AND user_id = ?').bind(p.amount, p.fromId, userId),
          db.prepare('UPDATE holdings SET value = value + ? WHERE id = ? AND user_id = ?').bind(p.amount, p.toId, userId),
        ],
        result: { fromId: p.fromId, toId: p.toId, amount: p.amount },
        summary: `Chuyển ${formatVndFull(p.amount)} từ ${p.fromName} sang ${p.toName}`,
        refresh: `Giảm tài sản tập trung: ${p.fromName} −${formatVndFull(p.amount)}, ${p.toName} +${formatVndFull(p.amount)}.`,
      };
    }
    case 'earn.set_target': {
      const p = payload as ReturnType<typeof ACTION_TYPES['earn.set_target']['schema']['parse']>;
      return {
        statements: [
          db.prepare(
            `INSERT INTO income_profiles (user_id, target_income, target_months) VALUES (?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET target_income = excluded.target_income, target_months = excluded.target_months`,
          ).bind(userId, p.target, p.months),
        ],
        result: { target: p.target, months: p.months },
        summary: `Đặt mục tiêu thu nhập ${formatVndFull(p.target)}/tháng`,
        refresh: `Mục tiêu thu nhập: ${formatVndFull(p.target)}/tháng trong ${p.months} tháng.`,
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
    case 'life_choice.create': {
      const p = payload as ReturnType<typeof ACTION_TYPES['life_choice.create']['schema']['parse']>;
      const choiceId = crypto.randomUUID();
      return {
        statements: lifeChoiceInsertStatements(db, userId, choiceId, {
          title: p.title, description: p.option.description, cost: p.option.cost, kind: p.kind,
          template: p.kind === 'custom' ? undefined : p.kind,
        }, [p.option]),
        result: { choiceId },
        summary: `Lưu phương án "${p.option.title}" vào Lựa chọn cuộc đời`,
      };
    }
    case 'life_choice.update_plan': {
      const p = payload as ReturnType<typeof ACTION_TYPES['life_choice.update_plan']['schema']['parse']>;
      const own = await db.prepare('SELECT id FROM life_choices WHERE id = ? AND user_id = ?').bind(p.choiceId, userId).first();
      if (!own) throw new Error('Không tìm thấy lựa chọn');
      const next = (await db.prepare('SELECT COALESCE(MAX(order_idx), -1) + 1 AS n FROM life_choice_tasks WHERE choice_id = ?').bind(p.choiceId).first<{ n: number }>())?.n ?? 0;
      const ids = p.tasks.map(() => crypto.randomUUID());
      return {
        statements: [
          ...(p.startAfter ? [db.prepare('UPDATE life_choice_options SET start_month = ? WHERE id = ? AND choice_id = ?').bind(p.startAfter, p.optionId, p.choiceId)] : []),
          // Việc mới là việc "hôm nay" của Agent; các việc cũ rời khỏi danh sách hôm nay
          db.prepare('UPDATE life_choice_tasks SET today = 0 WHERE choice_id = ?').bind(p.choiceId),
          ...p.tasks.map((t, i) =>
            db.prepare('INSERT INTO life_choice_tasks (id, choice_id, title, detail, priority, category, today, order_idx, link, action_json) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)')
              .bind(ids[i], p.choiceId, t.title, t.detail, t.priority, t.category, next + i, t.link ?? null, t.action ? JSON.stringify(t.action) : null),
          ),
        ],
        result: { choiceId: p.choiceId, taskIds: ids, startMonth: p.startAfter },
        summary: `Cập nhật kế hoạch "${p.choiceTitle}": ${ids.length} việc mới${p.startAfter ? `, bắt đầu ${p.startAfter}` : ''}`,
        refresh: `Lựa chọn "${p.choiceTitle}": ${ids.length ? `${ids.length} việc mới` : 'cập nhật'}${p.startAfter ? `, bắt đầu T${Number(p.startAfter.slice(5))}/${p.startAfter.slice(0, 4)}` : ''}.`,
      };
    }
    case 'alert_rule.create': {
      const p = payload as ReturnType<typeof ACTION_TYPES['alert_rule.create']['schema']['parse']>;
      let count: number;
      try {
        count = (await db.prepare('SELECT COUNT(*) AS n FROM alert_rules WHERE user_id = ?').bind(userId).first<{ n: number }>())?.n ?? 0;
      } catch (err) {
        if (err instanceof Error && /no such table/i.test(err.message)) throw new Error('Chưa hỗ trợ cảnh báo giá');
        throw err;
      }
      const { plan } = await userPlan(db, userId);
      const max = PLANS[plan].alertRules;
      if (count >= max) throw new Error(`Gói ${PLAN_LABEL[plan]} đặt tối đa ${max} cảnh báo giá`);
      const ruleId = crypto.randomUUID();
      return {
        statements: [
          db.prepare('INSERT INTO alert_rules (id, user_id, symbol, direction, threshold_pct) VALUES (?, ?, ?, ?, ?)').bind(ruleId, userId, p.symbol, p.direction, p.thresholdPct),
        ],
        result: { ruleId, symbol: p.symbol },
        summary: `Bật cảnh báo giá ${p.label}`,
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

/* ───────── Hoàn tác ───────── */

/** Chỉ hoàn tác được trong 10 phút sau khi áp dụng (sau đó dữ liệu có thể đã đổi tiếp). */
export const UNDO_WINDOW_MS = 10 * 60_000;

/** Lệnh đưa dữ liệu về như trước, dựa trên giá trị "trước" lưu trong payload + kết quả thực thi. */
function undoStatements(db: D1Database, userId: string, id: string, type: ActionType, payload: unknown, result: Record<string, unknown>): { statements: D1PreparedStatement[]; summary: string } {
  const p = ACTION_TYPES[type].schema.parse(payload) as Record<string, any>;
  switch (type) {
    case 'safety.set_target':
      return {
        statements: [
          db.prepare('UPDATE financial_profiles SET emergency_target_months = ? WHERE user_id = ?').bind(p.monthsBefore, userId),
          result.created
            ? db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').bind(result.goalId, userId)
            : db.prepare('UPDATE goals SET target_amount = ?, monthly_contribution = ?, target_month = ? WHERE id = ? AND user_id = ?')
              .bind(p.targetBefore, p.monthlyBefore, p.targetMonthBefore, p.goalId, userId),
        ],
        summary: `Hoàn tác quỹ dự phòng về ${p.monthsBefore} tháng`,
      };
    case 'goal.update_progress':
      return { statements: [db.prepare('UPDATE goals SET monthly_contribution = ? WHERE id = ? AND user_id = ?').bind(p.monthlyBefore, p.goalId, userId)], summary: `Hoàn tác mức để dành "${p.goalTitle}"` };
    case 'budget.set':
      return {
        statements: [p.limitBefore === null
          ? db.prepare("DELETE FROM budgets WHERE user_id = ? AND month = ? AND category = 'all'").bind(userId, p.month)
          : db.prepare("UPDATE budgets SET limit_amount = ? WHERE user_id = ? AND month = ? AND category = 'all'").bind(p.limitBefore, userId, p.month)],
        summary: `Hoàn tác ngân sách tháng ${p.month}`,
      };
    case 'holding.rebalance':
      return {
        statements: [
          db.prepare('UPDATE holdings SET value = value + ? WHERE id = ? AND user_id = ?').bind(p.amount, p.fromId, userId),
          db.prepare('UPDATE holdings SET value = MAX(0, value - ?) WHERE id = ? AND user_id = ?').bind(p.amount, p.toId, userId),
        ],
        summary: `Hoàn tác chuyển ${formatVndFull(p.amount)} từ ${p.fromName}`,
      };
    case 'earn.set_target':
      return { statements: [db.prepare('UPDATE income_profiles SET target_income = ?, target_months = ? WHERE user_id = ?').bind(p.targetBefore, p.monthsBefore, userId)], summary: 'Hoàn tác mục tiêu thu nhập' };
    case 'reminder.create':
    case 'calendar.create_events':
      if (result.google) throw new ApiError(409, 'undo_unavailable', 'Sự kiện đã lên Google Calendar — hãy xóa trên Google Calendar');
      return { statements: [db.prepare('DELETE FROM calendar_events WHERE action_id = ? AND user_id = ?').bind(id, userId)], summary: 'Hoàn tác lịch đã thêm' };
    case 'alert_rule.create':
      return { statements: [db.prepare('DELETE FROM alert_rules WHERE id = ? AND user_id = ?').bind(result.ruleId, userId)], summary: `Hoàn tác cảnh báo ${p.label}` };
    case 'life_choice.update_plan': {
      const ids = (result.taskIds as string[] | undefined) ?? [];
      return {
        statements: [
          ...ids.map((taskId) => db.prepare('DELETE FROM life_choice_tasks WHERE id = ? AND choice_id = ?').bind(taskId, p.choiceId)),
          ...(p.startAfter ? [db.prepare('UPDATE life_choice_options SET start_month = ? WHERE id = ? AND choice_id = ?').bind(p.startBefore, p.optionId, p.choiceId)] : []),
        ],
        summary: `Hoàn tác cập nhật kế hoạch "${p.choiceTitle}"`,
      };
    }
    default:
      throw new ApiError(409, 'undo_unavailable', 'Hành động này không hoàn tác được');
  }
}

/** Hoàn tác một hành động đã áp dụng (một lần, trong UNDO_WINDOW_MS). Ghi audit trong cùng batch. */
export async function undoAction(env: Env, userId: string, id: string): Promise<{ id: string; undone: true }> {
  const db = env.DB;
  const row = await db.prepare('SELECT id, run_id, agent, type, title, payload_json, result_json, status, executed_at, undone_at FROM agent_actions WHERE id = ? AND user_id = ?')
    .bind(id, userId).first<Row & { result_json: string | null; executed_at: string | null; undone_at: string | null }>();
  if (!row) throw notFound('Không tìm thấy hành động');
  if (row.status !== 'done' || row.undone_at) throw new ApiError(409, 'undo_unavailable', 'Hành động này không còn hoàn tác được');
  if (!row.executed_at || Date.now() - Date.parse(row.executed_at) > UNDO_WINDOW_MS) throw new ApiError(409, 'undo_expired', 'Đã quá thời gian hoàn tác');
  if (!isActionType(row.type)) throw new ApiError(409, 'undo_unavailable', 'Hành động này không hoàn tác được');
  const { statements, summary } = undoStatements(db, userId, id, row.type, JSON.parse(row.payload_json), row.result_json ? JSON.parse(row.result_json) : {});
  const now = new Date().toISOString();
  // Hai lần bấm đồng thời: chỉ một request đổi được undone_at, request kia dừng ở đây
  const claim = await db.prepare('UPDATE agent_actions SET undone_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND undone_at IS NULL').bind(now, now, id, userId).run();
  if (!claim.meta.changes) throw new ApiError(409, 'undo_unavailable', 'Hành động này đã được hoàn tác');
  await batchWithAudit(db, statements, {
    userId, actor: 'user', agent: row.agent ?? 'planner', action: 'action.undo', entityType: 'agent_action', entityId: id, actionId: id, runId: row.run_id,
    summaryMasked: maskSummary(summary), status: 'completed', approver: 'user',
  }, { salt: env.AUDIT_HASH_SALT });
  await afterChange(db, userId, { title: 'Đã hoàn tác', detail: summary });
  return { id, undone: true };
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
