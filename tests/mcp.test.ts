import { describe, expect, it } from 'vitest';
import type { Env } from '../worker/env';
import { MCP_PLAN_ERROR, runTool } from '../worker/mcp/tools';
import { hasSqlite, insertUser, openMigratedD1 } from './helpers/sqlite-d1';

const hasDb = await hasSqlite();

describe.skipIf(!hasDb)('MCP (node:sqlite)', () => {
  it('gói miễn phí bị chặn, không tạo việc chờ duyệt, không trừ lượt', async () => {
    const t = (await openMigratedD1())!;
    insertUser(t.raw, 'u1');
    const env = { DB: t.d1 } as unknown as Env;
    const payload = { month: '2026-10', limitBefore: null, limit: 19_000_000, saving: 500_000, reason: 'test' };
    await expect(runTool(env, { userId: 'u1', clientName: 'Claude' }, 'propose_action', { type: 'budget.set', payload })).rejects.toThrow(MCP_PLAN_ERROR);
    expect(t.raw.prepare('SELECT COUNT(*) AS n FROM agent_actions').get().n).toBe(0);
    expect(t.raw.prepare('SELECT COUNT(*) AS n FROM ai_usage').get().n).toBe(0);
  });
});
