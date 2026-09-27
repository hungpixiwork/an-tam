// Webhook công khai. Mount: /api/webhooks — TRƯỚC requireAuth; tự xác thực bằng SEPAY_WEBHOOK_KEY
// (Authorization: Apikey <key>, so sánh thời gian hằng), chống trùng theo referenceCode.

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';
import { afterChange } from '../lib/refresh';
import { handleSepayEvent, sepayAuthorized, sepayPayload } from '../integrations/sepay/webhook';

export const webhooks = new Hono<AppEnv>().post('/sepay', async (c) => {
  if (!sepayAuthorized(c.req.header('Authorization'), c.env.SEPAY_WEBHOOK_KEY)) throw new ApiError(401, 'unauthorized', 'Sai khóa webhook');
  const parsed = sepayPayload.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, 'invalid_input', parsed.error.issues[0]?.message ?? 'Dữ liệu webhook không hợp lệ');
  const result = await handleSepayEvent(c.env, parsed.data);
  if (result.status === 'created') {
    await afterChange(c.env.DB, result.userId, { title: 'Nhận giao dịch từ ngân hàng' });
  }
  // SePay chỉ cần HTTP 2xx + success: true để không gửi lại
  return c.json({ success: true as const, data: { status: result.status } }, result.status === 'created' ? 201 : 200);
});
