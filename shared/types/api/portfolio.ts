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
  /** Tài sản đa ngành (quỹ ETF toàn cầu): chia đều cho mọi ngành khi tính mức phụ thuộc. */
  diversified?: boolean;
}

export interface WhatIfSnapshot {
  /** Mức độ rủi ro tập trung 0..100 (0 = chia đều mọi ngành, 100 = dồn hết vào một ngành). */
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
  /** Gợi ý ngắn, dễ hiểu cho người dùng. */
  advice: string;
  /** Phần tiền lấy từ tiền chờ đầu tư / quỹ dự phòng. */
  funding: { fromPortfolioCash: number; fromEmergency: number; newMoney: number };
}

/** Các lựa chọn "Loại tài sản" của form Thử trước khi đầu tư. */
export type WhatIfPresetKey = 'global_etf' | 'vn_etf' | 'tech_stock' | 'bond' | 'gold' | 'real_estate';

export interface PortfolioRisk {
  netWorth: { net: number; deltaPct: number | null; compareMonths: number; totalAssets: number; invested: number; other: number; debt: number };
  /** Cơ cấu danh mục đầu tư theo loại (chỉ các khoản thuộc danh mục). */
  allocation: { category: AssetCategory; value: number; pct: number }[];
  /** Cổ phiếu công ty mình: giá trị + tỷ trọng trên danh mục đầu tư. */
  employer: { value: number; share: number; level: ConcentrationLevel };
  /** Ngành nghề hiện tại (hồ sơ thu nhập); null = chưa khai báo. */
  careerSector: Sector | null;
  /** Thu nhập tính vào mức phụ thuộc ngành (thu nhập năm × số năm). */
  careerValue: number;
  /** Mức phụ thuộc theo ngành, tính cả thu nhập từ công việc + tài sản đầu tư. */
  exposure: SectorExposureItem[];
  /** Phần danh mục đầu tư nằm trong ngành lớn nhất (không tính thu nhập). */
  topSectorAssetShare: number;
  score: number;
  level: ConcentrationLevel;
}
