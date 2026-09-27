import { beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../worker/env';
import { ApiError } from '../worker/lib/http';
import { agent } from '../worker/routes/agent';
import { sanitizePrompt } from '../shared/agent/sanitize';
import { hasSqlite, insertUser, openMigratedD1, type TestD1 } from './helpers/sqlite-d1';

describe('sanitizePrompt', () => {
  it('che số tiền, số điện thoại, email và mọi con số', () => {
    const out = sanitizePrompt('Tôi có 84 triệu, muốn để dành 5.000.000đ/tháng, gọi 0912 345 678 hoặc hung@antam.vn, trong 12 tháng');
    expect(out).not.toMatch(/\d/);
    expect(out).not.toContain('@');
    expect(out).toContain('[số tiền]');
    expect(out).toContain('[số điện thoại]');
  });
});

const hasDb = await hasSqlite();

describe.skipIf(!hasDb)('duyệt hành động agent (node:sqlite)', () => {
  let t: TestD1;
  const app = new Hono<AppEnv>();
  app.onError((err, c) => {
    if (err instanceof ApiError) return c.json({ success: false, error: { code: err.code, message: err.message } }, err.status);
    return c.json({ success: false, error: { code: 'internal', message: String(err) } }, 500);
  });
  app.use('*', async (c, next) => {
    c.set('userId', 'u1');
    await next();
  });
  app.route('/agent', agent);

  const approve = (key: string) => app.request('/agent/actions/a1/approve', { method: 'POST', headers: { 'Idempotency-Key': key } }, { DB: t.d1 });

  beforeEach(async () => {
    t = (await openMigratedD1())!;
    insertUser(t.raw, 'u1');
    const payload = { month: '2026-10', limitBefore: null, limit: 19_000_000, saving: 500_000, reason: 'test' };
    t.raw.prepare(
      `INSERT INTO agent_actions (id, user_id, agent, type, title, payload_json, integration, risk, status, expires_at)
       VALUES ('a1', 'u1', 'cashflow', 'budget.set', 'Cập nhật ngân sách', ?, 'local', 'mid', 'pending', ?)`,
    ).run(JSON.stringify(payload), new Date(Date.now() + 3_600_000).toISOString());
  });

  it('bấm duyệt 2 lần (khóa khác nhau) → chỉ thực thi 1 lần, lần 2 trả 409', async () => {
    const first = await approve('approve-key-0001');
    expect(first.status).toBe(200);
    expect(((await first.json()) as any).data.status).toBe('done');
    const second = await approve('approve-key-0002');
    expect(second.status).toBe(409);

    const budgets = t.raw.prepare("SELECT limit_amount FROM budgets WHERE user_id = 'u1'").all() as { limit_amount: number }[];
    expect(budgets).toEqual([{ limit_amount: 19_000_000 }]);
    const runs = t.raw.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'budget.set' AND status = 'completed'").get() as { n: number };
    expect(runs.n).toBe(1);
  });
});
