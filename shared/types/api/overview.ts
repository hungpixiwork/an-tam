// Màn Tổng quan.

import type { AllocationSlice } from '../../engine/portfolio';
import type { PeaceFactor, PeaceLevel } from '../../engine/peace';
import type { NextBestAction } from '../../engine/nba';
import type { SetupStatus } from './common';
import type { CalendarEvent } from './calendar';
import type { PinnedLifeChoice } from './lifeChoices';
import type { TodaySuggestion } from '../../engine/suggestions';
import type { ResourceRings } from '../../engine/resources';

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

  /* ── Màn Tổng quan theo mockup (wave 1) ── */
  /** Đã đủ dữ liệu để tính điểm (có thu chi hoặc tài sản). */
  ready: boolean;
  /** Điểm hôm nay trừ điểm ước tính tháng trước; null = chưa có dữ liệu tháng trước. */
  peaceDelta: number | null;
  safeMonths: { months: number; targetMonths: number; amount: number; ready: boolean };
  cashflow6m: {
    month: string;
    income: number;
    expense: number;
    net: number;
    /** ledger = số ghi sổ tháng này; estimate = số thu chi hằng tháng người dùng nhập; none = chưa có. */
    source: 'ledger' | 'estimate' | 'none';
    months: { month: string; net: number | null }[];
  };
  savingsRateVsPeers: { rate: number | null; peerRate: number | null; ageGroup: string | null };
  todaySuggestions: TodaySuggestion[];
  /** Ngày hôm nay theo giờ Việt Nam 'YYYY-MM-DD'. */
  todayDate: string;
  todayEvents: CalendarEvent[];
  netWorthBreakdown: {
    net: number;
    totalAssets: number;
    cash: number;
    invested: number;
    other: number;
    debt: number;
    /** % thay đổi tài sản ròng so với `compareMonths` tháng trước; null = chưa có số để so. */
    deltaPct: number | null;
    compareMonths: number;
  };
  resourceRings: ResourceRings;
  pinnedLifeChoice: PinnedLifeChoice | null;
}
