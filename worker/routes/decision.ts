// Dải "Cho quyết định …" trên các trang CRUD. Mount: /api/decision
// Lấy lựa chọn đang ghim + tham số của lần mô phỏng cú sốc kép gần nhất → tính lại (số "trước" luôn mới để hoàn tác đúng)
// → bỏ bước đã áp dụng → trả tối đa 2 bước thuộc trang đang xem. Chưa ghim / chưa mô phỏng → rỗng (không tốn thêm truy vấn).

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { DecisionStep } from '../../shared/types/api/decision';
import { ok } from '../lib/http';
import { runDecisionSimulation, type DecisionRequest } from '../lib/decision';

const DOMAIN_STEPS: Record<string, DecisionStep['key'][]> = {
  safety: ['raise_reserve'],
  ledger: ['cut_budget'],
  portfolio: ['reduce_concentration'],
  earn: ['side_income'],
  all: ['raise_reserve', 'reduce_concentration', 'cut_budget', 'side_income', 'delay_start'],
};
const domainSchema = z.enum(['safety', 'ledger', 'portfolio', 'earn', 'all']);

export interface DecisionNext { choiceId: string; choiceTitle: string; steps: DecisionStep[] }

export const decision = new Hono<AppEnv>().get('/next', async (c) => {
  const domain = domainSchema.catch('all').parse(c.req.query('domain'));
  const db = c.env.DB;
  const userId = c.get('userId');
  const run = await db.prepare(
    `SELECT r.params_json, r.choice_id FROM simulation_runs r JOIN life_choices l ON l.id = r.choice_id
     WHERE r.user_id = ? AND l.status = 'active' ORDER BY l.pinned DESC, r.created_at DESC LIMIT 1`,
  ).bind(userId).first<{ params_json: string; choice_id: string }>();
  if (!run) return ok<DecisionNext | null>(c, null);
  const input = JSON.parse(run.params_json) as DecisionRequest;
  const [result, applied] = await Promise.all([
    runDecisionSimulation(db, userId, { ...input, choiceId: run.choice_id }),
    db.prepare("SELECT DISTINCT step_key FROM agent_actions WHERE user_id = ? AND choice_id = ? AND status = 'done' AND undone_at IS NULL AND step_key IS NOT NULL")
      .bind(userId, run.choice_id).all<{ step_key: string }>(),
  ]);
  const done = new Set(applied.results.map((r) => r.step_key));
  const wanted = DOMAIN_STEPS[domain];
  const steps = result.steps.filter((s) => s.action && wanted.includes(s.key) && !done.has(s.key)).slice(0, 2);
  return ok<DecisionNext | null>(c, steps.length ? { choiceId: result.choiceId, choiceTitle: result.choiceTitle, steps } : null);
});
