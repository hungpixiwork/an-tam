import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { goalsSummary } from '../../shared/engine/analysis';
import { notFound, ok } from '../lib/http';
import { loadUserState } from '../lib/state';
import { body } from '../lib/validate';

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Tháng không hợp lệ (YYYY-MM)');
const goalSchema = z.object({
  kind: z.enum(['home', 'education', 'retirement', 'emergency', 'custom']),
  title: z.string().trim().min(2, 'Tên mục tiêu quá ngắn').max(60),
  targetAmount: z.number().int().positive('Số tiền mục tiêu phải lớn hơn 0'),
  currentAmount: z.number().int().min(0),
  targetMonth: month,
  monthlyContribution: z.number().int().min(0),
  priority: z.number().int().min(1).max(3).default(2),
});

export const goals = new Hono<AppEnv>()
  .get('/summary', async (c) => ok(c, goalsSummary(await loadUserState(c.env.DB, c.get('userId')))))
  .post('/', body(goalSchema), async (c) => {
    const g = c.req.valid('json');
    const userId = c.get('userId');
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO goals (id, user_id, kind, title, target_amount, current_amount, target_month, monthly_contribution, priority, order_idx)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(order_idx), 0) + 1 FROM goals WHERE user_id = ?))`,
    )
      .bind(id, userId, g.kind, g.title, g.targetAmount, g.currentAmount, g.targetMonth, g.monthlyContribution, g.priority, userId)
      .run();
    return ok(c, { id }, 201);
  })
  .patch('/:id', body(goalSchema.partial()), async (c) => {
    const g = c.req.valid('json');
    const cols: Record<string, unknown> = {
      kind: g.kind,
      title: g.title,
      target_amount: g.targetAmount,
      current_amount: g.currentAmount,
      target_month: g.targetMonth,
      monthly_contribution: g.monthlyContribution,
      priority: g.priority,
    };
    const entries = Object.entries(cols).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return ok(c, null);
    const res = await c.env.DB.prepare(`UPDATE goals SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...entries.map(([, v]) => v), c.req.param('id'), c.get('userId'))
      .run();
    if (!res.meta.changes) throw notFound('Không tìm thấy mục tiêu');
    return ok(c, null);
  })
  .delete('/:id', async (c) => {
    const res = await c.env.DB.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').bind(c.req.param('id'), c.get('userId')).run();
    if (!res.meta.changes) throw notFound('Không tìm thấy mục tiêu');
    return ok(c, null);
  });
