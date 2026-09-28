// /api/plan — gói đang dùng, lượt AI hôm nay, và checkout nâng gói Plus bằng VietQR.

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { PLANS } from '../../shared/plans';
import { vietQrUrl } from '../../shared/engine/split';
import { ok } from '../lib/http';
import { usedToday, userPlan } from '../lib/usage';
import { PLAN_CODE_TTL_MS, newPlanCode } from '../lib/plans';

export const plan = new Hono<AppEnv>()
  .get('/', async (c) => {
    const userId = c.get('userId');
    const [{ plan: key, planUntil }, used] = await Promise.all([userPlan(c.env.DB, userId), usedToday(c.env.DB, userId)]);
    return ok(c, { plan: key, planUntil: key === 'free' ? null : planUntil, usageToday: { ai: used }, limits: PLANS[key] });
  })
  // Tự idempotent: còn mã chờ thanh toán chưa quá hạn thì trả lại đúng mã đó
  .post('/checkout', async (c) => {
    const db = c.env.DB;
    const userId = c.get('userId');
    const amount = PLANS.plus.priceVnd;
    const now = new Date();
    const cutoff = new Date(now.getTime() - PLAN_CODE_TTL_MS).toISOString();
    await db.prepare("UPDATE plan_payments SET status = 'expired' WHERE user_id = ? AND status = 'pending' AND created_at < ?").bind(userId, cutoff).run();
    let row = await db.prepare("SELECT code, amount FROM plan_payments WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1")
      .bind(userId).first<{ code: string; amount: number }>();
    const created = !row;
    if (!row) {
      row = { code: newPlanCode(), amount };
      await db.prepare("INSERT INTO plan_payments (id, user_id, code, amount, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)")
        .bind(crypto.randomUUID(), userId, row.code, amount, now.toISOString()).run();
    }
    const { PLAN_RECEIVER_BANK: bankBin, PLAN_RECEIVER_ACCOUNT: accountNo, PLAN_RECEIVER_NAME: accountName } = c.env;
    // Chưa cấu hình tài khoản nhận → không bịa QR
    const qrUrl = bankBin && accountNo ? vietQrUrl({ bankBin, accountNo, accountName: accountName ?? 'AN TAM' }, row.amount, row.code) : null;
    return ok(c, { code: row.code, amount: row.amount, qrUrl }, created ? 201 : 200);
  });
