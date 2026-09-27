// Webhook công khai (Wave 1 · E). Mount: /api/webhooks — TRƯỚC requireAuth; tự xác thực bằng SEPAY_WEBHOOK_KEY
// (timingSafeEqual / hmacSha256Hex trong worker/lib/crypto.ts), chống trùng theo referenceCode.

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';

/** Stub Wave 0 — thay bằng handler thật; giữ nguyên đường dẫn (đã mount trong worker/index.ts). */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

export const webhooks = new Hono<AppEnv>().post('/sepay', todo);
