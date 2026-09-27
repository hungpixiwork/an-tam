// Sổ thu chi + hồ sơ thu / chi.

import type { ProfileSource, TransactionCategory } from '../../engine/ledger';
import type { MonthTotal, Transaction } from '../domain';
import type { BillState } from '../../engine/bills';
import type { SpendingAdvice } from '../../engine/budget';

export type { BillState, SpendingAdvice };

/** Con số thu / chi engine đang dùng và nguồn của nó. */
export interface ProfileUsage {
  income: number;
  expense: number;
  incomeSource: ProfileSource;
  expenseSource: ProfileSource;
  ledgerMonths: number;
}

export interface ProfileData {
  baseline: { monthlyIncome: number; monthlyExpense: number; emergencyTargetMonths: number; birthYear?: number | null };
  used: ProfileUsage;
}

export interface LedgerData {
  month: string;
  items: Transaction[];
  totals: { income: number; expense: number; net: number };
  byCategory: (Pick<TransactionCategory, 'key' | 'kind' | 'label' | 'icon'> & { amount: number; pct: number })[];
  months: MonthTotal[];
  used: ProfileUsage;
}

/* ───────── Trang Sổ thu chi (GET /api/ledger/dashboard) ───────── */


export interface BudgetInfo {
  month: string;
  limit: number | null;
  spent: number;
  pct: number | null;
  remaining: number | null;
  /** Ngân sách mang sang từ tháng trước (chưa đặt riêng cho tháng này). */
  inherited: boolean;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  category: string;
  dayOfMonth: number;
  autoRenew: boolean;
  icon: string;
  nextDue: string;
  daysLeft: number;
  state: BillState;
  paidThisMonth: boolean;
}

export interface LedgerDashboard {
  month: string;
  today: string;
  /** Tháng này đã có giao dịch nào chưa. */
  hasData: boolean;
  totals: { income: number; expense: number; net: number };
  prevTotals: { income: number; expense: number; net: number };
  deltas: { income: number | null; expense: number | null; net: number | null };
  budget: BudgetInfo;
  months: { month: string; income: number; expense: number; net: number }[];
  categories: { key: string; amount: number; pct: number }[];
  advice: SpendingAdvice;
  recent: Transaction[];
  bills: Bill[];
  payoutConfigured: boolean;
}

export interface PayoutAccountData { bankBin: string; accountNo: string; accountName: string; bankName: string }

export interface SplitResult {
  id: string;
  title: string;
  total: number;
  shares: { name: string; amount: number; isMe: boolean; qrUrl: string | null }[];
  payoutConfigured: boolean;
}
