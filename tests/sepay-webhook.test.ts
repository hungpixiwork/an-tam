import { describe, expect, it } from 'vitest';
import worker from '../worker/index';
import type { Env } from '../worker/env';
import { accountHash } from '../worker/integrations/sepay/webhook';
import { hashToken } from '../worker/lib/session';
import { hasSqlite, insertUser, openMigratedD1 } from './helpers/sqlite-d1';

const hasDb = await hasSqlite();

describe.skipIf(!hasDb)('POST /api/webhooks/sepay', () => {
  it('sai khóa → 401; gửi trùng referenceCode → bỏ qua, chỉ 1 giao dịch', async () => {
    const t = (await openMigratedD1())!;
    insertUser(t.raw, 'u1');
    t.raw.prepare("INSERT INTO bank_accounts (id, user_id, bank_code, account_masked, account_hash, status) VALUES ('b1', 'u1', 'VCB', '•••• 6789', ?, 'active')").run(await accountHash('0123456789'));
    const env = { DB: t.d1, SEPAY_WEBHOOK_KEY: 'secret-key' } as unknown as Env;
    const payload = { id: 1, gateway: 'Vietcombank', transactionDate: '2026-09-27 10:24:00', accountNumber: '0123456789', content: 'GRAB thanh toan', transferType: 'out', transferAmount: 85000, referenceCode: 'FT001' };
    const send = (key: string) =>
      worker.fetch(new Request('http://localhost/api/webhooks/sepay', { method: 'POST', headers: { Authorization: `Apikey ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }), env);

    expect((await send('wrong')).status).toBe(401);
    expect((await send('secret-key')).status).toBe(201);
    const dup = await send('secret-key');
    expect(dup.status).toBe(200);
    expect(((await dup.json()) as any).data.status).toBe('duplicate');

    const rows = t.raw.prepare("SELECT kind, amount, category, source FROM transactions WHERE user_id = 'u1'").all();
    expect(rows.map((r: object) => ({ ...r }))).toEqual([{ kind: 'expense', amount: 85000, category: 'transport', source: 'sepay' }]);
  });

  it('liên kết: người khác không lấy được tài khoản; xác thực chỉ khi nhận giao dịch có đúng mã', async () => {
    const t = (await openMigratedD1())!;
    const env = { DB: t.d1, SEPAY_WEBHOOK_KEY: 'k' } as unknown as Env;
    const call = (path: string, method: string, cookie: string, body?: object) =>
      worker.fetch(new Request(`http://localhost${path}`, {
        method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: `at_session=${cookie}` } : { Authorization: 'Apikey k' }) }, body: body ? JSON.stringify(body) : undefined,
      }), env);
    for (const u of ['u1', 'u2']) {
      insertUser(t.raw, u);
      t.raw.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(await hashToken(`tok-${u}`), u, '2999-01-01T00:00:00Z');
    }
    const acct = { bankCode: 'VCB', accountNumber: '0123456789' };
    expect((await call('/api/integrations/sepay/link', 'POST', 'tok-u1', acct)).status).toBe(201);
    const taken = await call('/api/integrations/sepay/link', 'POST', 'tok-u2', acct);
    expect(taken.status).toBe(409);
    expect(((await taken.json()) as any).error.code).toBe('account_taken');

    const tx = (ref: string, content: string) => call('/api/webhooks/sepay', 'POST', '', { id: ref, gateway: 'Vietcombank', transactionDate: '2026-09-27 10:00:00', accountNumber: '0123456789', content, transferType: 'in', transferAmount: 2000, referenceCode: ref });
    await tx('FT1', 'chuyen tien');
    const txCount = () => (t.raw.prepare("SELECT COUNT(*) AS n FROM transactions WHERE user_id = 'u1'").get() as { n: number }).n;
    expect(txCount()).toBe(0); // chưa xác thực → chưa ghi vào sổ
    expect((await call('/api/integrations/sepay/verify', 'POST', 'tok-u1')).status).toBe(409);
    const code = (t.raw.prepare("SELECT verify_code FROM bank_accounts WHERE user_id = 'u1'").get() as { verify_code: string }).verify_code;
    expect(code).toMatch(/^AT[A-Z0-9]{6}$/);
    await tx('FT2', `xac thuc ${code.slice(0, 4).toLowerCase()} ${code.slice(4)}`);
    const ok = await call('/api/integrations/sepay/verify', 'POST', 'tok-u1');
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as any).data.status).toBe('active');
    expect(txCount()).toBe(2); // xác thực xong → ghi bù cả 2 giao dịch đã nhận
  });
});
