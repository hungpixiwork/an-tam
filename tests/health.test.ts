import { describe, expect, it } from 'vitest';
import worker from '../worker/index';
import type { Env } from '../worker/env';

const stmt = (first: () => Promise<unknown>) => ({
  bind: () => stmt(first),
  first,
  all: async () => ({ results: [] }),
  run: async () => ({ meta: { changes: 0 } }),
});

/** Mock D1: SELECT 1 thành công, session hợp lệ nếu `authed`, batch trả kết quả rỗng cho từng lệnh. */
const envWith = (opts: { dbDown?: boolean; authed?: boolean } = {}): Env => ({
  DB: {
    prepare: (sql: string) =>
      stmt(async () => {
        if (opts.dbDown) throw new Error('D1 unavailable');
        if (sql.includes('SELECT 1')) return { ok: 1 };
        if (opts.authed && sql.includes('FROM sessions')) return { user_id: 'mock-user-123' };
        return null;
      }),
    batch: async (s: unknown[]) => s.map(() => ({ results: [] })),
  } as unknown as D1Database,
});

const req = (path: string, init: RequestInit = {}, authed = false) =>
  new Request(`http://localhost${path}`, { ...init, headers: { ...(authed ? { Cookie: 'at_session=mock-token' } : {}), ...(init.headers ?? {}) } });

describe('GET /api/health', () => {
  it('công khai, D1 lên → 200 { ok, db: up, version, time }', async () => {
    const res = await worker.fetch(req('/api/health'), envWith());
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body).toMatchObject({ success: true, ok: true, db: 'up', version: '1.0.0' });
    expect(body.data).toMatchObject({ ok: true, db: 'up' });
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('D1 lỗi → 503 db: down', async () => {
    const res = await worker.fetch(req('/api/health'), envWith({ dbDown: true }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ success: false, ok: false, db: 'down', error: { code: 'db_down' } });
  });
});

const STUBS: [string, string][] = [
  ['GET', '/api/ledger/dashboard?month=2026-09'],
  ['POST', '/api/ledger/split'],
  ['PUT', '/api/settings/payout-account'],
  ['GET', '/api/budgets/2026-09'],
  ['PUT', '/api/budgets/2026-09'],
  ['GET', '/api/bills'],
  ['POST', '/api/bills/b1/paid'],
  ['GET', '/api/safety'],
  ['PUT', '/api/safety/target'],
  ['GET', '/api/skills'],
  ['GET', '/api/human-capital'],
  ['GET', '/api/calendar?week=2026-W39'],
  ['POST', '/api/calendar/sync'],
  ['POST', '/api/calendar/auto-schedule'],
  ['GET', '/api/automation-rules'],
  ['PUT', '/api/automation-rules/weekly_review'],
  ['GET', '/api/life-choices/templates'],
  ['POST', '/api/life-choices/evaluate'],
  ['POST', '/api/life-choices/compare'],
  ['PATCH', '/api/life-choices/c1/tasks/t1'],
  ['GET', '/api/portfolio/risk'],
  ['POST', '/api/portfolio/what-if'],
  ['GET', '/api/agents'],
  ['POST', '/api/agent/runs'],
  ['GET', '/api/agent/runs/r1'],
  ['GET', '/api/agent/actions?status=pending'],
  ['POST', '/api/agent/actions/approve-batch'],
  ['POST', '/api/agent/actions/a1/approve'],
  ['POST', '/api/agent/actions/a1/reject'],
  ['POST', '/api/agent/actions/a1/request-changes'],
  ['GET', '/api/audit?status=approved'],
  ['GET', '/api/integrations'],
  ['GET', '/api/integrations/google/connect'],
  ['GET', '/api/integrations/google/callback'],
  ['POST', '/api/integrations/sepay/link'],
  ['DELETE', '/api/integrations/notion'],
];

describe('Stub routes Wave 0', () => {
  it('chưa đăng nhập → 401 cho mọi route mới', async () => {
    for (const [method, path] of STUBS) {
      const res = await worker.fetch(req(path, { method }), envWith());
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });

  it('đã đăng nhập → 501 not_implemented theo envelope chung', async () => {
    for (const [method, path] of STUBS) {
      const res = await worker.fetch(req(path, { method }, true), envWith({ authed: true }));
      expect(res.status, `${method} ${path}`).toBe(501);
      expect(((await res.json()) as any).error.code).toBe('not_implemented');
    }
  });

  it('webhook SePay công khai (không 401)', async () => {
    const res = await worker.fetch(req('/api/webhooks/sepay', { method: 'POST' }), envWith());
    expect(res.status).toBe(501);
  });

  it('GET /api/portfolio cũ vẫn chạy bên cạnh /risk, /what-if', async () => {
    const res = await worker.fetch(req('/api/portfolio', {}, true), envWith({ authed: true }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).success).toBe(true);
  });

  it('GET /api/settings vẫn chạy (payout-account không nuốt /settings)', async () => {
    const res = await worker.fetch(req('/api/settings', {}, true), envWith({ authed: true }));
    expect(res.status).toBe(200);
  });
});

describe('scheduled() dispatch theo cron', () => {
  const run = async (cron: string) => {
    let prepared = 0;
    const env = { DB: { prepare: () => (prepared++, stmt(async () => null)), batch: async () => [] } } as unknown as Env;
    const waits: Promise<unknown>[] = [];
    const ctx = { waitUntil: (p: Promise<unknown>) => waits.push(p), passThroughOnException: () => {} } as unknown as ExecutionContext;
    worker.scheduled!({ cron, scheduledTime: Date.now(), noRetry: () => {} } as unknown as ScheduledController, env, ctx);
    await Promise.all(waits);
    return prepared;
  };

  it('*/15 là placeholder (không chạm DB), cron hằng ngày chạy monitor', async () => {
    expect(await run('*/15 * * * *')).toBe(0);
    expect(await run('0 1 * * *')).toBeGreaterThan(0);
  });
});
