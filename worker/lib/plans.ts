// Nâng gói Plus: tạo mã chuyển khoản ANTAMxxxxxx (checkout) và áp dụng khi SePay báo tiền về (applyPlanPayment).

import type { Env } from '../env';
import { PLANS, PLAN_PERIOD_DAYS } from '../../shared/plans';
import { batchWithAudit } from './audit';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ I, O, 0, 1 cho dễ đọc
/** Mã chờ thanh toán quá hạn này thì coi như hết hạn, checkout tạo mã mới. */
export const PLAN_CODE_TTL_MS = 3 * 24 * 3_600_000;

export function newPlanCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `ANTAM${Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('')}`;
}

/** Hạn mới = max(bây giờ, hạn cũ) + 30 ngày. */
export function extendPlanUntil(current: string | null, now: Date = new Date()): string {
  const base = Math.max(now.getTime(), current ? Date.parse(current) || 0 : 0);
  return new Date(base + PLAN_PERIOD_DAYS * 86_400_000).toISOString();
}

/**
 * Tìm mã ANTAM… đang chờ trong nội dung chuyển khoản; đủ tiền → nâng gói Plus (gia hạn 30 ngày),
 * đánh dấu đã trả và ghi audit_log. Trả về true nếu đã áp dụng. Gọi lại với cùng mã → false (không cộng 2 lần).
 */
export async function applyPlanPayment(db: D1Database, env: Pick<Env, 'AUDIT_HASH_SALT'>, content: string, amount: number, now: Date = new Date()): Promise<boolean> {
  const code = content.toUpperCase().replace(/[^A-Z0-9]/g, ' ').match(/ANTAM\s?([A-Z0-9]{6})/)?.[1];
  if (!code) return false;
  const pay = await db.prepare("SELECT id, user_id, amount FROM plan_payments WHERE code = ? AND status = 'pending'")
    .bind(`ANTAM${code}`).first<{ id: string; user_id: string; amount: number }>();
  if (!pay || amount < Math.max(pay.amount, PLANS.plus.priceVnd)) return false;
  const user = await db.prepare('SELECT plan, plan_until FROM users WHERE id = ?').bind(pay.user_id).first<{ plan: string; plan_until: string | null }>();
  if (!user) return false;
  const until = extendPlanUntil(user.plan_until, now);
  const at = now.toISOString();
  const res = await batchWithAudit(
    db,
    [
      // Điều kiện "còn pending" nằm trong cùng transaction → hai webhook trùng không gia hạn 2 lần
      db.prepare(
        `UPDATE users SET plan = CASE WHEN plan = 'bank' THEN plan ELSE 'plus' END, plan_until = ?
         WHERE id = ? AND EXISTS (SELECT 1 FROM plan_payments WHERE id = ? AND status = 'pending')`,
      ).bind(until, pay.user_id, pay.id),
      db.prepare("UPDATE plan_payments SET status = 'paid', paid_at = ? WHERE id = ? AND status = 'pending'").bind(at, pay.id),
    ],
    {
      userId: pay.user_id, actor: 'webhook', agent: 'billing', action: 'plan.upgrade', entityType: 'plan_payment', entityId: pay.id,
      summaryMasked: `Nâng lên Gói Plus ${PLAN_PERIOD_DAYS} ngày qua chuyển khoản`, dataLabel: 'Thanh toán gói dịch vụ', status: 'completed',
    },
    { salt: env.AUDIT_HASH_SALT },
  );
  return (res[1]?.meta?.changes ?? 0) > 0;
}
