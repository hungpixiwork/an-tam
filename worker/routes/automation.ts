// Quy tắc tự động (Wave 2 · G). Mount: /api/automation-rules
// key: weekly_review | bill_reminder | skill_block | freelance_followup

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';

/** Stub Wave 0 — thay bằng handler thật; giữ nguyên đường dẫn (đã mount trong worker/index.ts). */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

export const automationRules = new Hono<AppEnv>()
  .get('/', todo)
  .get('/:key', todo)
  .put('/:key', todo);
