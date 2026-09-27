// Sổ thu chi + hồ sơ thu / chi.

import type { ProfileSource, TransactionCategory } from '../../engine/ledger';
import type { MonthTotal, Transaction } from '../domain';

/** Con số thu / chi engine đang dùng và nguồn của nó. */
export interface ProfileUsage {
  income: number;
  expense: number;
  incomeSource: ProfileSource;
  expenseSource: ProfileSource;
  ledgerMonths: number;
}

export interface ProfileData {
  baseline: { monthlyIncome: number; monthlyExpense: number; emergencyTargetMonths: number };
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
