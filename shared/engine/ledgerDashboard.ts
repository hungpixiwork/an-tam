// Centralized Derived Data builder cho Sổ Thu Chi & Dashboard Dòng tiền.
// Đảm bảo tính toán đồng nhất giữa Client Local-first & Backend API.

import type { Bill, BudgetInfo, LedgerDashboard } from '../types/api/ledger';
import type { Transaction } from '../types/domain';
import { budgetStatus, categoryBreakdown, momDeltas, spendingAdvice, totalsOf } from './budget';
import { billStatus } from './bills';
import { addMonths, vnDate } from './month';

export const CHART_MONTHS_COUNT = 6;
export const RECENT_TX_COUNT = 5;

export interface BuildLedgerDashboardOptions {
  month?: string;
  today?: string;
  budgetLimit?: number | null;
  inheritedBudget?: boolean;
  bills?: (Omit<Bill, 'nextDue' | 'daysLeft' | 'state' | 'paidThisMonth'> & {
    nextDue?: string;
    daysLeft?: number;
    state?: Bill['state'];
    paidThisMonth?: boolean;
  })[];
  payoutConfigured?: boolean;
}

/**
 * Xây dựng dữ liệu đầy đủ cho Dashboard Sổ Thu Chi từ danh sách giao dịch & thiết lập.
 */
export function buildLedgerDashboard(
  transactions: Transaction[],
  opts: BuildLedgerDashboardOptions = {},
): LedgerDashboard {
  const today = opts.today || vnDate();
  const month = opts.month || today.slice(0, 7);
  const from = addMonths(month, -(CHART_MONTHS_COUNT - 1));

  // Lọc giao dịch theo tháng
  const inMonth = (m: string) => transactions.filter((t) => t.occurredOn.startsWith(m));
  const cur = inMonth(month);
  const prevMonth = addMonths(month, -1);
  const prev = inMonth(prevMonth);

  const totals = totalsOf(cur);
  const prevTotals = totalsOf(prev);
  const deltas = momDeltas(totals, prevTotals);

  // 6 tháng dòng tiền lịch sử
  const months = Array.from({ length: CHART_MONTHS_COUNT }, (_, i) => {
    const m = addMonths(from, i);
    return { month: m, ...totalsOf(inMonth(m)) };
  });

  // Ngân sách
  const rawBudget = budgetStatus(opts.budgetLimit ?? null, totals.expense);
  const budget: BudgetInfo = {
    month,
    limit: rawBudget.limit,
    spent: rawBudget.spent,
    pct: rawBudget.pct,
    remaining: rawBudget.remaining,
    inherited: opts.inheritedBudget ?? false,
  };

  // Danh mục chi tiêu
  const categories = categoryBreakdown(cur);

  // Gợi ý chi tiêu AI
  const advice = spendingAdvice(cur);

  // Giao dịch gần đây (sắp xếp giảm dần theo ngày rồi id)
  const recent = [...transactions]
    .filter((t) => t.occurredOn <= today)
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, RECENT_TX_COUNT);

  // Trạng thái hóa đơn
  const bills: Bill[] = (opts.bills || []).map((b) => {
    const status = billStatus(b, today, b.paidThisMonth ?? false);
    return {
      id: b.id,
      name: b.name,
      amount: b.amount,
      category: b.category,
      dayOfMonth: b.dayOfMonth,
      autoRenew: b.autoRenew,
      icon: b.icon,
      nextDue: status.nextDue,
      daysLeft: status.daysLeft,
      state: status.state,
      paidThisMonth: status.paidThisMonth,
    };
  });

  return {
    month,
    today,
    hasData: cur.length > 0,
    totals,
    prevTotals,
    deltas,
    budget,
    months,
    categories,
    advice,
    recent,
    bills,
    payoutConfigured: opts.payoutConfigured ?? false,
  };
}
