// Nhật ký AI (trang 9). Mount: /api/audit
// GET /           ?agent&status&from&to&cursor&limit — mới nhất trước, phân trang theo con trỏ (rowid, append-only)
// GET /verify     kiểm tra chuỗi hash của toàn bộ nhật ký người dùng

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import type { AuditLogItem, AuditPage, AuditStatus, AuditVerify } from '../../shared/types/api';
import { ok } from '../lib/http';
import { verifyAuditChain, type AuditRow } from '../lib/audit';

const STATUSES: AuditStatus[] = ['completed', 'approved', 'rejected', 'failed'];
const PAGE = 20;
const isoOk = (s: string | undefined) => !!s && !Number.isNaN(Date.parse(s));

type Row = AuditRow & { rid: number };

const toItem = (r: Row): AuditLogItem => ({
  id: r.id,
  at: r.at,
  actor: r.actor as AuditLogItem['actor'],
  agent: r.agent,
  action: r.action,
  entityType: r.entity_type,
  entityId: r.entity_id,
  summary: r.summary_masked,
  dataLabel: r.data_label,
  status: r.status as AuditStatus,
  approver: r.approver as AuditLogItem['approver'],
  runId: r.run_id,
  actionId: r.action_id,
});

export const audit = new Hono<AppEnv>()
  .get('/', async (c) => {
    const userId = c.get('userId');
    const q = c.req.query();
    const where = ['user_id = ?'];
    const args: unknown[] = [userId];
    if (q.agent) {
      where.push(q.agent === 'system' ? 'agent IS NULL' : 'agent = ?');
      if (q.agent !== 'system') args.push(q.agent);
    }
    if (q.status && STATUSES.includes(q.status as AuditStatus)) (where.push('status = ?'), args.push(q.status));
    if (isoOk(q.from)) (where.push('at >= ?'), args.push(new Date(q.from).toISOString()));
    if (isoOk(q.to)) (where.push('at <= ?'), args.push(new Date(q.to).toISOString()));
    const cursor = Number(q.cursor);
    if (Number.isInteger(cursor) && cursor > 0) (where.push('rowid < ?'), args.push(cursor));
    const limit = Math.min(Math.max(Number(q.limit) || PAGE, 1), 100);

    const [rows, agents] = await c.env.DB.batch<Row | { agent: string | null }>([
      c.env.DB.prepare(`SELECT rowid AS rid, * FROM audit_log WHERE ${where.join(' AND ')} ORDER BY rowid DESC LIMIT ?`).bind(...args, limit + 1),
      c.env.DB.prepare('SELECT DISTINCT agent FROM audit_log WHERE user_id = ?').bind(userId),
    ]);
    const list = rows.results as Row[];
    const page = list.slice(0, limit);
    return ok<AuditPage>(c, {
      items: page.map(toItem),
      nextCursor: list.length > limit ? String(page[page.length - 1].rid) : null,
      agents: (agents.results as { agent: string | null }[]).map((a) => a.agent ?? 'system').sort(),
    });
  })
  .get('/verify', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM audit_log WHERE user_id = ? ORDER BY rowid').bind(c.get('userId')).all<AuditRow>();
    const { ok: intact, brokenAt } = await verifyAuditChain(results, { salt: c.env.AUDIT_HASH_SALT });
    return ok<AuditVerify>(c, { ok: intact, count: results.length, brokenAt, lastAt: results.at(-1)?.at ?? null, checkedAt: new Date().toISOString() });
  });
