import { describe, expect, it } from 'vitest';
import { createRun, executeRun, failRun, loadRunView } from '../worker/agents/runner';
import type { Env } from '../worker/env';
import { hasSqlite, insertUser, openMigratedD1 } from './helpers/sqlite-d1';

const hasDb = await hasSqlite();

describe.skipIf(!hasDb)('D1 canonical khi Agent queue retry/replay', () => {
  it('retry sau commit không tạo trùng action, step hoặc audit', async () => {
    const t = (await openMigratedD1())!;
    insertUser(t.raw);
    const input = { prompt: 'Lập kế hoạch tuần tới' };
    const runId = await createRun(t.d1, 'u1', input);
    const originalBatch = t.d1.batch.bind(t.d1);
    let batches = 0;
    const db = {
      ...t.d1,
      batch: async (statements: D1PreparedStatement[]) => {
        const result = await originalBatch(statements);
        if (++batches === 2) throw new Error('response lost after D1 commit');
        return result;
      },
    } as D1Database;
    const env = { DB: db, INTENT_PROVIDER: 'rules' } as Env;

    await expect(executeRun(env, 'u1', runId, input)).rejects.toThrow('response lost');
    await executeRun(env, 'u1', runId, input);
    const view = await loadRunView(t.d1, 'u1', runId);
    expect(view.status).toBe('awaiting_approval');
    expect(view.actions.length).toBeGreaterThan(0);
    expect(t.raw.prepare('SELECT COUNT(*) AS n FROM agent_actions WHERE run_id = ?').get(runId).n).toBe(view.actions.length);
    expect(t.raw.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE run_id = ? AND action = 'agent.plan'").get(runId).n).toBe(1);
  });

  it('lỗi cuối được ghi một lần; replay không đổi lịch sử', async () => {
    const t = (await openMigratedD1())!;
    insertUser(t.raw);
    const runId = await createRun(t.d1, 'u1', { prompt: 'Lập kế hoạch tuần tới' });
    await failRun({ DB: t.d1 } as Env, 'u1', runId);
    await failRun({ DB: t.d1 } as Env, 'u1', runId);
    const view = await loadRunView(t.d1, 'u1', runId);
    expect(view.status).toBe('failed');
    expect(view.steps.filter((step) => step.kind === 'error')).toHaveLength(1);
    expect(t.raw.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE run_id = ? AND status = 'failed'").get(runId).n).toBe(1);
  });
});
