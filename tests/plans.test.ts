import { describe, expect, it } from 'vitest';
import type { Env } from '../worker/env';
import { classifyIntentLLM } from '../worker/agents/llm';
import { consumeAi } from '../worker/lib/usage';
import { applyPlanPayment } from '../worker/lib/plans';
import { hasSqlite, insertUser, openMigratedD1 } from './helpers/sqlite-d1';

const hasDb = await hasSqlite();

describe.skipIf(!hasDb)('gói & hạn mức AI', () => {
  it('gói miễn phí: hết 10 lượt/ngày → không gọi AI, agent dùng luật', async () => {
    const t = (await openMigratedD1())!;
    insertUser(t.raw, 'u1');
    let calls = 0;
    const env = { DB: t.d1, INTENT_PROVIDER: 'workers-ai', AI: { run: async () => (calls++, { response: '{"intents":["plan_week"]}' }) } } as unknown as Env;
    const now = new Date(); // classifyIntentLLM dùng giờ thật
    for (let i = 0; i < 9; i++) expect((await consumeAi(env, 'u1', 'intent', now)).allowed).toBe(true);
    expect(await classifyIntentLLM(env, 'sắp lịch tuần', 'u1')).toEqual(['plan_week']); // lượt thứ 10
    expect(await classifyIntentLLM(env, 'sắp lịch tuần', 'u1')).toBeNull(); // lượt 11 → luật
    expect(calls).toBe(1);
    expect(await consumeAi(env, 'u1', 'narrate', now)).toEqual({ allowed: false, used: 10, limit: 10 });
  });

  it('chuyển khoản có mã ANTAM… đủ tiền → Gói Plus 30 ngày, gửi lại không cộng thêm', async () => {
    const t = (await openMigratedD1())!;
    insertUser(t.raw, 'u1');
    t.raw.prepare("INSERT INTO plan_payments (id, user_id, code, amount) VALUES ('p1', 'u1', 'ANTAMK7Q2ZX', 49000)").run();
    const env = {} as Env;
    const now = new Date('2026-09-28T00:00:00Z');
    expect(await applyPlanPayment(t.d1, env, 'ANTAMK7Q2ZX', 10000, now)).toBe(false); // thiếu tiền
    expect(await applyPlanPayment(t.d1, env, 'MBVCB.123 nguyen van a chuyen tien antam k7q2zx', 49000, now)).toBe(true);
    expect(await applyPlanPayment(t.d1, env, 'ANTAMK7Q2ZX', 49000, now)).toBe(false);
    expect({ ...t.raw.prepare("SELECT plan, plan_until FROM users WHERE id = 'u1'").get() }).toEqual({ plan: 'plus', plan_until: '2026-10-28T00:00:00.000Z' });
    expect(t.raw.prepare("SELECT status FROM plan_payments WHERE id = 'p1'").get().status).toBe('paid');
  });
});
