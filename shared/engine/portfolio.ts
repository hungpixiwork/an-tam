import type { AssetCategory, Holding, Volatility } from '../types/domain';

/** Giả định dài hạn theo loại tài sản (năm). Nguồn số liệu duy nhất cho mọi phép tính lợi nhuận/biến động. */
export const CATEGORY_ASSUMPTIONS: Record<AssetCategory, { label: string; expectedReturn: number; volatility: number; color: string }> = {
  cash:  { label: 'Tiền mặt',   expectedReturn: 0.045, volatility: 0.005, color: '#3B82F6' },
  fund:  { label: 'Quỹ mở',     expectedReturn: 0.09,  volatility: 0.14,  color: '#1FA37A' },
  stock: { label: 'Cổ phiếu',   expectedReturn: 0.11,  volatility: 0.22,  color: '#F5A524' },
  bond:  { label: 'Trái phiếu', expectedReturn: 0.065, volatility: 0.04,  color: '#8B5CF6' },
  other: { label: 'Khác',       expectedReturn: 0.06,  volatility: 0.12,  color: '#94A3B8' },
};

export const CATEGORY_ORDER: AssetCategory[] = ['cash', 'fund', 'stock', 'bond', 'other'];

/** Trọng số "rủi ro" theo mức biến động — dùng để tính tỷ trọng tài sản biến động. */
const VOLATILITY_WEIGHT: Record<Volatility, number> = { low: 0, mid: 0.5, high: 1 };

/** Hệ số đa dạng hóa: biến động danh mục < tổng biến động có trọng số. */
const DIVERSIFICATION = 0.85;

export interface AllocationSlice {
  category: AssetCategory;
  label: string;
  color: string;
  value: number;
  pct: number; // 0..1
}

export const totalValue = (holdings: Holding[]): number => holdings.reduce((sum, h) => sum + h.value, 0);

export function allocation(holdings: Holding[]): AllocationSlice[] {
  const total = totalValue(holdings) || 1;
  return CATEGORY_ORDER.map((category) => {
    const value = holdings.filter((h) => h.category === category).reduce((s, h) => s + h.value, 0);
    const { label, color } = CATEGORY_ASSUMPTIONS[category];
    return { category, label, color, value, pct: value / total };
  }).filter((slice) => slice.value > 0);
}

export interface PortfolioStats {
  expectedReturn: number; // năm
  volatility: number;     // năm
  riskyShare: number;     // 0..1, theo mức biến động từng khoản
}

export function portfolioStats(holdings: Holding[]): PortfolioStats {
  const total = totalValue(holdings);
  if (total === 0) return { expectedReturn: CATEGORY_ASSUMPTIONS.cash.expectedReturn, volatility: 0, riskyShare: 0 };
  let expectedReturn = 0;
  let volatility = 0;
  let risky = 0;
  for (const h of holdings) {
    const w = h.value / total;
    expectedReturn += w * CATEGORY_ASSUMPTIONS[h.category].expectedReturn;
    volatility += w * CATEGORY_ASSUMPTIONS[h.category].volatility;
    risky += w * VOLATILITY_WEIGHT[h.volatility];
  }
  return { expectedReturn, volatility: volatility * DIVERSIFICATION, riskyShare: risky };
}

/** Tổng giá trị các khoản mang tính đầu tư (quỹ mở + cổ phiếu). */
export const investedValue = (holdings: Holding[]): number =>
  holdings.filter((h) => h.category === 'stock' || h.category === 'fund').reduce((s, h) => s + h.value, 0);
