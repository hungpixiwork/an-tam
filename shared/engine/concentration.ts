// B4 — rủi ro tập trung theo ngành, tính cả thu nhập từ công việc (ba.md §5.2, breakthroughs.md §B4).
//   C_s = (β_nghề,s · HC + Tài sản thuộc ngành s) / (HC + Tổng tài sản đầu tư)
// Trên màn hình gọi là "Mức độ rủi ro tập trung" (0..100), không dùng thuật ngữ chuyên môn.

import type { AssetCategory, Holding, Sector, UserState, Volatility } from '../types/domain';
import type { ConcentrationLevel, PortfolioRisk, SectorExposureItem, WhatIfInput, WhatIfPresetKey, WhatIfResult, WhatIfSnapshot } from '../types/api';
import { CATEGORY_ASSUMPTIONS, CATEGORY_ORDER, isInvestment, portfolioStats, totalValue } from './portfolio';
import { emergencyAmount } from './peace';
import { goalProbability } from './goals';
import { netWorthBreakdown } from './overview';
import { formatVnd } from '../format';

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

/**
 * Khi chỉ có thu nhập năm: phần thu nhập gắn với ngành ≈ thu nhập 2 năm tới
 * (khoảng thời gian thường cần để tìm việc mới / chờ ngành hồi phục khi gặp khó). ƯỚC TÍNH.
 */
export const HC_INCOME_MULTIPLE = 2;

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

/**
 * Mức độ rủi ro tập trung 0..100 trên toàn bộ các ngành (SECTORS): 0 = chia đều mọi ngành, 100 = dồn hết vào một ngành.
 * Khác concentrationIndex: số ngành cố định, nên chỉ có ít ngành cũng bị tính là tập trung.
 */
export function concentrationScore(exposure: SectorExposureItem[]): number {
  const n = SECTORS.length;
  const h = hhi(exposure.map((e) => e.share));
  if (h === 0) return 0;
  return Math.round(Math.min(1, Math.max(0, (h - 1 / n) / (1 - 1 / n))) * 100);
}

/** Ngưỡng của mức độ rủi ro tập trung: ≥ 60 cao, ≥ 35 trung bình. */
export const scoreLevel = (score: number): ConcentrationLevel => (score >= 60 ? 'high' : score >= 35 ? 'mid' : 'low');

/** Cổ phiếu công ty mình: > 20% danh mục là cao, > 10% là trung bình. */
export const employerLevel = (share: number): ConcentrationLevel => (share > 0.2 ? 'high' : share > 0.1 ? 'mid' : 'low');

/** Tỷ trọng cổ phiếu công ty mình (0..1) trên tổng tài sản tài chính. */
export function employerStockWeight(holdings: Holding[]): number {
  const total = totalValue(holdings);
  if (total === 0) return 0;
  return holdings.filter((h) => h.isEmployerStock).reduce((s, h) => s + h.value, 0) / total;
}

export const concentrationLevel = (share: number): ConcentrationLevel => (share > SECTOR_HIGH ? 'high' : share > SECTOR_WARN ? 'mid' : 'low');

/** Ngành của một khoản: cổ phiếu công ty mình có β = 1 với ngành nghề hiện tại. */
const holdingSector = (h: Holding, occupationSector?: Sector): Sector =>
  h.isEmployerStock && occupationSector ? occupationSector : (h.sector ?? 'other');

export interface SectorExposureInput {
  holdings: Holding[];
  annualIncome?: number;
  humanCapital?: number;
  occupationSector?: Sector;
}

/** C_s cho mọi ngành có tỷ trọng > 0, giảm dần. β_nghề,s = 1 với ngành nghề, 0 với ngành khác. */
export function sectorExposure(input: SectorExposureInput): SectorExposureItem[] {
  const { holdings, occupationSector } = input;
  const hc = occupationSector ? Math.max(0, input.humanCapital ?? (input.annualIncome ?? 0) * HC_INCOME_MULTIPLE) : 0;
  const assets = totalValue(holdings);
  const denom = hc + assets;
  if (denom <= 0) return [];
  const bySector = new Map<Sector, number>();
  for (const h of holdings) {
    const s = holdingSector(h, occupationSector);
    bySector.set(s, (bySector.get(s) ?? 0) + h.value);
  }
  if (occupationSector) bySector.set(occupationSector, (bySector.get(occupationSector) ?? 0) + hc);
  return SECTORS.map((sector) => {
    const share = Math.min(1, Math.max(0, (bySector.get(sector) ?? 0) / denom));
    return { sector, share, level: concentrationLevel(share) };
  })
    .filter((x) => x.share > 0)
    .sort((a, b) => b.share - a.share);
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const dec = (x: number) => String(x).replace('.', ',');

/** Các lựa chọn loại tài sản của form "Thử trước khi đầu tư". */
export const WHAT_IF_PRESETS: Record<WhatIfPresetKey, { assetType: AssetCategory; sector: Sector; diversified?: boolean; label: string }> = {
  global_etf: { assetType: 'fund', sector: 'other', diversified: true, label: 'Quỹ ETF toàn cầu' },
  vn_etf: { assetType: 'fund', sector: 'finance', label: 'Quỹ ETF VN30' },
  tech_stock: { assetType: 'stock', sector: 'technology', label: 'Cổ phiếu công nghệ' },
  bond: { assetType: 'bond', sector: 'finance', label: 'Trái phiếu / tiền gửi' },
  gold: { assetType: 'other', sector: 'other', label: 'Vàng' },
  real_estate: { assetType: 'other', sector: 'real_estate', label: 'Bất động sản' },
};

export interface CareerContext {
  occupationSector?: Sector | null;
  annualIncome?: number;
  humanCapital?: number;
}

/** Số liệu trang Danh mục: tài sản ròng, cơ cấu, cổ phiếu công ty mình, mức phụ thuộc ngành (cả nghề nghiệp). */
export function portfolioRisk(state: UserState, career: CareerContext): PortfolioRisk {
  const nw = netWorthBreakdown(state);
  const invest = state.holdings.filter(isInvestment);
  const investTotal = totalValue(invest);
  const totalAssets = totalValue(state.holdings);
  const occupationSector = career.occupationSector ?? undefined;
  const exposure = sectorExposure({ holdings: invest, annualIncome: career.annualIncome, humanCapital: career.humanCapital, occupationSector });
  const careerValue = occupationSector ? Math.max(0, career.humanCapital ?? (career.annualIncome ?? 0) * HC_INCOME_MULTIPLE) : 0;
  const top = exposure[0]?.sector;
  const topAssets = top ? invest.filter((h) => holdingSector(h, occupationSector) === top).reduce((s, h) => s + h.value, 0) : 0;
  const employerValue = invest.filter((h) => h.isEmployerStock).reduce((s, h) => s + h.value, 0);
  const employerShare = investTotal > 0 ? employerValue / investTotal : 0;
  const score = concentrationScore(exposure);
  return {
    netWorth: { net: nw.net, deltaPct: nw.deltaPct, compareMonths: nw.compareMonths, totalAssets, invested: investTotal, other: totalAssets - investTotal, debt: nw.debt },
    allocation: CATEGORY_ORDER.map((category) => {
      const value = invest.filter((h) => h.category === category).reduce((s, h) => s + h.value, 0);
      return { category, value, pct: investTotal > 0 ? value / investTotal : 0 };
    })
      .filter((a) => a.value > 0)
      .sort((a, b) => b.value - a.value),
    employer: { value: employerValue, share: employerShare, level: employerLevel(employerShare) },
    careerSector: occupationSector ?? null,
    careerValue,
    exposure,
    topSectorAssetShare: investTotal > 0 ? topAssets / investTotal : 0,
    score,
    level: scoreLevel(score),
  };
}

/** Khoản thử: tài sản đa ngành được chia đều cho mọi ngành khi tính mức phụ thuộc. */
function trialHoldings(input: WhatIfInput, amount: number): Holding[] {
  const base = { category: input.assetType, role: 'Thử nghiệm', volatility: VOLATILITY_BY_CATEGORY[input.assetType], isMain: false, inPortfolio: true, name: 'Khoản thử' };
  if (!input.diversified) return [{ ...base, id: 'what-if', value: amount, riskGroup: input.sector, sector: input.sector }];
  const part = Math.floor(amount / SECTORS.length);
  return SECTORS.map((sector, i) => ({
    ...base, id: `what-if-${sector}`, riskGroup: sector, sector,
    value: i === 0 ? amount - part * (SECTORS.length - 1) : part,
  }));
}

function snapshot(state: UserState, holdings: Holding[], goals: UserState['goals'], emergency: number, input: WhatIfInput): WhatIfSnapshot {
  const invest = holdings.filter(isInvestment);
  const exposure = sectorExposure({ holdings: invest, humanCapital: input.humanCapital, annualIncome: input.annualIncome, occupationSector: input.occupationSector });
  const s = { ...state, holdings, goals };
  const longGoals = goals.filter((g) => g.kind !== 'emergency');
  return {
    concentration: concentrationScore(exposure),
    topSector: exposure[0] ?? null,
    sectorShare: input.diversified ? 0 : (exposure.find((e) => e.sector === input.sector)?.share ?? 0),
    riskyShare: portfolioStats(invest).riskyShare,
    runwayMonths: state.profile.monthlyExpense > 0 ? round1(emergency / state.profile.monthlyExpense) : 0,
    goalProbability: longGoals.length ? longGoals.reduce((sum, g) => sum + goalProbability(g, s), 0) / longGoals.length : null,
  };
}

/** Rút `amount` khỏi các khoản được chọn theo tỷ lệ giá trị. */
function drawFrom(holdings: Holding[], pick: (h: Holding) => boolean, amount: number): Holding[] {
  const pool = holdings.filter(pick).reduce((s, h) => s + h.value, 0);
  if (amount <= 0 || pool <= 0) return holdings;
  return holdings.map((h) => (pick(h) ? { ...h, value: Math.max(0, Math.round(h.value - (amount * h.value) / pool)) } : h));
}

/**
 * "Thử trước khi đầu tư": bỏ thêm `amount` vào (assetType × sector) trong `holdingMonths` tháng.
 * Nguồn tiền mặc định: tiền mặt đang chờ đầu tư trong danh mục trước, thiếu thì lấy từ quỹ dự phòng.
 * Khoản mới được tính cho mục tiêu dài hạn ưu tiên nhất (tiến độ mục tiêu).
 */
export function whatIfAllocate(state: UserState, input: WhatIfInput): WhatIfResult {
  const amount = Math.max(0, Math.round(input.amount));
  const fromCash = (input.fundedFrom ?? 'cash') === 'cash';

  const isFreeCash = (h: Holding) => h.category === 'cash' && isInvestment(h);
  const isReserveCash = (h: Holding) => h.category === 'cash' && !isInvestment(h);
  const freeCash = state.holdings.filter(isFreeCash).reduce((s, h) => s + h.value, 0);
  const emergencyBefore = emergencyAmount(state);
  const fromPortfolioCash = fromCash ? Math.min(amount, freeCash) : 0;
  const fromEmergency = fromCash ? Math.min(amount - fromPortfolioCash, emergencyBefore) : 0;
  const newMoney = amount - fromPortfolioCash - fromEmergency;

  let after = drawFrom(state.holdings, isFreeCash, fromPortfolioCash);
  after = drawFrom(after, isReserveCash, fromEmergency);
  after = [...after, ...trialHoldings(input, amount)];

  const hasEmergencyGoal = state.goals.some((g) => g.kind === 'emergency');
  // Không có mục tiêu quỹ dự phòng → quỹ dự phòng = toàn bộ tiền mặt, nên mọi khoản rút tiền mặt đều làm giảm
  const emergencyAfter = Math.max(0, emergencyBefore - fromEmergency - (hasEmergencyGoal ? 0 : fromPortfolioCash));
  const goalsAfter = state.goals.map((g) => (g.kind === 'emergency' ? { ...g, currentAmount: Math.max(0, g.currentAmount - fromEmergency) } : g));
  const mainGoal = goalsAfter.filter((g) => g.kind !== 'emergency').sort((a, b) => a.priority - b.priority)[0];
  const goalsWithTrial = goalsAfter.map((g) => (g === mainGoal ? { ...g, currentAmount: g.currentAmount + amount } : g));

  const before = snapshot(state, state.holdings, state.goals, emergencyBefore, input);
  const afterSnap = snapshot(state, after, goalsWithTrial, emergencyAfter, input);

  const { expectedReturn, volatility } = CATEGORY_ASSUMPTIONS[input.assetType];
  const years = Math.max(0, input.holdingMonths) / 12;
  const expected = Math.round(amount * (1 + expectedReturn) ** years);
  // Trường hợp xấu ≈ −2σ trong kỳ nắm giữ (tối thiểu 1 năm biến động), không âm
  const worstCase = Math.max(0, Math.round(amount * (1 + expectedReturn * years - 2 * volatility * Math.sqrt(Math.max(1, years)))));

  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const dC = afterSnap.concentration - before.concentration;
  const sectorName = SECTOR_LABELS[input.sector].toLowerCase();
  const explain = [
    input.diversified
      ? `Tài sản trải đều nhiều ngành: mức độ rủi ro tập trung ${before.concentration} → ${afterSnap.concentration}.`
      : `Phụ thuộc ngành ${sectorName}: ${pct(before.sectorShare)} → ${pct(afterSnap.sectorShare)} (ước tính, tính cả công việc nếu có).`,
    fromEmergency > 0 || (!hasEmergencyGoal && fromPortfolioCash > 0)
      ? `Quỹ dự phòng: ${dec(before.runwayMonths)} → ${dec(afterSnap.runwayMonths)} tháng chi tiêu.`
      : 'Quỹ dự phòng giữ nguyên.',
  ];
  const target = input.diversified ? 'tài sản trải nhiều ngành' : `ngành ${sectorName}`;
  const firstInvestment = !state.holdings.some(isInvestment) && !input.occupationSector;
  const riskLine = firstInvestment
    ? 'Đây là khoản đầu tư đầu tiên của bạn; về lâu dài hãy thêm dần tài sản ở nhiều ngành khác nhau.'
    : dC < 0
      ? `Thêm ${formatVnd(amount)} vào ${target} giúp giảm rủi ro tập trung (${before.concentration} → ${afterSnap.concentration}) và góp thêm cho mục tiêu dài hạn.`
      : dC > 0
        ? `Khoản này làm bạn phụ thuộc ngành ${SECTOR_LABELS[afterSnap.topSector?.sector ?? input.sector].toLowerCase()} nhiều hơn (${before.concentration} → ${afterSnap.concentration}). Cân nhắc chọn tài sản khác ngành với công việc của bạn.`
        : 'Khoản này gần như không đổi mức độ rủi ro tập trung.';
  const cashLine =
    fromEmergency > 0
      ? `Cần lấy ${formatVnd(fromEmergency)} từ quỹ dự phòng (còn ${dec(afterSnap.runwayMonths)} tháng an toàn): nên đầu tư trước ${formatVnd(fromPortfolioCash)} đang chờ đầu tư, phần còn lại góp dần hằng tháng.`
      : 'Quỹ dự phòng giữ nguyên.';
  const advice = `${riskLine} ${cashLine}`;
  return {
    before,
    after: afterSnap,
    deltas: {
      concentration: dC,
      sectorShare: afterSnap.sectorShare - before.sectorShare,
      runwayMonths: round1(afterSnap.runwayMonths - before.runwayMonths),
      goalProbability: before.goalProbability === null || afterSnap.goalProbability === null ? null : afterSnap.goalProbability - before.goalProbability,
    },
    projected: { expected, worstCase },
    explain,
    advice,
    funding: { fromPortfolioCash, fromEmergency, newMoney },
  };
}
