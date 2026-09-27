// Sổ thu chi (Wave 1 · A): dashboard tháng, chia đều chi phí + VietQR, tài khoản nhận tiền.
// Mount: /api/ledger, /api/settings/payout-account

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';

/** Stub Wave 0 — thay bằng handler thật; giữ nguyên đường dẫn (đã mount trong worker/index.ts). */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

export const ledger = new Hono<AppEnv>()
  .get('/dashboard', todo) // ?month=YYYY-MM
  .post('/split', todo); // → { shares, qrUrls }

/** /api/settings/payout-account — tài khoản nhận VietQR. */
export const payoutAccount = new Hono<AppEnv>().get('/', todo).put('/', todo);
