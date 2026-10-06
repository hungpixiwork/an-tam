import type { FinancialProfile, UserState } from '../types/domain';
import { effectiveProfile } from './ledger';
import { addMonths } from './month';
import { goalProbability, nearestMajorGoal } from './goals';
import { monthsBetween } from './month';
import { isInvestment, portfolioStats } from './portfolio';

export type PeaceLevel = 'stable' | 'watch' | 'action';

export const PEACE_LEVELS: Record<PeaceLevel, { label: string; min: number }> = {
  stable: { label: 'Ổn định', min: 80 },
  watch:  { label: 'Cần chú ý', min: 60 },
  action: { label: 'Cần hành động', min: 0 },
};

export const peaceLevel = (score: number): PeaceLevel =>
  score >= PEACE_LEVELS.stable.min ? 'stable' : score >= PEACE_LEVELS.watch.min ? 'watch' : 'action';

/** Trọng số điểm thành phần (tổng 100). */
const WEIGHTS = { emergency: 30, goals: 30, riskFit: 20, cashflow: 20 } as const;
/** Tỷ lệ tiết kiệm được xem là "đủ tốt" để đạt điểm tối đa phần dòng tiền. */
const TARGET_SAVINGS_RATE = 0.5;
/** Mức vượt tỷ trọng rủi ro khuyến nghị làm mất toàn bộ điểm phần phù hợp rủi ro. */
const RISK_EXCESS_TOLERANCE = 0.4;
const PRIORITY_WEIGHT: Record<number, number> = { 1: 3, 2: 2, 3: 1 };

/** Tỷ trọng tài sản biến động tối đa khuyến nghị theo số tháng tới mục tiêu lớn gần nhất. */
export function recommendedRiskyShare(monthsToGoal: number): number {
  if (monthsToGoal <= 24) return 0.25;
  if (monthsToGoal <= 60) return 0.4;
  if (monthsToGoal <= 120) return 0.55;
  return 0.7;
}

/** Quỹ dự phòng = số đã có của mục tiêu "Quỹ dự phòng", nếu không có thì lấy tiền mặt. */
export function emergencyAmount(state: UserState): number {
  const goal = state.goals.find((g) => g.kind === 'emergency');
  if (goal) return goal.currentAmount;
  const reserveCash = state.holdings.filter((h) => h.category === 'cash' && !isInvestment(h));
  if (reserveCash.length) return reserveCash.reduce((s, h) => s + h.value, 0);
  return state.holdings.filter((h) => h.category === 'cash').reduce((s, h) => s + h.value, 0);
}

export const emergencyMonths = (state: UserState, amount = emergencyAmount(state)): number => {
  const denom = (state.profile.essentialExpense && state.profile.essentialExpense > 0)
    ? state.profile.essentialExpense
    : state.profile.monthlyExpense;
  return denom > 0 ? amount / denom : 0;
};

/** Khả năng để dành mỗi tháng trước nợ = thu nhập − chi tiêu. */
export const savingsCapacity = (state: UserState): number => state.profile.monthlyIncome - state.profile.monthlyExpense;

/** Tổng tiền trả nợ định kỳ mỗi tháng. */
export const totalDebtService = (state: UserState): number =>
  (state.liabilities ?? []).reduce((s, l) => s + (l.monthlyPayment ?? l.requiredMonthly ?? 0), 0);

/** Khả năng để dành sau khi trừ trả nợ định kỳ. */
export const postDebtSavingsCapacity = (state: UserState): number =>
  savingsCapacity(state) - totalDebtService(state);

/** Dòng tiền tự do = phần còn dư sau chi tiêu, trả nợ và sau khi đã để dành cho các mục tiêu. */
export const freeCashflow = (state: UserState): number =>
  postDebtSavingsCapacity(state) - state.goals.reduce((sum, g) => sum + g.monthlyContribution, 0);

export interface PeaceFactor {
  key: keyof typeof WEIGHTS;
  label: string;
  score: number;
  max: number;
  detail: string;
}

export interface PeaceResult {
  score: number;
  level: PeaceLevel;
  label: string;
  factors: PeaceFactor[];
  isCalibrated?: boolean;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function peaceScore(state: UserState): PeaceResult {
  const hasNoData =
    state.goals.length === 0 &&
    state.holdings.length === 0 &&
    (state.profile.monthlyIncome ?? 0) === 0 &&
    (state.profile.monthlyExpense ?? 0) === 0;

  if (hasNoData) {
    return {
      score: 0,
      level: 'action',
      label: 'Chưa hiệu chuẩn',
      isCalibrated: false,
      factors: [
        { key: 'emergency', label: 'Quỹ dự phòng', score: 0, max: WEIGHTS.emergency, detail: 'Chưa có dữ liệu quỹ dự phòng' },
        { key: 'goals', label: 'Khả năng đạt mục tiêu', score: 0, max: WEIGHTS.goals, detail: 'Chưa có mục tiêu nào được thiết lập' },
        { key: 'riskFit', label: 'Mức rủi ro phù hợp', score: 0, max: WEIGHTS.riskFit, detail: 'Chưa có danh mục tài sản' },
        { key: 'cashflow', label: 'Dòng tiền', score: 0, max: WEIGHTS.cashflow, detail: 'Chưa có dữ liệu thu chi' },
      ],
    };
  }

  const months = emergencyMonths(state);
  const target = state.profile.emergencyTargetMonths || 6;
  const emergency = WEIGHTS.emergency * clamp01(months / target);

  let weightSum = 0;
  let probSum = 0;
  for (const goal of state.goals) {
    const w = PRIORITY_WEIGHT[goal.priority] ?? 1;
    weightSum += w;
    probSum += w * goalProbability(goal, state);
  }
  const avgProb = weightSum > 0 ? probSum / weightSum : 0.5;
  const goals = WEIGHTS.goals * avgProb;

  const major = nearestMajorGoal(state);
  const recommended = recommendedRiskyShare(major ? monthsBetween(state.today, major.targetMonth) : 240);
  const { riskyShare } = portfolioStats(state.holdings);
  const excess = Math.max(0, riskyShare - recommended);
  const riskFit = WEIGHTS.riskFit * (1 - clamp01(excess / RISK_EXCESS_TOLERANCE));

  const income = state.profile.monthlyIncome;
  const postDebtSavings = postDebtSavingsCapacity(state);
  const savingsRate = income > 0 ? postDebtSavings / income : 0;
  const cashflow = WEIGHTS.cashflow * clamp01(savingsRate / TARGET_SAVINGS_RATE);

  const score = Math.round(emergency + goals + riskFit + cashflow);
  const level = peaceLevel(score);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return {
    score,
    level,
    label: PEACE_LEVELS[level].label,
    isCalibrated: true,
    factors: [
      { key: 'emergency', label: 'Quỹ dự phòng', score: emergency, max: WEIGHTS.emergency, detail: `Đủ ${months.toFixed(1).replace('.', ',')} / ${target} tháng chi tiêu thiết yếu` },
      { key: 'goals', label: 'Khả năng đạt mục tiêu', score: goals, max: WEIGHTS.goals, detail: `Trung bình ${pct(avgProb)} theo mức ưu tiên` },
      { key: 'riskFit', label: 'Mức rủi ro phù hợp', score: riskFit, max: WEIGHTS.riskFit, detail: `Tài sản biến động ${pct(riskyShare)} · khuyến nghị ≤ ${pct(recommended)}` },
      { key: 'cashflow', label: 'Dòng tiền', score: cashflow, max: WEIGHTS.cashflow, detail: `Để dành được ${pct(savingsRate)} thu nhập (sau trả nợ)` },
    ],
  };
}

/**
 * Điểm an tâm ước tính của `monthsBack` tháng trước — để so "tăng / giảm N điểm so với tháng trước".
 * Dựng lại trạng thái lúc đó: thu / chi lấy trung bình sổ thu chi tính đến tháng đó (hoặc số nền),
 * mỗi mục tiêu bớt đi phần đã góp trong các tháng sau. Tài sản giữ nguyên (không có lịch sử từng khoản).
 * Trả về null khi không có dữ liệu thu chi của giai đoạn đó để so sánh.
 */
export function peaceScoreAsOf(state: UserState, baseline: FinancialProfile, monthsBack = 1): number | null {
  const month = addMonths(state.today, -monthsBack);
  const ledger = state.ledger.filter((m) => m.month <= month);
  if (!ledger.length) return null;
  const { profile } = effectiveProfile(baseline, ledger, month);
  const past: UserState = {
    ...state,
    today: month,
    profile,
    ledger,
    goals: state.goals.map((g) => ({ ...g, currentAmount: Math.max(0, g.currentAmount - g.monthlyContribution * monthsBack) })),
  };
  return peaceScore(past).score;
}
