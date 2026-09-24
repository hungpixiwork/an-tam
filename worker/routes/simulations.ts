import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { SimulationParams } from '../../shared/types/domain';
import { simulationReport, type SimulationReport } from '../../shared/engine/analysis';
import { notFound, ok } from '../lib/http';
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
  .post('/preview', body(paramsSchema), async (c) => {
    const state = await loadUserState(c.env.DB, c.get('userId'));
    return ok(c, simulationReport(state, c.req.valid('json')));
  })
  .post('/run', body(paramsSchema), async (c) => {
    const params = c.req.valid('json');
    const userId = c.get('userId');
    const report = simulationReport(await loadUserState(c.env.DB, userId), params);
    const id = crypto.randomUUID();
    const goalLine = report.home ? ` Mục tiêu ${report.home.goalTitle.toLowerCase()}: ${report.home.afterLabel}.` : '';
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO simulation_runs (id, user_id, label, params_json, result_json) VALUES (?, ?, ?, ?, ?)')
        .bind(id, userId, report.label, JSON.stringify(params), JSON.stringify(report)),
      c.env.DB.prepare("INSERT INTO ai_events (id, user_id, type, title, body) VALUES (?, ?, 'simulation', ?, ?)")
        .bind(crypto.randomUUID(), userId, `Chạy mô phỏng: ${report.label}`, `Mức an tâm ${report.before.peaceScore} → ${report.after.peaceScore}.${goalLine}`),
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
