// Màn Tổng quan.

import type { AllocationSlice } from '../../engine/portfolio';
import type { PeaceFactor, PeaceLevel } from '../../engine/peace';
import type { NextBestAction } from '../../engine/nba';
import type { SetupStatus } from './common';

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
