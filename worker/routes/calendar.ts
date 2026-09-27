// Lịch AI. Mount: /api/calendar
// Tuần: GET /?week=YYYY-MM-DD · sự kiện CRUD · đồng bộ Google · AI tự xếp lịch → đề xuất (agent_actions) → duyệt / từ chối.

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, Env } from '../env';
import type { AutoScheduleResult, CalendarEvent, CalendarEventInput, CalendarMonth, CalendarProposal, CalendarWeek } from '../../shared/types/api';
import { vnDate } from '../../shared/engine/month';
import { RULE_KEYS, addDays, autoSchedule, weekStartOf, type BillDue, type Proposal, type RuleKey } from '../../shared/engine/scheduler';
import { ApiError, notFound, ok } from '../lib/http';
import { body, dateString, monthString } from '../lib/validate';
import { idempotent } from '../lib/idempotency';
import { batchWithAudit, maskSummary } from '../lib/audit';
import { syncGoogleWeek, syncInfo, pushApproved } from '../integrations/google/sync';
import { getAccessToken } from '../integrations/tokens';

/** Giờ Việt Nam 'YYYY-MM-DDTHH:MM'. */
const localDateTime = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d$/, 'Thời gian không hợp lệ (YYYY-MM-DDTHH:MM)');
const category = z.enum(['finance', 'skill', 'work', 'rest', 'personal']);

const eventSchema = z
  .object({
    title: z.string().trim().min(1, 'Vui lòng nhập tên việc').max(80),
    note: z.string().trim().max(120).default(''),
    category: category.default('personal'),
    startsAt: localDateTime,
    endsAt: localDateTime,
  })
  .refine((e) => e.endsAt > e.startsAt, { message: 'Giờ kết thúc phải sau giờ bắt đầu', path: ['endsAt'] });

const patchSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  note: z.string().trim().max(120).optional(),
  category: category.optional(),
  startsAt: localDateTime.optional(),
  endsAt: localDateTime.optional(),
  done: z.boolean().optional(),
});

const proposalEditSchema = z.object({
  events: z
    .array(z.object({ startsAt: localDateTime, endsAt: localDateTime }).refine((e) => e.endsAt > e.startsAt, { message: 'Giờ kết thúc phải sau giờ bắt đầu' }))
    .min(1)
    .max(10),
});

interface Row {
  id: string; title: string; note: string; category: CalendarEvent['category'];
  starts_at: string; ends_at: string; source: CalendarEvent['source']; done: number;
}

const toEvent = (r: Row): CalendarEvent => ({
  id: r.id, title: r.title, note: r.note, category: r.category, startsAt: r.starts_at, endsAt: r.ends_at, source: r.source, done: r.done === 1,
});

const SELECT = 'SELECT id, title, note, category, starts_at, ends_at, source, done FROM calendar_events';

/** Sự kiện trong ngày `day` ('YYYY-MM-DD', giờ Việt Nam), theo giờ bắt đầu. */
export async function loadEventsForDay(db: D1Database, userId: string, day: string): Promise<CalendarEvent[]> {
  return loadEventsBetween(db, userId, day, addDays(day, 1));
}

/** Sự kiện có giờ bắt đầu trong [fromDay, toDay). */
export async function loadEventsBetween(db: D1Database, userId: string, fromDay: string, toDay: string): Promise<CalendarEvent[]> {
  const { results } = await db.prepare(`${SELECT} WHERE user_id = ? AND starts_at >= ? AND starts_at < ? ORDER BY starts_at`)
    .bind(userId, `${fromDay}T00:00`, `${toDay}T00:00`)
    .all<Row>();
  return results.map(toEvent);
}

/* ───────── Đề xuất (agent_actions type 'calendar.create_events') ───────── */

const ACTION_TYPE = 'calendar.create_events';
const PROPOSAL_TTL_MS = 7 * 86_400_000;

interface ActionRow {
  id: string; title: string; payload_json: string; integration: CalendarProposal['integration']; status: string; created_at: string;
}
interface ProposalPayload { key: string; rule: string; reason: string; priority: CalendarProposal['priority']; events: CalendarEventInput[] }

const toProposal = (r: ActionRow): CalendarProposal => {
  const p = JSON.parse(r.payload_json) as ProposalPayload;
  return {
    id: r.id, title: r.title, reason: p.reason, priority: p.priority, rule: p.rule,
    status: (r.status === 'pending' || r.status === 'done' || r.status === 'rejected' || r.status === 'failed' ? r.status : 'expired') as CalendarProposal['status'],
    integration: r.integration, events: p.events, createdAt: r.created_at,
  };
};

async function pendingProposals(db: D1Database, userId: string): Promise<CalendarProposal[]> {
  const { results } = await db.prepare(
    `SELECT id, title, payload_json, integration, status, created_at FROM agent_actions
     WHERE user_id = ? AND type = ? AND status = 'pending' AND expires_at > ? ORDER BY created_at DESC, rowid DESC`,
  ).bind(userId, ACTION_TYPE, new Date().toISOString()).all<ActionRow>();
  // Cao → theo mục tiêu → thường
  const rank = { high: 0, goal: 1, normal: 2 } as const;
  return results.map(toProposal).sort((a, b) => rank[a.priority] - rank[b.priority]);
}

async function loadAction(db: D1Database, userId: string, id: string): Promise<ActionRow> {
  const row = await db.prepare('SELECT id, title, payload_json, integration, status, created_at FROM agent_actions WHERE id = ? AND user_id = ? AND type = ?')
    .bind(id, userId, ACTION_TYPE)
    .first<ActionRow>();
  if (!row) throw notFound('Không tìm thấy đề xuất');
  if (row.status !== 'pending') throw new ApiError(409, 'already_decided', 'Đề xuất này đã được xử lý');
  return row;
}

/** Hóa đơn định kỳ (bảng recurring_bills — có khi màn Sổ thu chi đã chạy migration 0010). */
async function loadBills(db: D1Database, userId: string, today: string): Promise<BillDue[]> {
  try {
    const { results } = await db.prepare('SELECT name, amount, day_of_month FROM recurring_bills WHERE user_id = ?').bind(userId).all<{ name: string; amount: number; day_of_month: number }>();
    return results.flatMap((b) => {
      // Hạn gần nhất từ hôm nay (tháng này hoặc tháng sau)
      const [y, m] = today.split('-').map(Number);
      const due = (yy: number, mm: number) => {
        const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
        return `${yy}-${String(mm).padStart(2, '0')}-${String(Math.min(b.day_of_month, last)).padStart(2, '0')}`;
      };
      const d1 = due(y, m);
      return [{ name: b.name, amount: b.amount, dueDate: d1 >= today ? d1 : due(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1) }];
    });
  } catch {
    return [];
  }
}

async function loadRules(db: D1Database, userId: string): Promise<Record<RuleKey, boolean>> {
  const { results } = await db.prepare('SELECT key, enabled FROM automation_rules WHERE user_id = ?').bind(userId).all<{ key: RuleKey; enabled: number }>();
  const out = Object.fromEntries(RULE_KEYS.map((k) => [k, false])) as Record<RuleKey, boolean>;
  for (const r of results) out[r.key] = r.enabled === 1;
  return out;
}

/** Chạy engine xếp lịch cho cửa sổ 7 ngày bắt đầu từ max(đầu tuần, bây giờ) và lưu thành đề xuất chờ duyệt. */
async function runAutoSchedule(env: Env, userId: string, weekStart: string): Promise<AutoScheduleResult> {
  const db = env.DB;
  const nowVn = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 16);
  const today = nowVn.slice(0, 10);
  const now = weekStart > today ? `${weekStart}T07:00` : nowVn;
  const from = now.slice(0, 10);

  const [events, bills, rules, goals, income, keys, google] = await Promise.all([
    loadEventsBetween(db, userId, addDays(from, -7), addDays(from, 10)),
    loadBills(db, userId, from),
    loadRules(db, userId),
    db.prepare('SELECT title, kind, current_amount, target_amount FROM goals WHERE user_id = ? ORDER BY priority, order_idx').bind(userId).all<{ title: string; kind: string; current_amount: number; target_amount: number }>(),
    db.prepare('SELECT focus_skill, hours_per_week FROM income_profiles WHERE user_id = ?').bind(userId).first<{ focus_skill: string; hours_per_week: number }>(),
    db.prepare(
      `SELECT json_extract(payload_json, '$.key') AS k FROM agent_actions
       WHERE user_id = ? AND type = ? AND status = 'pending' AND expires_at > ?`,
    ).bind(userId, ACTION_TYPE, new Date().toISOString()).all<{ k: string }>(),
    syncInfo(env, userId),
  ]);

  const proposals: Proposal[] = autoSchedule({
    now,
    events: events.map((e) => ({ title: e.title, category: e.category, startsAt: e.startsAt, endsAt: e.endsAt })),
    bills,
    goals: goals.results.map((g) => ({ title: g.title, kind: g.kind, currentAmount: g.current_amount, targetAmount: g.target_amount })),
    focusSkill: income?.focus_skill ?? '',
    skillHoursPerWeek: income?.hours_per_week ?? 0,
    rules,
    pendingKeys: keys.results.map((r) => r.k),
  });
  if (!proposals.length) return { created: 0, proposals: [] };

  const integration = google.status === 'connected' ? 'google_calendar' : 'local';
  const createdAt = new Date();
  const expires = new Date(createdAt.getTime() + PROPOSAL_TTL_MS).toISOString();
  const rows = proposals.map((p, i) => ({ id: crypto.randomUUID(), p, at: new Date(createdAt.getTime() + i).toISOString() }));
  await db.batch([
    ...rows.map(({ id, p, at }) => {
      const payload: ProposalPayload = { key: p.key, rule: p.rule, reason: p.reason, priority: p.priority, events: p.events.map((e) => ({ ...e, note: 'Do An Tâm AI đề xuất' })) };
      return db.prepare(
        `INSERT INTO agent_actions (id, user_id, source, agent, type, title, payload_json, integration, risk, status, requires_approval, created_at, updated_at, expires_at)
         VALUES (?, ?, 'automation', 'calendar', ?, ?, ?, ?, 'low', 'pending', 1, ?, ?, ?)`,
      ).bind(id, userId, ACTION_TYPE, p.title, JSON.stringify(payload), integration, at, at, expires);
    }),
    ...[...new Set(proposals.map((p) => p.rule))]
      .filter((r): r is RuleKey => r !== 'goal')
      .map((r) => db.prepare('UPDATE automation_rules SET last_fired_at = ? WHERE user_id = ? AND key = ?').bind(createdAt.toISOString(), userId, r)),
  ]);
  return { created: rows.length, proposals: (await pendingProposals(db, userId)).filter((p) => rows.some((r) => r.id === p.id)) };
}

const weekOf = (q: string | undefined) => weekStartOf(q && dateString.safeParse(q).success ? q : vnDate());

export const calendar = new Hono<AppEnv>()
  .get('/', async (c) => {
    const userId = c.get('userId');
    const weekStart = weekOf(c.req.query('week'));
    const [events, proposals, sync] = await Promise.all([
      loadEventsBetween(c.env.DB, userId, weekStart, addDays(weekStart, 7)),
      pendingProposals(c.env.DB, userId),
      syncInfo(c.env, userId),
    ]);
    const data: CalendarWeek = { weekStart, weekEnd: addDays(weekStart, 6), today: vnDate(), events, proposals, sync };
    return ok(c, data);
  })
  .get('/month', async (c) => {
    const q = c.req.query('month');
    const month = q && monthString.safeParse(q).success ? q : vnDate().slice(0, 7);
    const { results } = await c.env.DB.prepare(
      `SELECT substr(starts_at, 1, 10) AS day, category, COUNT(*) AS n FROM calendar_events
       WHERE user_id = ? AND starts_at >= ? AND starts_at < ? GROUP BY day, category`,
    ).bind(c.get('userId'), `${month}-01T00:00`, `${month}-32`).all<{ day: string; category: CalendarEvent['category']; n: number }>();
    const map = new Map<string, CalendarMonth['days'][number]>();
    for (const r of results) {
      const d = map.get(r.day) ?? { date: r.day, counts: {} };
      d.counts[r.category] = r.n;
      map.set(r.day, d);
    }
    const data: CalendarMonth = { month, today: vnDate(), days: [...map.values()].sort((a, b) => a.date.localeCompare(b.date)) };
    return ok(c, data);
  })
  .get('/events', async (c) => {
    const q = c.req.query('date');
    const day = q && dateString.safeParse(q).success ? q : vnDate();
    return ok(c, await loadEventsForDay(c.env.DB, c.get('userId'), day));
  })
  .post('/events', body(eventSchema), async (c) => {
    const e = c.req.valid('json');
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO calendar_events (id, user_id, title, note, category, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, c.get('userId'), e.title, e.note, e.category, e.startsAt, e.endsAt)
      .run();
    return ok(c, { id }, 201);
  })
  .patch('/events/:id', body(patchSchema), async (c) => {
    const e = c.req.valid('json');
    const cols: Record<string, unknown> = {
      title: e.title, note: e.note, category: e.category, starts_at: e.startsAt, ends_at: e.endsAt,
      done: e.done === undefined ? undefined : e.done ? 1 : 0,
    };
    const entries = Object.entries(cols).filter(([, v]) => v !== undefined);
    if (!entries.length) return ok(c, null);
    const res = await c.env.DB.prepare(`UPDATE calendar_events SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ? AND source != 'google'`)
      .bind(...entries.map(([, v]) => v), c.req.param('id'), c.get('userId'))
      .run()
      .catch(() => {
        throw new ApiError(400, 'invalid_input', 'Giờ kết thúc phải sau giờ bắt đầu');
      });
    if (!res.meta.changes) throw notFound('Không tìm thấy sự kiện (sự kiện từ Google chỉ sửa được trên Google)');
    return ok(c, null);
  })
  .delete('/events/:id', async (c) => {
    const res = await c.env.DB.prepare('DELETE FROM calendar_events WHERE id = ? AND user_id = ?').bind(c.req.param('id'), c.get('userId')).run();
    if (!res.meta.changes) throw notFound('Không tìm thấy sự kiện');
    return ok(c, null);
  })
  .post('/sync', async (c) => ok(c, await syncGoogleWeek(c.env, c.get('userId'), weekOf(c.req.query('week')))))
  .post('/auto-schedule', async (c) => ok(c, await runAutoSchedule(c.env, c.get('userId'), weekOf(c.req.query('week')))))
  .patch('/proposals/:id', body(proposalEditSchema), async (c) => {
    const userId = c.get('userId');
    const row = await loadAction(c.env.DB, userId, c.req.param('id'));
    const payload = JSON.parse(row.payload_json) as ProposalPayload;
    const edits = c.req.valid('json').events;
    if (edits.length !== payload.events.length) throw new ApiError(400, 'invalid_input', 'Số buổi không khớp đề xuất');
    payload.events = payload.events.map((e, i) => ({ ...e, startsAt: edits[i].startsAt, endsAt: edits[i].endsAt }));
    await c.env.DB.prepare("UPDATE agent_actions SET payload_json = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status = 'pending'")
      .bind(JSON.stringify(payload), new Date().toISOString(), row.id, userId)
      .run();
    return ok(c, null);
  })
  .post('/proposals/:id/approve', idempotent(), async (c) => {
    const userId = c.get('userId');
    const db = c.env.DB;
    const row = await loadAction(db, userId, c.req.param('id'));
    const payload = JSON.parse(row.payload_json) as ProposalPayload;
    const now = new Date().toISOString();
    const ids = payload.events.map(() => crypto.randomUUID());
    await batchWithAudit(
      db,
      [
        db.prepare("UPDATE agent_actions SET status = 'done', approver = 'user', decided_at = ?, executed_at = ?, updated_at = ?, result_json = ? WHERE id = ? AND user_id = ? AND status = 'pending'")
          .bind(now, now, now, JSON.stringify({ eventIds: ids }), row.id, userId),
        ...payload.events.map((e, i) =>
          db.prepare("INSERT INTO calendar_events (id, user_id, title, note, category, starts_at, ends_at, source, action_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'agent', ?)")
            .bind(ids[i], userId, e.title, e.note ?? '', e.category, e.startsAt, e.endsAt, row.id),
        ),
      ],
      {
        userId, actor: 'user', agent: 'calendar', action: ACTION_TYPE, entityType: 'agent_action', entityId: row.id, actionId: row.id,
        summaryMasked: maskSummary(`Duyệt đề xuất lịch: ${row.title} (${payload.events.length} sự kiện)`), dataLabel: 'Lịch cá nhân', status: 'approved', approver: 'user',
      },
      { salt: c.env.AUDIT_HASH_SALT },
    );
    // Đã kết nối Google → đẩy ngay lên lịch "An Tâm" (lỗi không làm hỏng việc duyệt; lần đồng bộ sau sẽ đẩy lại)
    let pushed = 0;
    if ((await syncInfo(c.env, userId)).status === 'connected') {
      const days = payload.events.map((e) => e.startsAt.slice(0, 10)).sort();
      pushed = await getAccessToken(c.env, userId)
        .then((token) => pushApproved(c.env, userId, token, days[0], addDays(days[days.length - 1], 1)))
        .catch(() => 0);
    }
    return ok(c, { eventIds: ids, pushed });
  })
  .post('/proposals/:id/reject', idempotent(), async (c) => {
    const userId = c.get('userId');
    const db = c.env.DB;
    const row = await loadAction(db, userId, c.req.param('id'));
    const now = new Date().toISOString();
    await batchWithAudit(
      db,
      [db.prepare("UPDATE agent_actions SET status = 'rejected', approver = 'user', decided_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status = 'pending'").bind(now, now, row.id, userId)],
      {
        userId, actor: 'user', agent: 'calendar', action: ACTION_TYPE, entityType: 'agent_action', entityId: row.id, actionId: row.id,
        summaryMasked: maskSummary(`Từ chối đề xuất lịch: ${row.title}`), dataLabel: 'Lịch cá nhân', status: 'rejected', approver: 'user',
      },
      { salt: c.env.AUDIT_HASH_SALT },
    );
    return ok(c, null);
  });
