import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { SimulationParams } from '../../shared/types/domain';
import type { DecisionSimulationResult } from '../../shared/types/api/decision';
import { simulationReport, type SimulationReport } from '../../shared/engine/analysis';
import { DECISION_SHOCKS, decisionPreset } from '../../shared/engine/decisionSimulation';
import { notFound, ok } from '../lib/http';
import { loadUserState } from '../lib/state';
import { body } from '../lib/validate';
import { runDecisionSimulation } from '../lib/decision';

const SECTORS = ['technology', 'finance', 'real_estate', 'manufacturing', 'consumer', 'healthcare', 'education_public', 'other'] as const;
const pct = z.number().min(0).max(100);

const paramsSchema = z.object({
  marketDropPct: z.number().min(-50).max(50),
  inflationPct: z.number().min(0).max(10),
  incomePauseMonths: z.number().int().min(0).max(12),
  interestRateDeltaPct: z.number().min(-3).max(3),
  surpriseCost: z.number().int().min(0).max(500_000_000),
  goalShiftMonths: z.number().int().min(-36).max(36).optional(),
});

const shockParamsSchema = z.object({
  sector: z.enum(SECTORS),
  disruptionProbPct: pct,
  monthsNoIncome: z.number().int().min(0).max(24),
  bonusCutPct: pct,
  esopCutPct: pct,
  employerStockDropPct: z.number().min(0).max(90),
  sectorDropPct: z.number().min(0).max(90),
  marketDropPct: z.number().min(0).max(90),
});

export const decisionRequestSchema = z.object({
  choiceId: z.string().min(1).optional(),
  optionId: z.string().min(1).optional(),
  mode: z.enum(['bull', 'base', 'bear']),
  shock: z.enum(['industry', 'job_loss', 'market']),
  params: shockParamsSchema.optional(),
});

const decisionSchema = decisionRequestSchema;
const simulationInputSchema = z.union([decisionSchema, paramsSchema]);
type SimulationInput = z.infer<typeof simulationInputSchema>;

const isDecision = (v: SimulationInput): v is z.infer<typeof decisionSchema> => 'mode' in v;

async function reportFor(db: D1Database, userId: string, input: SimulationInput): Promise<SimulationReport | DecisionSimulationResult> {
  return isDecision(input) ? runDecisionSimulation(db, userId, input) : simulationReport(await loadUserState(db, userId), input);
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
    const [{ results }, income] = await Promise.all([
      c.env.DB.prepare('SELECT id, slug, name, icon, params_json FROM simulation_presets ORDER BY order_idx').all<PresetRow>(),
      c.env.DB.prepare('SELECT sector FROM income_profiles WHERE user_id = ?').bind(c.get('userId')).first<{ sector: (typeof SECTORS)[number] | null }>(),
    ]);
    return ok(c, {
      presets: results.map((p) => ({ id: p.id, slug: p.slug, name: p.name, icon: p.icon, params: JSON.parse(p.params_json) as SimulationParams })),
      /** Mẫu cú sốc kép theo ngành trong hồ sơ nghề nghiệp. */
      shocks: DECISION_SHOCKS.map((shock) => ({ shock, params: decisionPreset(shock, income?.sector ?? 'technology') })),
    });
  })
  /** Xem trước (không lưu) — gọi khi người dùng kéo thanh trượt. */
  .post('/preview', body(simulationInputSchema), async (c) => {
    return ok(c, await reportFor(c.env.DB, c.get('userId'), c.req.valid('json')));
  })
  .post('/run', body(simulationInputSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId');
    const report = await reportFor(c.env.DB, userId, input);
    const id = crypto.randomUUID();
    let label: string, title: string, bodyText: string, choiceId: string | null = null, mode: string | null = null;
    if ('scenarios' in report) {
      label = `${report.choiceTitle} · ${report.optionTitle}`;
      title = `Mô phỏng cú sốc kép: ${report.choiceTitle}`;
      bodyText = `Số tháng an toàn ${report.impact.monthsSafe.before} → ${report.impact.monthsSafe.after}; mức độ an toàn ${report.impact.safety.before} → ${report.impact.safety.after}.`;
      choiceId = report.choiceId;
      mode = report.mode;
    } else {
      label = report.label;
      title = `Chạy mô phỏng: ${label}`;
      bodyText = `Mức an tâm ${report.before.peaceScore} → ${report.after.peaceScore}.${report.home ? ` Mục tiêu ${report.home.goalTitle.toLowerCase()}: ${report.home.afterLabel}.` : ''}`;
    }
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO simulation_runs (id, user_id, label, params_json, result_json, choice_id, mode) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(id, userId, label, JSON.stringify(input), JSON.stringify(report), choiceId, mode),
      c.env.DB.prepare("INSERT INTO ai_events (id, user_id, type, title, body) VALUES (?, ?, 'simulation', ?, ?)")
        .bind(crypto.randomUUID(), userId, title, bodyText),
    ]);
    return ok(c, { runId: id }, 201);
  })
  .get('/runs', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT id, label, created_at, choice_id, mode FROM simulation_runs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10')
      .bind(c.get('userId'))
      .all<{ id: string; label: string; created_at: string; choice_id: string | null; mode: string | null }>();
    return ok(c, results.map((r) => ({ id: r.id, label: r.label, createdAt: r.created_at, choiceId: r.choice_id, mode: r.mode })));
  })
  .get('/runs/:id', async (c) => {
    const row = await c.env.DB.prepare('SELECT result_json, created_at FROM simulation_runs WHERE id = ? AND user_id = ?')
      .bind(c.req.param('id'), c.get('userId'))
      .first<{ result_json: string; created_at: string }>();
    if (!row) throw notFound('Không tìm thấy kết quả mô phỏng');
    return ok(c, { ...(JSON.parse(row.result_json) as SimulationReport | DecisionSimulationResult), createdAt: row.created_at });
  });
