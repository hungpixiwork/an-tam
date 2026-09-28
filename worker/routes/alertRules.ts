// Luật cảnh báo giá người dùng tự đặt. Mount: /api/alert-rules

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { AlertRuleList } from '../../shared/types/api';
import { auditUserWrite } from '../lib/audit';
import { ApiError, notFound, ok } from '../lib/http';
import { body } from '../lib/validate';
import { loadAlertRules } from '../market/alerts';

// TODO: dùng PLAN_LIMITS trong shared/plans.ts sau khi merge (gói trả phí cho nhiều luật hơn).
const MAX_RULES = 3;

const ruleSchema = z.object({
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,12}$/, 'Mã chỉ gồm chữ và số, tối đa 12 ký tự'),
  direction: z.enum(['down', 'up']),
  thresholdPct: z.number().gt(0, 'Ngưỡng phải lớn hơn 0').max(100, 'Ngưỡng tối đa 100%'),
});

const audit = (action: string, summary: string, id: string | null) =>
  ({ agent: 'portfolio', action: `alert_rule.${action}`, entityType: 'alert_rule', entityId: id, summary, dataLabel: 'Luật cảnh báo giá' });

export const alertRules = new Hono<AppEnv>()
  .get('/', async (c) => ok<AlertRuleList>(c, await loadAlertRules(c.env.DB, c.get('userId'))))
  .post('/', body(ruleSchema), async (c) => {
    const userId = c.get('userId');
    const r = c.req.valid('json');
    const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM alert_rules WHERE user_id = ?').bind(userId).first<number>('n');
    if ((count ?? 0) >= MAX_RULES) throw new ApiError(400, 'limit_reached', `Bạn chỉ đặt được tối đa ${MAX_RULES} luật cảnh báo`);
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO alert_rules (id, user_id, symbol, direction, threshold_pct) VALUES (?, ?, ?, ?, ?)')
      .bind(id, userId, r.symbol, r.direction, r.thresholdPct)
      .run();
    await auditUserWrite(c.env, userId, audit('create', `Đặt cảnh báo khi ${r.symbol} ${r.direction === 'down' ? 'giảm' : 'tăng'}`, id));
    return ok(c, { id }, 201);
  })
  .patch('/:id', body(ruleSchema.partial()), async (c) => {
    const userId = c.get('userId');
    const r = c.req.valid('json');
    const cols = Object.entries({ symbol: r.symbol, direction: r.direction, threshold_pct: r.thresholdPct }).filter(([, v]) => v !== undefined);
    if (!cols.length) return ok(c, null);
    const res = await c.env.DB.prepare(`UPDATE alert_rules SET ${cols.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...cols.map(([, v]) => v), c.req.param('id'), userId)
      .run();
    if (!res.meta.changes) throw notFound('Không tìm thấy luật cảnh báo');
    await auditUserWrite(c.env, userId, audit('update', 'Sửa luật cảnh báo giá', c.req.param('id')));
    return ok(c, null);
  })
  .delete('/:id', async (c) => {
    const userId = c.get('userId');
    const res = await c.env.DB.prepare('DELETE FROM alert_rules WHERE id = ? AND user_id = ?').bind(c.req.param('id'), userId).run();
    if (!res.meta.changes) throw notFound('Không tìm thấy luật cảnh báo');
    await auditUserWrite(c.env, userId, audit('delete', 'Xóa luật cảnh báo giá', c.req.param('id')));
    return ok(c, null);
  });
