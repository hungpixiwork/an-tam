// Ngân sách tháng. Mount: /api/budgets
// Tháng chưa đặt riêng → dùng ngân sách gần nhất trước đó (tự mang sang tháng sau).

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { BudgetInfo } from '../../shared/types/api';
import { budgetStatus } from '../../shared/engine/budget';
import { addMonths } from '../../shared/engine/month';
import { formatMonth, formatVndFull } from '../../shared/format';
import { ApiError, ok } from '../lib/http';
import { auditUserWrite } from '../lib/audit';
import { afterChange } from '../lib/refresh';
import { body, money, monthString } from '../lib/validate';

/** Giới hạn ngân sách (tổng chi) đang áp dụng cho tháng. */
export async function loadBudgetLimit(db: D1Database, userId: string, month: string): Promise<{ limit: number | null; inherited: boolean }> {
  const row = await db
    .prepare("SELECT month, limit_amount FROM budgets WHERE user_id = ? AND category = 'all' AND month <= ? ORDER BY month DESC LIMIT 1")
    .bind(userId, month)
    .first<{ month: string; limit_amount: number }>();
  return row ? { limit: row.limit_amount, inherited: row.month !== month } : { limit: null, inherited: false };
}

export async function loadBudget(db: D1Database, userId: string, month: string): Promise<BudgetInfo> {
  const [{ limit, inherited }, spent] = await Promise.all([
    loadBudgetLimit(db, userId, month),
    db
      .prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM transactions WHERE user_id = ? AND kind = 'expense' AND occurred_on >= ? AND occurred_on < ?")
      .bind(userId, `${month}-01`, `${addMonths(month, 1)}-01`)
      .first<{ s: number }>(),
  ]);
  return { month, inherited, ...budgetStatus(limit, spent?.s ?? 0) };
}

const parseMonth = (m: string) => {
  if (!monthString.safeParse(m).success) throw new ApiError(400, 'invalid_input', 'Tháng không hợp lệ (YYYY-MM)');
  return m;
};

export const budgets = new Hono<AppEnv>()
  .get('/:month', async (c) => ok(c, await loadBudget(c.env.DB, c.get('userId'), parseMonth(c.req.param('month')))))
  .put('/:month', body(z.object({ limit: money.positive('Ngân sách phải lớn hơn 0') })), async (c) => {
    const userId = c.get('userId');
    const month = parseMonth(c.req.param('month'));
    const { limit } = c.req.valid('json');
    await c.env.DB.prepare(
      "INSERT INTO budgets (user_id, month, category, limit_amount) VALUES (?, ?, 'all', ?) ON CONFLICT (user_id, month, category) DO UPDATE SET limit_amount = excluded.limit_amount, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
    )
      .bind(userId, month, limit)
      .run();
    await afterChange(c.env.DB, userId, { title: 'Đặt ngân sách tháng', detail: `${formatMonth(month)}: ngân sách chi ${formatVndFull(limit)}.` });
    await auditUserWrite(c.env, userId, { agent: 'cashflow', action: 'budget.set', entityType: 'budget', entityId: month, summary: 'Đặt ngân sách chi tiêu tháng', dataLabel: 'Thu nhập, chi tiêu (đã ẩn danh)' });
    return ok(c, await loadBudget(c.env.DB, userId, month));
  });
