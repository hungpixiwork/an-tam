import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { holdingDefaults } from '../../shared/engine/ledger';
import { totalValue } from '../../shared/engine/portfolio';
import { formatVnd } from '../../shared/format';
import { notFound, ok } from '../lib/http';
import { afterChange } from '../lib/refresh';
import { loadUserState, type LoadedState } from '../lib/state';
import { body, money } from '../lib/validate';

export const holdingSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên tài sản').max(60),
  category: z.enum(['cash', 'fund', 'stock', 'bond', 'other']),
  value: money,
  /** Bỏ trống → suy ra từ loại tài sản. */
  volatility: z.enum(['low', 'mid', 'high']).optional(),
});
export type HoldingInput = z.infer<typeof holdingSchema>;

export function insertHolding(db: D1Database, userId: string, h: HoldingInput) {
  const d = holdingDefaults(h.category);
  return db
    .prepare(
      `INSERT INTO holdings (id, user_id, name, category, value, role, volatility, risk_group, is_main, order_idx)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, (SELECT COALESCE(MAX(order_idx), 0) + 1 FROM holdings WHERE user_id = ?))`,
    )
    .bind(crypto.randomUUID(), userId, h.name, h.category, h.value, d.role, h.volatility ?? d.volatility, d.riskGroup, userId);
}

const totalLine = (s: LoadedState) => `Tổng tài sản: ${formatVnd(totalValue(s.holdings))}.`;

export const holdings = new Hono<AppEnv>()
  .get('/', async (c) => ok(c, (await loadUserState(c.env.DB, c.get('userId'))).holdings))
  .post('/', body(holdingSchema), async (c) => {
    const userId = c.get('userId');
    const h = c.req.valid('json');
    const before = await loadUserState(c.env.DB, userId);
    await insertHolding(c.env.DB, userId, h).run();
    await afterChange(c.env.DB, userId, { title: 'Cập nhật tài sản', detail: totalLine, before });
    return ok(c, null, 201);
  })
  .patch('/:id', body(holdingSchema.partial()), async (c) => {
    const userId = c.get('userId');
    const h = c.req.valid('json');
    // Đổi loại tài sản → cập nhật luôn vai trò / nhóm rủi ro theo loại mới
    const d = h.category ? holdingDefaults(h.category) : null;
    const cols: Record<string, unknown> = {
      name: h.name,
      category: h.category,
      value: h.value,
      role: d?.role,
      risk_group: d?.riskGroup,
      volatility: h.volatility ?? d?.volatility,
    };
    const entries = Object.entries(cols).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return ok(c, null);
    const before = await loadUserState(c.env.DB, userId);
    const res = await c.env.DB.prepare(`UPDATE holdings SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...entries.map(([, v]) => v), c.req.param('id'), userId)
      .run();
    if (!res.meta.changes) throw notFound('Không tìm thấy tài sản');
    await afterChange(c.env.DB, userId, { title: 'Cập nhật tài sản', detail: totalLine, before });
    return ok(c, null);
  })
  .delete('/:id', async (c) => {
    const userId = c.get('userId');
    const before = await loadUserState(c.env.DB, userId);
    const res = await c.env.DB.prepare('DELETE FROM holdings WHERE id = ? AND user_id = ?').bind(c.req.param('id'), userId).run();
    if (!res.meta.changes) throw notFound('Không tìm thấy tài sản');
    await afterChange(c.env.DB, userId, { title: 'Cập nhật tài sản', detail: totalLine, before });
    return ok(c, null);
  });
