// Danh mục & rủi ro tập trung — B4.

import type { AssetCategory, Sector } from '../domain';

export type ConcentrationLevel = 'high' | 'mid' | 'low';

export interface SectorExposureItem {
  sector: Sector;
  /** C_s ∈ [0, 1]: phần tổng tài sản (tính cả vốn con người) phụ thuộc ngành s. */
  share: number;
  level: ConcentrationLevel;
}

export interface WhatIfInput {
  assetType: AssetCategory;
  sector: Sector;
  /** VND, số nguyên > 0. */
  amount: number;
  holdingMonths: number;
  /** Lấy tiền từ tiền mặt / quỹ dự phòng (mặc định) hay tiền mới. */
  fundedFrom?: 'cash' | 'new_money';
  /** Ngữ cảnh nghề nghiệp (tùy chọn). */
  humanCapital?: number;
  annualIncome?: number;
  occupationSector?: Sector;
}

export interface WhatIfSnapshot {
  /** Chỉ số tập trung 0..100 (HHI chuẩn hóa theo ngành). */
  concentration: number;
  topSector: SectorExposureItem | null;
  /** C_s của ngành được chọn. */
  sectorShare: number;
  riskyShare: number;
  runwayMonths: number;
  /** Xác suất đạt mục tiêu trung bình 0..1; null nếu không có mục tiêu. */
  goalProbability: number | null;
}

export interface WhatIfResult {
  before: WhatIfSnapshot;
  after: WhatIfSnapshot;
  deltas: { concentration: number; sectorShare: number; runwayMonths: number; goalProbability: number | null };
  projected: { expected: number; worstCase: number };
  explain: string[];
}
