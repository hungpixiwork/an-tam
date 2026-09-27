// Quy tắc tự động cho Lịch AI. Mount: /api/automation-rules
// key: weekly_review | bill_reminder | skill_block | freelance_followup — engine shared/engine/scheduler.ts đọc cờ enabled.

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { AutomationRule, AutomationRuleKey } from '../../shared/types/api';
import { RULE_KEYS } from '../../shared/engine/scheduler';
import { notFound, ok } from '../lib/http';
import { body } from '../lib/validate';

interface RuleRow { key: AutomationRuleKey; enabled: number; requires_approval: number; last_fired_at: string | null }

const isKey = (k: string): k is AutomationRuleKey => (RULE_KEYS as string[]).includes(k);

async function loadRules(db: D1Database, userId: string): Promise<AutomationRule[]> {
  const { results } = await db.prepare('SELECT key, enabled, requires_approval, last_fired_at FROM automation_rules WHERE user_id = ?').bind(userId).all<RuleRow>();
  return RULE_KEYS.map((key) => {
    const r = results.find((x) => x.key === key);
    return { key, enabled: r?.enabled === 1, requiresApproval: r ? r.requires_approval === 1 : true, lastFiredAt: r?.last_fired_at ?? null };
  });
}

const putSchema = z.object({ enabled: z.boolean() });

export const automationRules = new Hono<AppEnv>()
  .get('/', async (c) => ok(c, await loadRules(c.env.DB, c.get('userId'))))
  .get('/:key', async (c) => {
    const key = c.req.param('key');
    if (!isKey(key)) throw notFound('Không có quy tắc này');
    return ok(c, (await loadRules(c.env.DB, c.get('userId'))).find((r) => r.key === key));
  })
  .put('/:key', body(putSchema), async (c) => {
    const key = c.req.param('key');
    if (!isKey(key)) throw notFound('Không có quy tắc này');
    await c.env.DB.prepare(
      `INSERT INTO automation_rules (user_id, key, enabled) VALUES (?, ?, ?)
       ON CONFLICT (user_id, key) DO UPDATE SET enabled = excluded.enabled`,
    ).bind(c.get('userId'), key, c.req.valid('json').enabled ? 1 : 0).run();
    return ok(c, (await loadRules(c.env.DB, c.get('userId'))).find((r) => r.key === key));
  });
