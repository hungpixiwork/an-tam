import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { SimulationParams } from '../../shared/types/domain';
import type { DecisionSimulationInput } from '../../shared/types/api/decision';
import { simulationReport, type SimulationReport } from '../../shared/engine/analysis';
import { analyzeDecisionSimulation } from '../../shared/engine/decisionSimulation';
import { ApiError, notFound, ok } from '../lib/http';
import { loadUserState } from '../lib/state';
import { body } from '../lib/validate';

const paramsSchema = z.object({
  marketDropPct: z.number().min(-50).max(50),
  inflationPct: z.number().min(0).max(10),
  incomePauseMonths: z.number().int().min(0).max(12),
  interestRateDeltaPct: z.number().min(-3).max(3),
  surpriseCost: z.number().int().min(0).max(500_000_000),
  goalShiftMonths: z.number().int().min(-36).max(36).optional(),
});

const decisionSchema = z.object({
  choiceId: z.string().uuid(),
  optionId: z.string().uuid().optional(),
  mode: z.enum(['bull', 'base', 'bear']),
  shock: z.enum(['industry', 'job_loss', 'market']),
  params: paramsSchema,
});
const simulationInputSchema = z.union([decisionSchema, paramsSchema]);

interface ChoiceRow { id: string; title: string; income_uplift_pct: number }
interface OptionRow {
  id: string; title: string; description: string; cost: number; other_cost: number;
  duration_months: number; months_without_income: number; monthly_income_delta: number;
}

async function choiceReport(db: D1Database, userId: string, input: DecisionSimulationInput) {
  const choice = await db.prepare('SELECT id, title, income_uplift_pct FROM life_choices WHERE id = ? AND user_id = ? AND status != ?')
    .bind(input.choiceId, userId, 'archived').first<ChoiceRow>();
  if (!choice) throw notFound('Không tìm thấy lựa chọn');
  const option = await db.prepare(
    `SELECT id, title, description, cost, other_cost, duration_months, months_without_income, monthly_income_delta
     FROM life_choice_options WHERE choice_id = ? ${input.optionId ? 'AND id = ?' : ''}
     ORDER BY selected DESC, order_idx, rowid LIMIT 1`,
  ).bind(...(input.optionId ? [choice.id, input.optionId] : [choice.id])).first<OptionRow>();
  if (!option) throw new ApiError(422, 'missing_option', 'Lựa chọn chưa có phương án hợp lệ');
  const state = await loadUserState(db, userId);
  if (state.profile.monthlyExpense <= 0) throw new ApiError(422, 'insufficient_data', 'Cần nhập chi tiêu tháng trước khi mô phỏng');
  const decision = analyzeDecisionSimulation(
    state, { id: choice.id, title: choice.title, incomeUpliftPct: choice.income_uplift_pct },
    {
      id: option.id, title: option.title, description: option.description, cost: option.cost, otherCost: option.other_cost,
      durationMonths: option.duration_months, monthsWithoutIncome: option.months_without_income,
      monthlyIncomeDelta: option.monthly_income_delta,
    }, input,
  );
  return { ...simulationReport(state, input.params), decision };
}

async function reportFor(db: D1Database, userId: string, input: SimulationParams | DecisionSimulationInput) {
  return 'choiceId' in input ? choiceReport(db, userId, input) : simulationReport(await loadUserState(db, userId), input);
}

interface PresetRow {
  id: string;
  slug: string;
  name: string;
  icon: string;
  params_json: string;
}

export const simulations = new Hono<AppEnv>()
  .get('/presets', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT id, slug, name, icon, params_json FROM simulation_presets ORDER BY order_idx').all<PresetRow>();
    return ok(c, results.map((p) => ({ id: p.id, slug: p.slug, name: p.name, icon: p.icon, params: JSON.parse(p.params_json) as SimulationParams })));
  })
  /** Xem trước (không lưu) — màn 03 gọi khi người dùng kéo slider. */
  .post('/preview', body(simulationInputSchema), async (c) => {
    return ok(c, await reportFor(c.env.DB, c.get('userId'), c.req.valid('json')));
  })
  .post('/run', body(simulationInputSchema), async (c) => {
    const params = c.req.valid('json');
    const userId = c.get('userId');
    const report = await reportFor(c.env.DB, userId, params);
    const id = crypto.randomUUID();
    const goalLine = 'decision' in report
      ? ` Lựa chọn ${report.decision.choiceTitle}: còn ${report.decision.selected.runwayAfter} tháng an toàn.`
      : report.home ? ` Mục tiêu ${report.home.goalTitle.toLowerCase()}: ${report.home.afterLabel}.` : '';
    const label = 'decision' in report ? `${report.decision.choiceTitle} · ${report.decision.optionTitle}` : report.label;
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO simulation_runs (id, user_id, label, params_json, result_json) VALUES (?, ?, ?, ?, ?)')
        .bind(id, userId, label, JSON.stringify(params), JSON.stringify(report)),
      c.env.DB.prepare("INSERT INTO ai_events (id, user_id, type, title, body) VALUES (?, ?, 'simulation', ?, ?)")
        .bind(crypto.randomUUID(), userId, `Chạy mô phỏng: ${label}`, `Mức an tâm ${report.before.peaceScore} → ${report.after.peaceScore}.${goalLine}`),
    ]);
    return ok(c, { runId: id }, 201);
  })
  .get('/runs', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT id, label, created_at FROM simulation_runs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10')
      .bind(c.get('userId'))
      .all<{ id: string; label: string; created_at: string }>();
    return ok(c, results.map((r) => ({ id: r.id, label: r.label, createdAt: r.created_at })));
  })
  .get('/runs/:id', async (c) => {
    const row = await c.env.DB.prepare('SELECT result_json, created_at FROM simulation_runs WHERE id = ? AND user_id = ?')
      .bind(c.req.param('id'), c.get('userId'))
      .first<{ result_json: string; created_at: string }>();
    if (!row) throw notFound('Không tìm thấy kết quả mô phỏng');
    return ok(c, { ...(JSON.parse(row.result_json) as SimulationReport), createdAt: row.created_at });
  });
