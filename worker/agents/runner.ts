// Chạy một lượt agent: che lệnh → ý định (Workers AI hoặc luật) → planner → ghi agent_runs / agent_steps /
// agent_actions (pending, hết hạn sau 24h) + một dòng audit. Không thực thi gì — chờ người dùng duyệt.

import type { Env } from '../env';
import type { AgentActionView, AgentRunSource, AgentRunView, AgentStepView, PlannedEventView } from '../../shared/types/api';
import { maskWithPlaceholders, sanitizePrompt } from '../../shared/agent/sanitize';
import {
  fold, mergeIntents, mergeParams, paramsFromLLM, parseIntentRules, parseParamsRules, type Intent, type IntentParams, type IntentResult,
} from '../../shared/agent/intent';
import {
  planAlert, planDesk, planLifeDecision, planRun, type ActionDraft, type PlannerContext, type PlanResult, type StepDraft,
} from '../../shared/agent/planner';
import { previewAction } from '../../shared/agent/actions';
import { TOOL_KEYS } from '../../shared/agent/tools';
import { addDays, weekStartOf } from '../../shared/engine/scheduler';
import { PLANS } from '../../shared/plans';
import { classifyLLM, narrateReply } from './llm';
import { loadUserState } from '../lib/state';
import { loadSignals } from '../routes/signals';
import { userPlan } from '../lib/usage';
import { loadBills, loadEventsBetween } from '../routes/calendar';
import { syncInfo } from '../integrations/google/sync';
import { batchWithAudit, maskSummary } from '../lib/audit';
import { notFound } from '../lib/http';
import { coordinateRoles } from './roles';

export const ACTION_TTL_MS = 24 * 3_600_000;
const vnNow = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 16);

export interface RunInput { prompt: string; source?: AgentRunSource; weekStart?: string; note?: string }

async function loadContext(env: Env, userId: string, weekStart: string, note?: string): Promise<PlannerContext> {
  const db = env.DB;
  const now = vnNow();
  const since = addDays(now.slice(0, 10), -30);
  const [events, bills, goals, income, tx, budget, google] = await Promise.all([
    loadEventsBetween(db, userId, addDays(weekStart, -7), addDays(weekStart, 7)),
    loadBills(db, userId, now.slice(0, 10)),
    db.prepare('SELECT id, title, kind, current_amount, target_amount, monthly_contribution FROM goals WHERE user_id = ? ORDER BY priority, order_idx')
      .bind(userId).all<{ id: string; title: string; kind: string; current_amount: number; target_amount: number; monthly_contribution: number }>(),
    db.prepare('SELECT focus_skill, hours_per_week FROM income_profiles WHERE user_id = ?').bind(userId).first<{ focus_skill: string; hours_per_week: number }>(),
    db.prepare('SELECT kind, amount, category, note, value_tag FROM transactions WHERE user_id = ? AND occurred_on >= ?')
      .bind(userId, since).all<{ kind: 'income' | 'expense'; amount: number; category: string; note: string; value_tag: string | null }>(),
    db.prepare("SELECT limit_amount FROM budgets WHERE user_id = ? AND category = 'all' AND month <= ? ORDER BY month DESC LIMIT 1")
      .bind(userId, weekStart.slice(0, 7)).first<{ limit_amount: number }>(),
    syncInfo(env, userId),
  ]);
  const recentTx = tx.results.map((t) => ({ kind: t.kind, amount: t.amount, category: t.category, note: t.note, valueTag: (t.value_tag ?? undefined) as never }));
  return {
    now,
    weekStart,
    events: events.map((e) => ({ title: e.title, category: e.category, startsAt: e.startsAt, endsAt: e.endsAt })),
    bills,
    goals: goals.results.map((g) => ({ id: g.id, title: g.title, kind: g.kind, currentAmount: g.current_amount, targetAmount: g.target_amount, monthlyContribution: g.monthly_contribution })),
    focusSkill: income?.focus_skill ?? '',
    skillHoursPerWeek: income?.hours_per_week ?? 0,
    recentTx,
    budgetLimit: budget?.limit_amount ?? null,
    lastMonthExpense: recentTx.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0),
    googleCalendarConnected: google.status === 'connected',
    note,
  };
}

/** "tuần này" → tuần hiện tại, còn lại → tuần tới. */
const targetWeek = (maskedPrompt: string, explicit?: string) => {
  if (explicit) return weekStartOf(explicit);
  const thisWeek = weekStartOf(vnNow().slice(0, 10));
  return /tuan nay|this week/.test(fold(maskedPrompt)) ? thisWeek : addDays(thisWeek, 7);
};

/** Bàn đầu tư (làm sau): nhận mã, trả câu phân tích + các bước. Chưa có → planner dùng ghi chú tất định. */
export type DeskHook = (symbol: string) => Promise<{ reply?: string; steps?: StepDraft[]; actions?: ActionDraft[] } | null>;
export interface RunHooks { deskHook?: DeskHook }

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const SPECIAL = new Set<Intent>(['life_decision', 'set_alert', 'ask_desk']);

/** Ghép kế hoạch tuần (ý định cũ) với quyết định lớn / cảnh báo giá / hỏi về mã. */
async function buildPlan(
  env: Env, userId: string, ctx: PlannerContext, intent: IntentResult, params: IntentParams, maskedPrompt: string, hooks: RunHooks,
): Promise<PlanResult & { reply: string }> {
  const want = (i: Intent) => intent.intents.includes(i);
  const week = intent.intents.filter((i) => !SPECIAL.has(i));
  const steps: StepDraft[] = [];
  const actions: ActionDraft[] = [];
  const replies: string[] = [];
  let weekPlan: PlanResult | null = null;
  if (week.length || !intent.intents.some((i) => SPECIAL.has(i))) {
    weekPlan = planRun(ctx, week.length ? week : ['plan_week']);
    steps.push(...weekPlan.steps);
    actions.push(...weekPlan.actions);
    replies.push(weekPlan.actions.length
      ? `An Tâm đã lập kế hoạch tuần ${ddmm(ctx.weekStart)} với ${weekPlan.actions.length} việc chờ bạn duyệt.`
      : 'Tuần này chưa có việc cần đề xuất thêm.');
  }
  const needState = (want('life_decision') && params.life) || want('ask_desk');
  const state = needState ? await loadUserState(env.DB, userId) : null;
  if (!weekPlan && state) {
    steps.push({ agent: 'planner', kind: 'plan', title: 'Phân tích dữ liệu cá nhân', detail: 'Đọc thu chi, tài sản, mục tiêu (đã ẩn số liệu)' });
  }
  if (want('life_decision') && params.life && state) {
    const signals = await loadSignals(env.DB, userId, state);
    const p = planLifeDecision(state, params.life, { budgetLimit: ctx.budgetLimit, lastMonthExpense: ctx.lastMonthExpense, maskedPrompt, signals });
    steps.push(...p.steps);
    actions.push(...p.actions);
    replies.push(p.reply);
  }
  if (want('set_alert') && params.alert) {
    const { plan } = await userPlan(env.DB, userId);
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM alert_rules WHERE user_id = ?').bind(userId).first<{ n: number }>()
      .then((r) => r?.n ?? 0).catch(() => null); // bảng chưa có → để bước duyệt báo rõ
    const p = planAlert(params.alert, { count, max: PLANS[plan].alertRules });
    steps.push(...p.steps);
    actions.push(...p.actions);
    replies.push(p.reply);
  }
  if (want('ask_desk') && state) {
    const symbol = params.desk?.symbol ?? null;
    const p = planDesk(state, symbol);
    const desk = symbol && hooks.deskHook ? await hooks.deskHook(symbol).catch(() => null) : null;
    // Bàn đã chạy → bỏ dòng hẹn "bàn sẽ phân tích" của planner, thay bằng các bước thật của bàn
    steps.push(...(desk?.steps?.length ? p.steps.filter((s) => s.title !== 'Bàn đầu tư sẽ phân tích mã này') : p.steps), ...(desk?.steps ?? []));
    actions.push(...(desk?.actions ?? []));
    replies.push(desk?.reply ?? p.reply);
  }
  const intents = weekPlan ? [...weekPlan.intents, ...intent.intents.filter((i) => SPECIAL.has(i))] : intent.intents;
  return { ...coordinateRoles({ agents: [], intents, steps, actions }), reply: replies.join(' ') };
}

/** D1 là nguồn chính; chỉ tạo lượt chạy sau khi payload hàng đợi đã được mã hóa. */
export async function createRun(db: D1Database, userId: string, input: RunInput, runId = crypto.randomUUID()): Promise<string> {
  const masked = sanitizePrompt(input.prompt);
  const note = input.note ? sanitizePrompt(input.note) : undefined;
  const now = new Date().toISOString();
  await db.batch([
    db.prepare('INSERT INTO agent_runs (id, user_id, source, prompt_masked, agents_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(runId, userId, input.source ?? 'user', note ? `${masked} · Điều chỉnh: ${note}` : masked, '["planner"]', 'running', now, now),
    db.prepare("INSERT INTO agent_steps (id, run_id, user_id, idx, agent, kind, title, detail_masked, status, started_at, finished_at) VALUES (?, ?, ?, 0, 'planner', 'plan', 'Đã nhận yêu cầu của bạn', ?, 'done', ?, ?)")
      .bind(crypto.randomUUID(), runId, userId, note ? `"${masked}" · Điều chỉnh: ${note}` : `"${masked}"`, now, now),
  ]);
  return runId;
}

/** Chỉ được gọi từ hàng đợi tuần tự của UserCoordinatorAgent. Replay đọc trạng thái D1 rồi bỏ qua. */
export async function executeRun(env: Env, userId: string, runId: string, input: RunInput, hooks: RunHooks = {}): Promise<void> {
  const db = env.DB;
  const masked = sanitizePrompt(input.prompt);
  const note = input.note ? sanitizePrompt(input.note) : undefined;
  const source = input.source ?? 'user';
  const started = new Date();
  const at = (i: number) => new Date(started.getTime() + i).toISOString();

  const run = await db.prepare('SELECT status FROM agent_runs WHERE id = ? AND user_id = ?').bind(runId, userId).first<{ status: string }>();
  if (!run || run.status !== 'running') return;
  // Khi thực sự bắt đầu xử lý, lượt mới thay thế đề xuất cũ còn chờ duyệt.
  await db.batch([
    db.prepare(`UPDATE agent_actions SET status = 'expired', updated_at = ? WHERE user_id = ? AND status = 'pending' AND run_id IS NOT NULL`).bind(at(0), userId),
    db.prepare(`UPDATE agent_runs SET status = 'cancelled', updated_at = ? WHERE user_id = ? AND id <> ? AND status = 'awaiting_approval'`).bind(at(0), userId, runId),
  ]);

  // AI và luật đọc câu có ký hiệu (AMT_1, DUR_1…) — số thật chỉ nằm trong `ph.map`, không lưu
  const ph = maskWithPlaceholders(input.prompt);
  const rules = parseIntentRules(note ? `${ph.masked} ${note}` : ph.masked);
  const llm = await classifyLLM(env, ph.masked, userId);
  const intent: IntentResult = mergeIntents(llm?.intents ?? null, rules);
  const params = mergeParams(llm ? paramsFromLLM(llm, ph.map) : null, parseParamsRules(ph.masked, ph.map, intent.intents));
  const weekStart = targetWeek(masked, input.weekStart);
  const ctx = await loadContext(env, userId, weekStart, note);
  const plan = await buildPlan(env, userId, ctx, intent, params, ph.masked, hooks);
  const reply = await narrateReply(env, userId, plan.reply);
  const created = new Date();
  const expires = new Date(created.getTime() + ACTION_TTL_MS).toISOString();
  const actionSource = source === 'user' ? 'agent' : source;

  await batchWithAudit(db, [
    ...plan.steps.map((s, i) =>
      db.prepare("INSERT INTO agent_steps (id, run_id, user_id, idx, agent, kind, title, detail_masked, status, started_at, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'done', ?, ?)")
        .bind(crypto.randomUUID(), runId, userId, i + 1, s.agent, s.kind, s.title, s.detail ?? null, at(i + 1), at(i + 1)),
    ),
    ...plan.actions.map((a, i) =>
      db.prepare(
        `INSERT INTO agent_actions (id, user_id, run_id, source, agent, type, title, payload_json, preview_json, integration, risk, status, requires_approval, created_at, updated_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(), userId, runId, actionSource, a.agent, a.type, a.title, JSON.stringify(a.payload), JSON.stringify(previewAction(a.type, a.payload)),
        a.integration, a.risk, new Date(created.getTime() + i).toISOString(), created.toISOString(), expires,
      ),
    ),
    db.prepare("UPDATE agent_runs SET intent = ?, agents_json = ?, status = ?, updated_at = ?, completed_at = ? WHERE id = ? AND user_id = ? AND status = 'running'").bind(
      JSON.stringify({ intents: plan.intents, source: intent.source, weekStart, reply: reply.text, narrated: reply.narrated }),
      JSON.stringify(plan.agents),
      plan.actions.length ? 'awaiting_approval' : 'completed',
      created.toISOString(),
      plan.actions.length ? null : created.toISOString(),
      runId, userId,
    ),
  ], {
    userId, actor: source === 'mcp' ? 'mcp' : 'agent', agent: 'planner', action: 'agent.plan', entityType: 'agent_run', entityId: runId, runId,
    summaryMasked: maskSummary(`Lập kế hoạch từ lệnh: "${masked}" — ${plan.actions.length} hành động chờ duyệt`),
    dataLabel: 'Lịch, thu chi, mục tiêu (đã ẩn số liệu)', status: 'completed',
  }, { salt: env.AUDIT_HASH_SALT });
}

/** Lỗi cuối cùng được ghi rõ vào D1; replay sau đó không thể tạo lại hành động. */
export async function failRun(env: Env, userId: string, runId: string): Promise<void> {
  const db = env.DB;
  const row = await db.prepare('SELECT status FROM agent_runs WHERE id = ? AND user_id = ?').bind(runId, userId).first<{ status: string }>();
  if (row?.status !== 'running') return;
  const now = new Date().toISOString();
  await batchWithAudit(db, [
    db.prepare("UPDATE agent_runs SET status = 'failed', error = ?, updated_at = ?, completed_at = ? WHERE id = ? AND user_id = ? AND status = 'running'")
      .bind('Không lập được kế hoạch', now, now, runId, userId),
    db.prepare("INSERT OR IGNORE INTO agent_steps (id, run_id, user_id, idx, agent, kind, title, status, started_at, finished_at) VALUES (?, ?, ?, 99, 'planner', 'error', 'Không lập được kế hoạch', 'failed', ?, ?)")
      .bind(crypto.randomUUID(), runId, userId, now, now),
  ], {
    userId, actor: 'agent', agent: 'planner', action: 'agent.plan', entityType: 'agent_run', entityId: runId, runId,
    summaryMasked: 'Không lập được kế hoạch', status: 'failed',
  }, { salt: env.AUDIT_HASH_SALT });
}

/* ───────── Đọc ───────── */

interface ActionRow {
  id: string; run_id: string | null; agent: string | null; type: string; title: string; payload_json: string; preview_json: string | null;
  integration: AgentActionView['integration']; risk: AgentActionView['risk']; status: AgentActionView['status']; result_json: string | null;
  error: string | null; note: string | null; created_at: string; expires_at: string; decided_at: string | null; executed_at: string | null;
}
export const ACTION_COLS = 'id, run_id, agent, type, title, payload_json, preview_json, integration, risk, status, result_json, error, note, created_at, expires_at, decided_at, executed_at';

export const toActionView = (r: ActionRow): AgentActionView => ({
  id: r.id, runId: r.run_id, agent: r.agent, type: r.type, title: r.title, integration: r.integration, risk: r.risk,
  // Quá hạn mà chưa ai xử lý → hiển thị hết hạn
  status: r.status === 'pending' && r.expires_at <= new Date().toISOString() ? 'expired' : r.status,
  preview: r.preview_json ? JSON.parse(r.preview_json) : null,
  result: r.result_json ? JSON.parse(r.result_json) : null,
  error: r.error, note: r.note, createdAt: r.created_at, expiresAt: r.expires_at, decidedAt: r.decided_at, executedAt: r.executed_at,
});

export async function listActions(db: D1Database, userId: string, status?: string): Promise<AgentActionView[]> {
  const { results } = status
    ? await db.prepare(`SELECT ${ACTION_COLS} FROM agent_actions WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 100`).bind(userId, status).all<ActionRow>()
    : await db.prepare(`SELECT ${ACTION_COLS} FROM agent_actions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`).bind(userId).all<ActionRow>();
  const views = results.map(toActionView);
  return status === 'pending' ? views.filter((a) => a.status === 'pending') : views;
}

interface RunRow { id: string; source: AgentRunSource; prompt_masked: string; intent: string | null; agents_json: string; status: AgentRunView['status']; created_at: string }

export async function loadRunView(db: D1Database, userId: string, runId: string): Promise<AgentRunView> {
  const run = await db.prepare('SELECT id, source, prompt_masked, intent, agents_json, status, created_at FROM agent_runs WHERE id = ? AND user_id = ?').bind(runId, userId).first<RunRow>();
  if (!run) throw notFound('Không tìm thấy lượt chạy');
  const [steps, actions] = await Promise.all([
    db.prepare('SELECT id, idx, agent, kind, title, detail_masked, status, started_at FROM agent_steps WHERE run_id = ? AND user_id = ? ORDER BY idx')
      .bind(runId, userId).all<{ id: string; idx: number; agent: string; kind: AgentStepView['kind']; title: string; detail_masked: string | null; status: AgentStepView['status']; started_at: string }>(),
    db.prepare(`SELECT ${ACTION_COLS} FROM agent_actions WHERE run_id = ? AND user_id = ? ORDER BY created_at`).bind(runId, userId).all<ActionRow>(),
  ]);
  const intent = run.intent ? (JSON.parse(run.intent) as { intents: string[]; source: 'rules' | 'llm'; weekStart: string; reply?: string }) : null;
  const cal = actions.results.find((a) => a.type === 'calendar.create_events');
  const plannedEvents: PlannedEventView[] = cal ? (JSON.parse(cal.payload_json) as { events: PlannedEventView[] }).events : [];
  const used = new Set<string>(['google_calendar']);
  for (const a of actions.results) if (a.integration !== 'local') used.add(a.integration);
  return {
    id: run.id, source: run.source, promptMasked: run.prompt_masked,
    intents: intent?.intents ?? [], intentSource: intent?.source ?? 'rules',
    agents: JSON.parse(run.agents_json) as string[], status: run.status,
    weekStart: intent?.weekStart ?? addDays(weekStartOf(vnNow().slice(0, 10)), 7),
    createdAt: run.created_at,
    steps: steps.results.map((s) => ({ id: s.id, idx: s.idx, agent: s.agent, kind: s.kind, title: s.title, detail: s.detail_masked, status: s.status, startedAt: s.started_at })),
    actions: actions.results.map(toActionView),
    plannedEvents,
    tools: TOOL_KEYS.filter((k) => used.has(k)),
    ...(intent?.reply ? { reply: intent.reply } : {}),
  };
}

export async function latestRunId(db: D1Database, userId: string): Promise<string | null> {
  const r = await db.prepare('SELECT id FROM agent_runs WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1').bind(userId).first<{ id: string }>();
  return r?.id ?? null;
}
