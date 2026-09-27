// Hóa đơn & đăng ký định kỳ (Wave 1 · A). Mount: /api/bills

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';

/** Stub Wave 0 — thay bằng handler thật; giữ nguyên đường dẫn (đã mount trong worker/index.ts). */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

export const bills = new Hono<AppEnv>()
  .get('/', todo)
  .post('/', todo)
  .patch('/:id', todo)
  .delete('/:id', todo)
  .post('/:id/paid', todo);
