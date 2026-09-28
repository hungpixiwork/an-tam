// Webhook công khai. Mount: /api/webhooks — TRƯỚC requireAuth; tự xác thực bằng SEPAY_WEBHOOK_KEY
// (Authorization: Apikey <key>, so sánh thời gian hằng), chống trùng theo referenceCode.

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';
import { afterChange } from '../lib/refresh';
import { digitsOnly, handleSepayEvent, sepayAuthorized, sepayPayload } from '../integrations/sepay/webhook';
import { applyPlanPayment } from '../lib/plans';

export const webhooks = new Hono<AppEnv>().post('/sepay', async (c) => {
  if (!sepayAuthorized(c.req.header('Authorization'), c.env.SEPAY_WEBHOOK_KEY)) throw new ApiError(401, 'unauthorized', 'Sai khóa webhook');
  const parsed = sepayPayload.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, 'invalid_input', parsed.error.issues[0]?.message ?? 'Dữ liệu webhook không hợp lệ');
  const p = parsed.data;
  // Tiền nâng gói chuyển vào tài khoản nhận của An Tâm (nội dung có mã ANTAM…) → nâng gói, không ghi vào sổ ai.
  const receiver = digitsOnly(c.env.PLAN_RECEIVER_ACCOUNT ?? '');
  if (receiver && p.transferType === 'in' && digitsOnly(p.accountNumber) === receiver) {
    const paid = await applyPlanPayment(c.env.DB, c.env, `${p.content} ${p.description ?? ''}`, p.transferAmount);
    return c.json({ success: true as const, data: { status: paid ? 'plan_paid' : 'unmatched' } }, 200);
  }
  const result = await handleSepayEvent(c.env, p);
  if (result.status === 'created') {
    await afterChange(c.env.DB, result.userId, { title: 'Nhận giao dịch từ ngân hàng' });
  }
  // SePay chỉ cần HTTP 2xx + success: true để không gửi lại
  return c.json({ success: true as const, data: { status: result.status } }, result.status === 'created' ? 201 : 200);
});
