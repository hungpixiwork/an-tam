// Ứng dụng & tích hợp (Wave 1 · E). Mount: /api/integrations
// provider: google | notion. Redirect OAuth: <APP_ORIGIN>/api/integrations/google/callback

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';

/** Stub Wave 0 — thay bằng handler thật; giữ nguyên đường dẫn (đã mount trong worker/index.ts). */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

export const integrations = new Hono<AppEnv>()
  .get('/', todo)
  .post('/sepay/link', todo)
  .post('/sepay/verify', todo)
  .get('/:provider/connect', todo) // 302 tới trang đồng ý OAuth
  .get('/:provider/callback', todo)
  .post('/:provider/sync', todo)
  .delete('/:provider', todo);
