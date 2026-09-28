// Chạy một lượt agent: che lệnh → ý định (Workers AI hoặc luật) → planner → ghi agent_runs / agent_steps /
// agent_actions (pending, hết hạn sau 24h) + một dòng audit. Không thực thi gì — chờ người dùng duyệt.

import type { Env } from '../env';
import type { AgentActionView, AgentRunSource, AgentRunView, AgentStepView, PlannedEventView } from '../../shared/types/api';
import { sanitizePrompt } from '../../shared/agent/sanitize';
import { fold, mergeIntents, parseIntentRules, type IntentResult } from '../../shared/agent/intent';
import { planRun, type PlannerContext } from '../../shared/agent/planner';
import { previewAction } from '../../shared/agent/actions';
import { TOOL_KEYS } from '../../shared/agent/tools';
import { addDays, weekStartOf } from '../../shared/engine/scheduler';
import { classifyIntentLLM } from './llm';
import { loadBills, loadEventsBetween } from '../routes/calendar';
import { syncInfo } from '../integrations/google/sync';
import { writeAudit, maskSummary } from '../lib/audit';
import { notFound } from '../lib/http';

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

export async function runAgent(env: Env, userId: string, input: RunInput): Promise<string> {
  const db = env.DB;
  const masked = sanitizePrompt(input.prompt);
  const note = input.note ? sanitizePrompt(input.note) : undefined;
  const runId = crypto.randomUUID();
  const source = input.source ?? 'user';
  const started = new Date();
  const at = (i: number) => new Date(started.getTime() + i).toISOString();

  // Lượt mới thay thế đề xuất cũ của agent còn chờ duyệt
  await db.batch([
    db.prepare(`UPDATE agent_actions SET status = 'expired', updated_at = ? WHERE user_id = ? AND status = 'pending' AND run_id IS NOT NULL`).bind(at(0), userId),
    db.prepare(`UPDATE agent_runs SET status = 'cancelled', updated_at = ? WHERE user_id = ? AND status IN ('running', 'awaiting_approval')`).bind(at(0), userId),
    db.prepare('INSERT INTO agent_runs (id, user_id, source, prompt_masked, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(runId, userId, source, note ? `${masked} · Điều chỉnh: ${note}` : masked, 'running', at(0), at(0)),
    db.prepare("INSERT INTO agent_steps (id, run_id, user_id, idx, agent, kind, title, detail_masked, status, started_at, finished_at) VALUES (?, ?, ?, 0, 'planner', 'plan', 'Đã nhận yêu cầu của bạn', ?, 'done', ?, ?)")
      .bind(crypto.randomUUID(), runId, userId, note ? `"${masked}" · Điều chỉnh: ${note}` : `"${masked}"`, at(0), at(0)),
  ]);

  try {
    const rules = parseIntentRules(note ? `${masked} ${note}` : masked);
    const intent: IntentResult = mergeIntents(await classifyIntentLLM(env, masked, userId), rules);
    const weekStart = targetWeek(masked, input.weekStart);
    const plan = planRun(await loadContext(env, userId, weekStart, note), intent.intents);
    const created = new Date();
    const expires = new Date(created.getTime() + ACTION_TTL_MS).toISOString();
    const actionSource = source === 'user' ? 'agent' : source;

    await db.batch([
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
      db.prepare('UPDATE agent_runs SET intent = ?, agents_json = ?, status = ?, updated_at = ?, completed_at = ? WHERE id = ?').bind(
        JSON.stringify({ intents: plan.intents, source: intent.source, weekStart }),
        JSON.stringify(plan.agents),
        plan.actions.length ? 'awaiting_approval' : 'completed',
        created.toISOString(),
        plan.actions.length ? null : created.toISOString(),
        runId,
      ),
    ]);
    await writeAudit(db, {
      userId, actor: source === 'mcp' ? 'mcp' : 'agent', agent: 'planner', action: 'agent.plan', entityType: 'agent_run', entityId: runId, runId,
      summaryMasked: maskSummary(`Lập kế hoạch từ lệnh: "${masked}" — ${plan.actions.length} hành động chờ duyệt`),
      dataLabel: 'Lịch, thu chi, mục tiêu (đã ẩn số liệu)', status: 'completed',
    }, { salt: env.AUDIT_HASH_SALT });
  } catch (err) {
    await db.batch([
      db.prepare("UPDATE agent_runs SET status = 'failed', error = ?, updated_at = ? WHERE id = ?").bind('Không lập được kế hoạch', new Date().toISOString(), runId),
      db.prepare("INSERT INTO agent_steps (id, run_id, user_id, idx, agent, kind, title, status) VALUES (?, ?, ?, 99, 'planner', 'error', 'Không lập được kế hoạch', 'failed')").bind(crypto.randomUUID(), runId, userId),
    ]);
    console.error('runAgent', err);
  }
  return runId;
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
  const intent = run.intent ? (JSON.parse(run.intent) as { intents: string[]; source: 'rules' | 'llm'; weekStart: string }) : null;
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
  };
}

export async function latestRunId(db: D1Database, userId: string): Promise<string | null> {
  const r = await db.prepare('SELECT id FROM agent_runs WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1').bind(userId).first<{ id: string }>();
  return r?.id ?? null;
}
