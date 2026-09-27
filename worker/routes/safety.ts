// Quỹ an toàn (Wave 1 · B). Mount: /api/safety

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';

/** Stub Wave 0 — thay bằng handler thật; giữ nguyên đường dẫn (đã mount trong worker/index.ts). */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

export const safety = new Hono<AppEnv>()
  .get('/', todo)
  .put('/target', todo);
