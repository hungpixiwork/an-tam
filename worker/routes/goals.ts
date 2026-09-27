import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { goalsSummary } from '../../shared/engine/analysis';
import { formatVnd } from '../../shared/format';
import { notFound, ok } from '../lib/http';
import { auditUserWrite } from '../lib/audit';
import { afterChange } from '../lib/refresh';
import { loadUserState } from '../lib/state';
import { body, money, monthString } from '../lib/validate';

export const goalSchema = z.object({
  kind: z.enum(['home', 'education', 'retirement', 'emergency', 'custom']),
  title: z.string().trim().min(2, 'Tên mục tiêu quá ngắn').max(60),
  targetAmount: money.positive('Số tiền mục tiêu phải lớn hơn 0'),
  currentAmount: money,
  targetMonth: monthString,
  monthlyContribution: money,
  priority: z.number().int().min(1).max(3).default(2),
  icon: z.string().trim().max(24).nullish(),
  horizon: z.enum(['short', 'mid', 'long']).nullish(),
});
export type GoalInput = z.infer<typeof goalSchema>;

export const insertGoal = (db: D1Database, userId: string, g: GoalInput) =>
  db
    .prepare(
      `INSERT INTO goals (id, user_id, kind, title, target_amount, current_amount, target_month, monthly_contribution, priority, icon, horizon, order_idx)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(order_idx), 0) + 1 FROM goals WHERE user_id = ?))`,
    )
    .bind(crypto.randomUUID(), userId, g.kind, g.title, g.targetAmount, g.currentAmount, g.targetMonth, g.monthlyContribution, g.priority, g.icon ?? null, g.horizon ?? null, userId);

const goalAudit = (action: 'create' | 'update' | 'delete', summary: string, id: string | null) =>
  ({ agent: 'goal', action: `goal.${action}`, entityType: 'goal', entityId: id, summary, dataLabel: 'Thu nhập, mục tiêu (đã ẩn danh)' });

export const goals = new Hono<AppEnv>()
  .get('/summary', async (c) => ok(c, goalsSummary(await loadUserState(c.env.DB, c.get('userId')))))
  .post('/', body(goalSchema), async (c) => {
    const g = c.req.valid('json');
    const userId = c.get('userId');
    const before = await loadUserState(c.env.DB, userId);
    await insertGoal(c.env.DB, userId, g).run();
    await afterChange(c.env.DB, userId, { title: 'Thêm mục tiêu', detail: `Mục tiêu "${g.title}" ${formatVnd(g.targetAmount)}.`, before });
    await auditUserWrite(c.env, userId, goalAudit('create', `Thêm mục tiêu "${g.title}"`, null));
    return ok(c, null, 201);
  })
  .patch('/:id', body(goalSchema.partial()), async (c) => {
    const g = c.req.valid('json');
    const userId = c.get('userId');
    const cols: Record<string, unknown> = {
      kind: g.kind,
      title: g.title,
      target_amount: g.targetAmount,
      current_amount: g.currentAmount,
      target_month: g.targetMonth,
      monthly_contribution: g.monthlyContribution,
      priority: g.priority,
      icon: g.icon,
      horizon: g.horizon,
    };
    const entries = Object.entries(cols).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return ok(c, null);
    const before = await loadUserState(c.env.DB, userId);
    const res = await c.env.DB.prepare(`UPDATE goals SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...entries.map(([, v]) => v), c.req.param('id'), userId)
      .run();
    if (!res.meta.changes) throw notFound('Không tìm thấy mục tiêu');
    await afterChange(c.env.DB, userId, { title: 'Cập nhật mục tiêu', before });
    const parts = [
      g.targetAmount !== undefined || g.currentAmount !== undefined || g.monthlyContribution !== undefined ? 'số tiền' : '',
      g.targetMonth ? 'thời hạn' : '',
      g.title ? 'tên' : '',
      g.icon !== undefined || g.horizon !== undefined ? 'biểu tượng, kỳ hạn' : '',
    ].filter(Boolean);
    await auditUserWrite(c.env, userId, goalAudit('update', `Điều chỉnh mục tiêu${parts.length ? ` (${parts.join(', ')})` : ''}`, c.req.param('id')));
    return ok(c, null);
  })
  .delete('/:id', async (c) => {
    const userId = c.get('userId');
    const before = await loadUserState(c.env.DB, userId);
    const res = await c.env.DB.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').bind(c.req.param('id'), userId).run();
    if (!res.meta.changes) throw notFound('Không tìm thấy mục tiêu');
    await afterChange(c.env.DB, userId, { title: 'Xóa mục tiêu', before });
    await auditUserWrite(c.env, userId, goalAudit('delete', 'Xóa một mục tiêu', c.req.param('id')));
    return ok(c, null);
  });
