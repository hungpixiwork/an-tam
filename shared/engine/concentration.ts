// B4 — rủi ro tập trung theo ngành, tính cả vốn con người (ba.md §5.2, breakthroughs.md §B4).
//   C_s = (β_nghề,s · HC + Tài sản thuộc ngành s) / (HC + Tổng tài sản tài chính)
// Chữ ký đã chốt ở Wave 0; Wave 1 · D tinh chỉnh (bảng β theo nghề, cảnh báo, giải thích).

import type { AssetCategory, Holding, Sector, UserState, Volatility } from '../types/domain';
import type { ConcentrationLevel, SectorExposureItem, WhatIfInput, WhatIfResult, WhatIfSnapshot } from '../types/api';
import { CATEGORY_ASSUMPTIONS, portfolioStats, totalValue } from './portfolio';
import { emergencyAmount } from './peace';
import { goalProbability } from './goals';

export const SECTORS: Sector[] = ['technology', 'finance', 'real_estate', 'manufacturing', 'consumer', 'healthcare', 'education_public', 'other'];

export const SECTOR_LABELS: Record<Sector, string> = {
  technology: 'Công nghệ',
  finance: 'Tài chính',
  real_estate: 'Bất động sản',
  manufacturing: 'Sản xuất',
  consumer: 'Tiêu dùng',
  healthcare: 'Y tế',
  education_public: 'Giáo dục & công',
  other: 'Khác',
};

/** Ngưỡng cảnh báo C_s: vàng > 40%, cam > 60%. */
export const SECTOR_WARN = 0.4;
export const SECTOR_HIGH = 0.6;

/** Khi chỉ có thu nhập năm, ước tính HC ≈ thu nhập năm × hệ số này (ƯỚC TÍNH — Wave 1 dùng humanCapital()). */
export const HC_INCOME_MULTIPLE = 10;

const VOLATILITY_BY_CATEGORY: Record<AssetCategory, Volatility> = { cash: 'low', bond: 'low', fund: 'mid', stock: 'high', other: 'mid' };

const positive = (weights: number[]) => weights.filter((w) => Number.isFinite(w) && w > 0);

/** Herfindahl–Hirschman: Σ wᵢ² sau khi chuẩn hóa tổng = 1. Trả về 0..1 (0 nếu rỗng). */
export function hhi(weights: number[]): number {
  const w = positive(weights);
  const sum = w.reduce((s, x) => s + x, 0);
  if (sum === 0) return 0;
  return w.reduce((s, x) => s + (x / sum) ** 2, 0);
}

/** HHI chuẩn hóa (H − 1/N) / (1 − 1/N) quy về 0..100. Một khoản duy nhất = 100, chia đều = 0. */
export function concentrationIndex(weights: number[]): number {
  const n = positive(weights).length;
  if (n === 0) return 0;
  if (n === 1) return 100;
  const h = hhi(weights);
  return Math.round(Math.min(1, Math.max(0, (h - 1 / n) / (1 - 1 / n))) * 100);
}

/** Tỷ trọng cổ phiếu công ty mình (0..1) trên tổng tài sản tài chính. */
export function employerStockWeight(holdings: Holding[]): number {
  const total = totalValue(holdings);
  if (total === 0) return 0;
  return holdings.filter((h) => h.isEmployerStock).reduce((s, h) => s + h.value, 0) / total;
}

export const concentrationLevel = (share: number): ConcentrationLevel => (share > SECTOR_HIGH ? 'high' : share > SECTOR_WARN ? 'mid' : 'low');

/** Ngành của một khoản: cổ phiếu thưởng có β = 1 với ngành nghề hiện tại. */
const holdingSector = (h: Holding, occupationSector?: Sector): Sector =>
  h.isEmployerStock && occupationSector ? occupationSector : (h.sector ?? 'other');

export interface SectorExposureInput {
  holdings: Holding[];
  annualIncome?: number;
  humanCapital?: number;
  occupationSector?: Sector;
}

/**
 * C_s cho mọi ngành có tỷ trọng > 0, giảm dần. β_nghề,s = 1 với ngành nghề, 0 với ngành khác
 * (TODO Wave 1 · D: bảng β theo nghề, người dùng chỉnh được).
 */
export function sectorExposure(input: SectorExposureInput): SectorExposureItem[] {
  const { holdings, occupationSector } = input;
  const hc = occupationSector ? Math.max(0, input.humanCapital ?? (input.annualIncome ?? 0) * HC_INCOME_MULTIPLE) : 0;
  const assets = totalValue(holdings);
  const denom = hc + assets;
  if (denom <= 0) return [];
  const bySector = new Map<Sector, number>();
  for (const h of holdings) bySector.set(holdingSector(h, occupationSector), (bySector.get(holdingSector(h, occupationSector)) ?? 0) + h.value);
  if (occupationSector) bySector.set(occupationSector, (bySector.get(occupationSector) ?? 0) + hc);
  return SECTORS.map((sector) => {
    const share = Math.min(1, Math.max(0, (bySector.get(sector) ?? 0) / denom));
    return { sector, share, level: concentrationLevel(share) };
  })
    .filter((x) => x.share > 0)
    .sort((a, b) => b.share - a.share);
}

const round1 = (x: number) => Math.round(x * 10) / 10;

function snapshot(state: UserState, holdings: Holding[], emergency: number, input: WhatIfInput): WhatIfSnapshot {
  const exposure = sectorExposure({ holdings, humanCapital: input.humanCapital, annualIncome: input.annualIncome, occupationSector: input.occupationSector });
  const s = { ...state, holdings };
  const goals = state.goals.filter((g) => g.kind !== 'emergency');
  return {
    concentration: concentrationIndex(exposure.map((e) => e.share)),
    topSector: exposure[0] ?? null,
    sectorShare: exposure.find((e) => e.sector === input.sector)?.share ?? 0,
    riskyShare: portfolioStats(holdings).riskyShare,
    runwayMonths: state.profile.monthlyExpense > 0 ? round1(emergency / state.profile.monthlyExpense) : 0,
    goalProbability: goals.length ? goals.reduce((sum, g) => sum + goalProbability(g, s), 0) / goals.length : null,
  };
}

/**
 * "Thử trước khi xuống tiền": bỏ thêm `amount` vào (assetType × sector) trong `holdingMonths` tháng.
 * Mặc định tiền lấy từ tiền mặt → quỹ dự phòng giảm tương ứng. Chỉ ở mức nhóm ngành × loại tài sản.
 */
export function whatIfAllocate(state: UserState, input: WhatIfInput): WhatIfResult {
  const amount = Math.max(0, Math.round(input.amount));
  const fromCash = (input.fundedFrom ?? 'cash') === 'cash';

  // Rút từ các khoản tiền mặt theo tỷ lệ
  const cashTotal = state.holdings.filter((h) => h.category === 'cash').reduce((s, h) => s + h.value, 0);
  const drawn = fromCash ? Math.min(amount, cashTotal) : 0;
  const after: Holding[] = state.holdings.map((h) =>
    h.category === 'cash' && drawn > 0 && cashTotal > 0 ? { ...h, value: Math.round(h.value - (drawn * h.value) / cashTotal) } : h,
  );
  after.push({
    id: 'what-if', name: 'Khoản thử', category: input.assetType, value: amount, role: 'Thử nghiệm',
    volatility: VOLATILITY_BY_CATEGORY[input.assetType], riskGroup: input.sector, isMain: false, sector: input.sector,
  });

  const emergencyBefore = emergencyAmount(state);
  const emergencyAfter = fromCash ? Math.max(0, emergencyBefore - amount) : emergencyBefore;
  const before = snapshot(state, state.holdings, emergencyBefore, input);
  const afterSnap = snapshot(state, after, emergencyAfter, input);

  const { expectedReturn, volatility } = CATEGORY_ASSUMPTIONS[input.assetType];
  const years = Math.max(0, input.holdingMonths) / 12;
  const expected = Math.round(amount * (1 + expectedReturn) ** years);
  // Trường hợp xấu ≈ −2σ trong kỳ nắm giữ (tối thiểu 1 năm biến động), không âm
  const worstCase = Math.max(0, Math.round(amount * (1 + expectedReturn * years - 2 * volatility * Math.sqrt(Math.max(1, years)))));

  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const explain = [
    `Phụ thuộc ngành ${SECTOR_LABELS[input.sector].toLowerCase()}: ${pct(before.sectorShare)} → ${pct(afterSnap.sectorShare)} (ước tính, tính cả công việc nếu có).`,
    fromCash ? `Quỹ dự phòng: ${before.runwayMonths} → ${afterSnap.runwayMonths} tháng chi tiêu.` : 'Dùng tiền mới, quỹ dự phòng giữ nguyên.',
  ];
  return {
    before,
    after: afterSnap,
    deltas: {
      concentration: afterSnap.concentration - before.concentration,
      sectorShare: afterSnap.sectorShare - before.sectorShare,
      runwayMonths: round1(afterSnap.runwayMonths - before.runwayMonths),
      goalProbability: before.goalProbability === null || afterSnap.goalProbability === null ? null : afterSnap.goalProbability - before.goalProbability,
    },
    projected: { expected, worstCase },
    explain,
  };
}
