// Nợ phải trả (vay mua nhà, vay tiêu dùng, thẻ tín dụng…). Mount: /api/liabilities

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { formatVnd } from '../../shared/format';
import { notFound, ok } from '../lib/http';
import { afterChange } from '../lib/refresh';
import { loadUserState, type LoadedState } from '../lib/state';
import { body, money } from '../lib/validate';

const liabilitySchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên khoản nợ').max(60),
  kind: z.enum(['mortgage', 'consumer', 'credit_card', 'student', 'other']).default('other'),
  balance: money,
  monthlyPayment: money.default(0),
  rateBp: z.number().int().min(0).max(10000).default(0),
});

const debtLine = (s: LoadedState) => `Tổng nợ: ${formatVnd((s.liabilities ?? []).reduce((t, l) => t + l.balance, 0))}.`;

export const liabilities = new Hono<AppEnv>()
  .get('/', async (c) => ok(c, (await loadUserState(c.env.DB, c.get('userId'))).liabilities ?? []))
  .post('/', body(liabilitySchema), async (c) => {
    const userId = c.get('userId');
    const l = c.req.valid('json');
    const before = await loadUserState(c.env.DB, userId);
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO liabilities (id, user_id, name, kind, balance, monthly_payment, rate_bp, order_idx)
       VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(order_idx), 0) + 1 FROM liabilities WHERE user_id = ?))`,
    )
      .bind(id, userId, l.name, l.kind, l.balance, l.monthlyPayment, l.rateBp, userId)
      .run();
    await afterChange(c.env.DB, userId, { title: 'Cập nhật khoản nợ', detail: debtLine, before });
    return ok(c, { id }, 201);
  })
  .patch('/:id', body(liabilitySchema.partial()), async (c) => {
    const userId = c.get('userId');
    const l = c.req.valid('json');
    const cols: Record<string, unknown> = { name: l.name, kind: l.kind, balance: l.balance, monthly_payment: l.monthlyPayment, rate_bp: l.rateBp };
    const entries = Object.entries(cols).filter(([, v]) => v !== undefined);
    if (!entries.length) return ok(c, null);
    const before = await loadUserState(c.env.DB, userId);
    const res = await c.env.DB.prepare(`UPDATE liabilities SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...entries.map(([, v]) => v), c.req.param('id'), userId)
      .run();
    if (!res.meta.changes) throw notFound('Không tìm thấy khoản nợ');
    await afterChange(c.env.DB, userId, { title: 'Cập nhật khoản nợ', detail: debtLine, before });
    return ok(c, null);
  })
  .delete('/:id', async (c) => {
    const userId = c.get('userId');
    const before = await loadUserState(c.env.DB, userId);
    const res = await c.env.DB.prepare('DELETE FROM liabilities WHERE id = ? AND user_id = ?').bind(c.req.param('id'), userId).run();
    if (!res.meta.changes) throw notFound('Không tìm thấy khoản nợ');
    await afterChange(c.env.DB, userId, { title: 'Cập nhật khoản nợ', detail: debtLine, before });
    return ok(c, null);
  });
