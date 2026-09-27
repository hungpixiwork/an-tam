import { describe, expect, it } from 'vitest';
import worker from '../worker/index';
import type { Env } from '../worker/env';
import { accountHash } from '../worker/integrations/sepay/webhook';
import { hasSqlite, insertUser, openMigratedD1 } from './helpers/sqlite-d1';

const hasDb = await hasSqlite();

describe.skipIf(!hasDb)('POST /api/webhooks/sepay', () => {
  it('sai khóa → 401; gửi trùng referenceCode → bỏ qua, chỉ 1 giao dịch', async () => {
    const t = (await openMigratedD1())!;
    insertUser(t.raw, 'u1');
    t.raw.prepare("INSERT INTO bank_accounts (id, user_id, bank_code, account_masked, account_hash) VALUES ('b1', 'u1', 'VCB', '•••• 6789', ?)").run(await accountHash('0123456789'));
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
});
