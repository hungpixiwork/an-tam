// Hợp đồng request / response giữa client và worker.

import type { AllocationSlice } from '../engine/portfolio';
import type { PeaceFactor, PeaceLevel } from '../engine/peace';
import type { Salutation } from './domain';

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
  isDemoData: boolean;
}

export interface Kpi {
  value: number;
  previous: number | null;
  /** Thay đổi tương đối so với kỳ so sánh (0.06 = +6%); null nếu không có dữ liệu. */
  deltaPct: number | null;
  compareLabel: string;
}

export interface OverviewData {
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
