// Chia tiền để dành cho mục tiêu + danh mục đề xuất. Mount: /api/allocation

import type { AssetCategory } from '../domain';

/** 'du' = đủ số cần · 'thieu' = chưa đủ · 'du_du' = mục tiêu đã đủ / không cần góp thêm. */
export type SavingsStatus = 'du' | 'thieu' | 'du_du';
export type SavingsItemKind = 'emergency' | 'debt' | 'goal';

export interface SavingsItem {
  kind: SavingsItemKind;
  /** Mục tiêu tương ứng (null = quỹ dự phòng chưa tạo mục tiêu, hoặc khoản nợ). */
  goalId: string | null;
  /** Khoản nợ (kind = 'debt'). */
  liabilityId?: string | null;
  title: string;
  icon?: string | null;
  /** Số cần để dành mỗi tháng để kịp hạn. */
  required: number;
  /** Số đề xuất trong kế hoạch. */
  suggested: number;
  /** Số đang để dành hiện tại. */
  current: number;
  status: SavingsStatus;
  /** Khả năng đạt đúng hạn 0..1 (null với khoản nợ). */
  probabilityBefore: number | null;
  probabilityAfter: number | null;
  /** Tháng dự kiến xong 'YYYY-MM' (null = quá 50 năm). */
  completionBefore: string | null;
  completionAfter: string | null;
}

/** Cách bù phần thiếu: dời hạn N tháng hoặc để dành thêm X đ/tháng. */
export interface SavingsFix {
  goalId: string | null;
  title: string;
  extraMonthly: number;
  /** Số tháng phải dời hạn nếu giữ mức đề xuất (null = khó đạt trong 50 năm). */
  delayMonths: number | null;
}

export interface SavingsPlan {
  /** Tiền dư mỗi tháng = thu nhập − chi tiêu. */
  capacity: number;
  items: SavingsItem[];
  /** Tổng đề xuất (≤ capacity). */
  allocated: number;
  /** Phần còn dư sau khi đủ mọi mục tiêu. */
  unallocated: number;
  /** Tổng còn thiếu so với số cần. */
  shortfall: number;
  fixes: SavingsFix[];
}

export type MixShares = Record<AssetCategory, number>;

export interface TargetPortfolio {
  /** Tổng danh mục đầu tư dùng để tính (VND). */
  base: number;
  current: MixShares;
  target: MixShares;
  /** Tỷ trọng tài sản biến động (cổ phiếu + quỹ) khuyến nghị. */
  riskyShare: number;
  /** Mục tiêu lớn gần nhất quyết định khẩu vị rủi ro. */
  horizonGoal: { title: string; months: number } | null;
  /** Tiền mặt giữ lại cho quỹ dự phòng còn thiếu. */
  emergencyCash: number;
  /** Giới hạn cổ phiếu công ty mình (VND). */
  employerCap: number;
  employerValue: number;
}

export type RebalanceReason = 'employer_cap' | 'too_risky' | 'more_growth' | 'emergency_cash' | 'balance';

export interface RebalanceStep {
  from: AssetCategory;
  to: AssetCategory;
  amount: number;
  /** Bán từ cổ phiếu công ty mình. */
  fromEmployer: boolean;
  reason: RebalanceReason;
}

export interface AllocationData {
  savingsPlan: SavingsPlan;
  targetPortfolio: TargetPortfolio;
  rebalanceSteps: RebalanceStep[];
}

export interface AllocationApplyResult {
  updated: number;
}
