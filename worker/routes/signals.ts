// Hồ sơ tài chính gộp (Nền 1). Mount: /api/signals
// Thu, chi (cố định / linh hoạt), để dành, tiền dùng được ngay, mức tin cậy — tính khi đọc từ sổ thu chi,
// hóa đơn định kỳ, khoản nợ, tài sản (shared/engine/signals.ts).

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import type { FinancialSignals } from '../../shared/types/api';
import { financialSignals } from '../../shared/engine/signals';
import { ok } from '../lib/http';
import { loadUserState, type LoadedState } from '../lib/state';

/** Tính hồ sơ gộp cho state đã nạp (thêm tổng hóa đơn định kỳ + có ngân hàng đang liên kết). */
export async function loadSignals(db: D1Database, userId: string, state: LoadedState): Promise<FinancialSignals> {
  const [bills, bank] = await db.batch<{ n: number }>([
    db.prepare('SELECT COALESCE(SUM(amount), 0) AS n FROM recurring_bills WHERE user_id = ?').bind(userId),
    db.prepare("SELECT COUNT(*) AS n FROM bank_accounts WHERE user_id = ? AND status = 'active'").bind(userId),
  ]);
  return financialSignals(state, { bills: bills.results[0]?.n ?? 0, bankLinked: (bank.results[0]?.n ?? 0) > 0, sources: state.sources });
}

export const signals = new Hono<AppEnv>().get('/', async (c) => {
  const db = c.env.DB;
  const userId = c.get('userId');
  return ok(c, await loadSignals(db, userId, await loadUserState(db, userId)));
});
