import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { notFound, ok } from '../lib/http';
import { body } from '../lib/validate';

const RANGE_DAYS: Record<string, number> = { week: 7, month: 30 };

interface EventRow {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
}
interface AlertRow extends EventRow {
  rule_key: string;
  severity: string;
  status: string;
}

export const ai = new Hono<AppEnv>()
  .get('/', async (c) => {
    const userId = c.get('userId');
    const days = RANGE_DAYS[c.req.query('range') ?? 'week'] ?? 7;
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const [events, alerts] = await c.env.DB.batch([
      c.env.DB.prepare('SELECT id, type, title, body, created_at FROM ai_events WHERE user_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT 20').bind(userId, since),
      c.env.DB.prepare(
        `SELECT id, rule_key, severity, title, body, status, created_at FROM ai_alerts WHERE user_id = ? AND status = 'open'
         ORDER BY CASE severity WHEN 'danger' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, created_at DESC`,
      ).bind(userId),
    ]);
    return ok(c, {
      events: (events.results as unknown as EventRow[]).map((e) => ({ id: e.id, type: e.type, title: e.title, body: e.body, createdAt: e.created_at })),
      alerts: (alerts.results as unknown as AlertRow[]).map((a) => ({
        id: a.id, ruleKey: a.rule_key, severity: a.severity, title: a.title, body: a.body, status: a.status, createdAt: a.created_at,
      })),
    });
  })
  .patch('/alerts/:id', body(z.object({ status: z.enum(['open', 'resolved']) })), async (c) => {
    const status = c.req.valid('json').status;
    const res = await c.env.DB.prepare('UPDATE ai_alerts SET status = ?, resolved_at = ? WHERE id = ? AND user_id = ?')
      .bind(status, status === 'resolved' ? new Date().toISOString() : null, c.req.param('id'), c.get('userId'))
      .run();
    if (!res.meta.changes) throw notFound('Không tìm thấy cảnh báo');
    return ok(c, null);
  });
