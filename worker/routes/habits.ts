import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { habitsProfile, type HabitScenario } from '../../shared/engine/analysis';
import { notFound, ok } from '../lib/http';
import { body } from '../lib/validate';

interface ScenarioRow {
  id: string;
  prompt: string;
  context: string;
  icon: string;
  options_json: string;
}

async function load(db: D1Database, userId: string) {
  const [scenarios, answers, profile] = await db.batch([
    db.prepare('SELECT id, prompt, context, icon, options_json FROM habit_scenarios ORDER BY order_idx'),
    db.prepare('SELECT scenario_id, choice FROM habit_answers WHERE user_id = ?').bind(userId),
    db.prepare('SELECT risk_self_score FROM financial_profiles WHERE user_id = ?').bind(userId),
  ]);
  const list: HabitScenario[] = (scenarios.results as unknown as ScenarioRow[]).map((s) => ({
    id: s.id,
    prompt: s.prompt,
    context: s.context,
    icon: s.icon,
    options: JSON.parse(s.options_json),
  }));
  const picked: Record<string, string> = Object.fromEntries(
    (answers.results as unknown as { scenario_id: string; choice: string }[]).map((a) => [a.scenario_id, a.choice]),
  );
  const self = (profile.results[0] as { risk_self_score?: number } | undefined)?.risk_self_score ?? 5;
  return { scenarios: list, answers: picked, profile: habitsProfile(self, list, picked) };
}

export const habits = new Hono<AppEnv>()
  .get('/', async (c) => ok(c, await load(c.env.DB, c.get('userId'))))
  .post('/answers', body(z.object({ scenarioId: z.string(), choice: z.string() })), async (c) => {
    const { scenarioId, choice } = c.req.valid('json');
    const s = await c.env.DB.prepare('SELECT options_json FROM habit_scenarios WHERE id = ?').bind(scenarioId).first<{ options_json: string }>();
    if (!s || !(JSON.parse(s.options_json) as { key: string }[]).some((o) => o.key === choice)) throw notFound('Lựa chọn không hợp lệ');
    await c.env.DB.prepare(
      `INSERT INTO habit_answers (user_id, scenario_id, choice) VALUES (?, ?, ?)
       ON CONFLICT (user_id, scenario_id) DO UPDATE SET choice = excluded.choice, created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    )
      .bind(c.get('userId'), scenarioId, choice)
      .run();
    return ok(c, await load(c.env.DB, c.get('userId')));
  })
  .put('/self-score', body(z.object({ score: z.number().int().min(0).max(10) })), async (c) => {
    await c.env.DB.prepare('UPDATE financial_profiles SET risk_self_score = ? WHERE user_id = ?').bind(c.req.valid('json').score, c.get('userId')).run();
    return ok(c, await load(c.env.DB, c.get('userId')));
  });
