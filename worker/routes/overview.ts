import { Hono } from 'hono';
import type { AppEnv } from '../env';
import type { IncomeProfile, TimeAllocation, Transaction } from '../../shared/types/domain';
import { buildOverview } from '../../shared/engine/overview';
import { addMonths, recentIsoWeeks, vnDate } from '../../shared/engine/month';
import type { SuggestionGroup } from '../../shared/engine/suggestions';
import { ApiError, notFound, ok } from '../lib/http';
import { loadMe, loadUserState, syncAlerts } from '../lib/state';
import { loadEventsForDay } from './calendar';
import { loadPinnedLifeChoice } from './lifeChoices';

const RANGES = new Set([6, 12]);
const GROUPS = new Set<SuggestionGroup>(['safety', 'saving', 'growth']);
/** Số tuần gần nhất dùng để tính vòng "Kỹ năng". */
const SKILL_WEEKS = 4;

export const overview = new Hono<AppEnv>()
  .get('/', async (c) => {
    const db = c.env.DB;
    const userId = c.get('userId');
    const range = Number(c.req.query('range') ?? 12);
    const today = vnDate();
    const [me, state] = await Promise.all([loadMe(db, userId), loadUserState(db, userId)]);
    if (!me) throw notFound();
    const weeks = recentIsoWeeks(today, SKILL_WEEKS);

    const [openAlerts, events, lifeChoice, extra] = await Promise.all([
      syncAlerts(db, userId, state),
      loadEventsForDay(db, userId, today),
      loadPinnedLifeChoice(db, userId),
      db.batch([
        db.prepare(
          'SELECT id, kind, amount, category, note, occurred_on, value_tag FROM transactions WHERE user_id = ? AND occurred_on >= ? ORDER BY occurred_on DESC',
        ).bind(userId, `${addMonths(state.today, -1)}-01`),
        db.prepare('SELECT current_income, target_income, target_months, occupation, hours_per_week, focus_skill FROM income_profiles WHERE user_id = ?').bind(userId),
        db.prepare('SELECT category, hours FROM time_allocations WHERE user_id = ?').bind(userId),
        db.prepare(`SELECT week, SUM(actual) AS actual FROM value_hours_log WHERE user_id = ? AND week IN (${weeks.map(() => '?').join(',')}) GROUP BY week`).bind(userId, ...weeks),
        db.prepare('SELECT key FROM suggestion_dismissals WHERE user_id = ? AND day = ?').bind(userId, today),
      ]),
    ]);
    const [tx, inc, time, hours, dismissed] = extra.map((r) => r.results as Record<string, any>[]);
    const recent: Transaction[] = tx.map((r) => ({
      id: r.id, kind: r.kind, amount: r.amount, category: r.category, note: r.note, occurredOn: r.occurred_on, valueTag: r.value_tag ?? undefined,
    }));
    const i = inc[0];
    const income: IncomeProfile | null = i
      ? { currentIncome: i.current_income, targetIncome: i.target_income, targetMonths: i.target_months, occupation: i.occupation, hoursPerWeek: i.hours_per_week, focusSkill: i.focus_skill }
      : null;

    return ok(
      c,
      buildOverview(state, me, {
        range: RANGES.has(range) ? range : 12,
        openAlerts,
        extras: {
          baseline: state.baseline,
          birthYear: state.baseline.birthYear ?? null,
          recent,
          income,
          dismissed: dismissed.map((d) => d.key as SuggestionGroup).filter((g) => GROUPS.has(g)),
          allocations: time as TimeAllocation[],
          weeklyActualHours: hours.map((h) => Number(h.actual) || 0),
          todayDate: today,
          events,
          lifeChoice,
        },
      }),
    );
  })
  /** "Ẩn hôm nay" một nhóm đề xuất (safety | saving | growth). */
  .post('/suggestions/:group/dismiss', async (c) => {
    const group = c.req.param('group') as SuggestionGroup;
    if (!GROUPS.has(group)) throw new ApiError(400, 'invalid_input', 'Nhóm đề xuất không hợp lệ');
    await c.env.DB.prepare('INSERT OR IGNORE INTO suggestion_dismissals (user_id, key, day) VALUES (?, ?, ?)').bind(c.get('userId'), group, vnDate()).run();
    return ok(c, null);
  })
  /** Hiện lại các đề xuất đã ẩn hôm nay. */
  .delete('/suggestions/dismissals', async (c) => {
    await c.env.DB.prepare('DELETE FROM suggestion_dismissals WHERE user_id = ? AND day = ?').bind(c.get('userId'), vnDate()).run();
    return ok(c, null);
  });
