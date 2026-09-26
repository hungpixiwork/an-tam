// Hợp đồng request / response giữa client và worker.

import type { AllocationSlice } from '../engine/portfolio';
import type { PeaceFactor, PeaceLevel } from '../engine/peace';
import type { ProfileSource, TransactionCategory } from '../engine/ledger';
import type { AlertSeverity } from '../engine/alerts';
import type { MonthTotal, Salutation, Transaction } from './domain';
import type { NextBestAction } from '../engine/nba';

export interface ApiOk<T> { success: true; data: T }
export interface ApiErr { success: false; error: { code: string; message: string } }
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export interface Me {
  id: string;
  email: string;
  fullName: string;
  salutation: Salutation;
  avatarSeed: number;
  memberStatus: string;
  /** Đã hoàn tất màn "Bắt đầu" (nhập hoặc bỏ qua). */
  onboarded: boolean;
  lifeStage?: string;
}

export interface Kpi {
  value: number;
  previous: number | null;
  /** Thay đổi tương đối so với kỳ so sánh (0.06 = +6%); null nếu không có dữ liệu. */
  deltaPct: number | null;
  compareLabel: string;
}

export interface OverviewData {
  nba: NextBestAction[];
  greeting: {
    title: string;       // "Chào anh Minh,"
    headline: string;    // có thể chứa {em:...}
    sub: string;         // có thể chứa \n
  };
  peace: {
    score: number;
    level: PeaceLevel;
    label: string;
    description: string;
    factors: PeaceFactor[];
  };
  kpis: {
    netWorth: Kpi;
    emergency: Kpi;
    invested: Kpi;
    cashflow: Kpi & { trend: 'better' | 'worse' | 'same' };
  };
  netWorthSeries: { month: string; label: string; total: number }[];
  allocation: { total: number; slices: AllocationSlice[] };
  tip: {
    text: string;
    goalTitle: string | null;
    delayMonths: number;
    presetSlug: string;
  };
  openAlerts: number;
  /** Người dùng đã nhập những phần nào — màn hiển thị gợi ý nhập tiếp cho phần còn thiếu. */
  setup: SetupStatus;
}

export interface SetupStatus {
  profile: boolean;
  holdings: boolean;
  goals: boolean;
  transactions: boolean;
}

export interface NotificationItem {
  id: string;
  severity: 'danger' | 'warning' | 'action';
  title: string;
  createdAt: string;
}

export interface SearchResult {
  type: 'page' | 'goal' | 'lesson';
  title: string;
  subtitle: string;
  to: string;
}

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

export interface OnboardingResult {
  me: Me;
  peace: { score: number; label: string; level: PeaceLevel };
  alerts: { severity: AlertSeverity; title: string }[];
  setup: SetupStatus;
}
