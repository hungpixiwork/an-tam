import { describe, expect, it } from 'vitest';
import { approveAndExecute, undoAction } from '../worker/agents/executor';
import { previewAction } from '../shared/agent/actions';
import type { Env } from '../worker/env';
import { hasSqlite, insertUser, openMigratedD1 } from './helpers/sqlite-d1';

const hasDb = await hasSqlite();

describe.skipIf(!hasDb)('hành động 1 chạm + hoàn tác', () => {
  it('đặt quỹ dự phòng rồi hoàn tác trả về đúng số cũ, không hoàn tác được 2 lần', async () => {
    const t = (await openMigratedD1())!;
    insertUser(t.raw);
    t.raw.prepare("INSERT INTO financial_profiles (user_id, monthly_income, monthly_expense, emergency_target_months) VALUES ('u1', 28500000, 21000000, 6)").run();
    t.raw.prepare(
      "INSERT INTO goals (id, user_id, kind, title, target_amount, current_amount, target_month, monthly_contribution, priority) VALUES ('g1', 'u1', 'emergency', 'Quỹ dự phòng', 120000000, 84000000, '2027-03', 4000000, 1)",
    ).run();
    const payload = {
      months: 12, monthsBefore: 6, goalId: 'g1', targetAmount: 252_000_000, targetBefore: 120_000_000,
      monthly: 7_000_000, monthlyBefore: 4_000_000, targetMonth: '2028-09', targetMonthBefore: '2027-03', reason: 'test',
    };
    t.raw.prepare(
      `INSERT INTO agent_actions (id, user_id, source, agent, type, title, payload_json, preview_json, integration, risk, status, requires_approval, expires_at)
       VALUES ('a1', 'u1', 'user', 'goal', 'safety.set_target', 'Quỹ 12 tháng', ?, ?, 'local', 'mid', 'pending', 0, '2999-01-01T00:00:00Z')`,
    ).run(JSON.stringify(payload), JSON.stringify(previewAction('safety.set_target', payload)));
    const env = { DB: t.d1 } as Env;

    expect((await approveAndExecute(env, 'u1', 'a1')).status).toBe('done');
    expect(t.raw.prepare("SELECT target_amount, monthly_contribution FROM goals WHERE id = 'g1'").get()).toEqual({ target_amount: 252_000_000, monthly_contribution: 7_000_000 });

    await undoAction(env, 'u1', 'a1');
    expect(t.raw.prepare("SELECT target_amount, monthly_contribution, target_month FROM goals WHERE id = 'g1'").get())
      .toEqual({ target_amount: 120_000_000, monthly_contribution: 4_000_000, target_month: '2027-03' });
    expect(t.raw.prepare("SELECT emergency_target_months AS m FROM financial_profiles WHERE user_id = 'u1'").get().m).toBe(6);
    await expect(undoAction(env, 'u1', 'a1')).rejects.toThrow();
  });
});
