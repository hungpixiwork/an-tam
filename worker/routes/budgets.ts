// Ngân sách tháng (Wave 1 · A). Mount: /api/budgets

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';

/** Stub Wave 0 — thay bằng handler thật; giữ nguyên đường dẫn (đã mount trong worker/index.ts). */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

export const budgets = new Hono<AppEnv>()
  .get('/:month', todo)
  .put('/:month', todo);
