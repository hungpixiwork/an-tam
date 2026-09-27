import { beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../worker/env';
import { ApiError } from '../worker/lib/http';
import { idempotent } from '../worker/lib/idempotency';
import { hasSqlite, insertUser, openMigratedD1, type TestD1 } from './helpers/sqlite-d1';

const hasDb = await hasSqlite();

describe.skipIf(!hasDb)('idempotent() middleware (node:sqlite)', () => {
  let t: TestD1;
  let calls: number;
  let gate: Promise<void> | null;
  let failNext: boolean;

  const app = new Hono<AppEnv>();
  app.onError((err, c) => {
    if (err instanceof ApiError) return c.json({ success: false, error: { code: err.code, message: err.message } }, err.status);
    return c.json({ success: false, error: { code: 'internal', message: 'x' } }, 500);
  });
  app.use('*', async (c, next) => {
    c.set('userId', 'u1');
    await next();
  });
  app.post('/approve/:id', idempotent(), async (c) => {
    calls++;
    if (gate) await gate;
    if (failNext) {
      failNext = false;
      throw new Error('boom');
    }
    return c.json({ success: true, data: { id: c.req.param('id'), n: calls } }, 201);
  });

  const call = (key: string | null, body = '{"a":1}', id = 'x1') =>
    app.request(
      `/approve/${id}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, body },
      { DB: t.d1 },
    );

  beforeEach(async () => {
    t = (await openMigratedD1())!;
    insertUser(t.raw, 'u1');
    calls = 0;
    gate = null;
    failNext = false;
  });

  it('thiếu header → 400, khóa sai định dạng → 400', async () => {
    const res = await call(null);
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error.code).toBe('idempotency_key_required');
    expect((await call('short')).status).toBe(400);
    expect(calls).toBe(0);
  });

  it('bấm 2 lần cùng khóa → handler chạy 1 lần, lần 2 trả lại đúng response', async () => {
    const first = await call('key-00000001');
    expect(first.status).toBe(201);
    const body1 = await first.text();
    const second = await call('key-00000001');
    expect(second.status).toBe(201);
    expect(second.headers.get('Idempotent-Replayed')).toBe('true');
    expect(await second.text()).toBe(body1);
    expect(calls).toBe(1);
    const row = t.raw.prepare('SELECT status, status_code FROM idempotency_keys').get();
    expect({ ...row }).toEqual({ status: 'done', status_code: 201 });
  });

  it('khóa khác → chạy lại; cùng khóa khác body / khác đường dẫn → 422', async () => {
    await call('key-00000001');
    await call('key-00000002');
    expect(calls).toBe(2);
    expect((await call('key-00000001', '{"a":2}')).status).toBe(422);
    expect((await call('key-00000001', '{"a":1}', 'x2')).status).toBe(422);
    expect(calls).toBe(2);
  });

  it('request đầu đang chạy → request trùng nhận 409', async () => {
    let open!: () => void;
    gate = new Promise<void>((r) => (open = r));
    const pending = call('key-00000003');
    await new Promise((r) => setTimeout(r, 10));
    const dup = await call('key-00000003');
    expect(dup.status).toBe(409);
    expect(((await dup.json()) as any).error.code).toBe('idempotency_in_progress');
    open();
    expect((await pending).status).toBe(201);
    expect(calls).toBe(1);
  });

  it('handler lỗi → nhả khóa, thử lại cùng khóa chạy được', async () => {
    failNext = true;
    expect((await call('key-00000004')).status).toBe(500);
    expect(t.raw.prepare('SELECT COUNT(*) AS n FROM idempotency_keys').get().n).toBe(0);
    expect((await call('key-00000004')).status).toBe(201);
    expect(calls).toBe(2);
  });

  it('khóa hết hạn (> 24h) được dùng lại', async () => {
    await call('key-00000005');
    t.raw.prepare("UPDATE idempotency_keys SET expires_at = '2000-01-01T00:00:00.000Z'").run();
    const res = await call('key-00000005', '{"b":1}');
    expect(res.status).toBe(201);
    expect(res.headers.get('Idempotent-Replayed')).toBeNull();
    expect(calls).toBe(2);
  });
});
