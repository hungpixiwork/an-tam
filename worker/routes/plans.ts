import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { portfolioAnalysis } from '../../shared/engine/analysis';
import { proposePlan } from '../../shared/engine/plan';
import { notFound, ok } from '../lib/http';
import { loadUserState } from '../lib/state';
import { body } from '../lib/validate';

interface TaskRow {
  id: string;
  title: string;
  tag: string;
  done: number;
}

async function applied(db: D1Database, userId: string) {
  const plan = await db
    .prepare("SELECT id, applied_at FROM safety_plans WHERE user_id = ? AND status = 'applied' ORDER BY applied_at DESC LIMIT 1")
    .bind(userId)
    .first<{ id: string; applied_at: string }>();
  if (!plan) return null;
  const { results } = await db.prepare('SELECT id, title, tag, done FROM plan_tasks WHERE plan_id = ? ORDER BY order_idx').bind(plan.id).all<TaskRow>();
  return { id: plan.id, appliedAt: plan.applied_at, tasks: results.map((t) => ({ id: t.id, title: t.title, tag: t.tag, done: t.done === 1 })) };
}

export const portfolio = new Hono<AppEnv>().get('/', async (c) => ok(c, portfolioAnalysis(await loadUserState(c.env.DB, c.get('userId')))));

export const plans = new Hono<AppEnv>()
  .get('/', async (c) => {
    const userId = c.get('userId');
    const state = await loadUserState(c.env.DB, userId);
    return ok(c, { proposal: proposePlan(state), applied: await applied(c.env.DB, userId) });
  })
  .post('/apply', async (c) => {
    const userId = c.get('userId');
    const proposal = proposePlan(await loadUserState(c.env.DB, userId));
    const planId = crypto.randomUUID();
    const db = c.env.DB;
    await db.batch([
      db.prepare("UPDATE safety_plans SET status = 'archived' WHERE user_id = ? AND status = 'applied'").bind(userId),
      db.prepare('INSERT INTO safety_plans (id, user_id, steps_json) VALUES (?, ?, ?)').bind(planId, userId, JSON.stringify(proposal.steps)),
      ...proposal.tasks.map((t, i) =>
        db.prepare('INSERT INTO plan_tasks (id, plan_id, title, tag, order_idx) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), planId, t.title, t.tag, i),
      ),
      db.prepare("INSERT INTO ai_events (id, user_id, type, title, body) VALUES (?, ?, 'reminder', ?, ?)").bind(
        crypto.randomUUID(),
        userId,
        'Bắt đầu theo dõi kế hoạch an toàn',
        `AI sẽ nhắc bạn hằng tháng: ${proposal.steps.map((s) => s.title.toLowerCase()).join('; ')}.`,
      ),
    ]);
    return ok(c, await applied(db, userId), 201);
  })
  .patch('/tasks/:id', body(z.object({ done: z.boolean() })), async (c) => {
    const res = await c.env.DB.prepare('UPDATE plan_tasks SET done = ? WHERE id = ? AND plan_id IN (SELECT id FROM safety_plans WHERE user_id = ?)')
      .bind(c.req.valid('json').done ? 1 : 0, c.req.param('id'), c.get('userId'))
      .run();
    if (!res.meta.changes) throw notFound('Không tìm thấy việc cần làm');
    return ok(c, null);
  });
