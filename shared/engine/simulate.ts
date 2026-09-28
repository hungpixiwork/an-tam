import type { AssetCategory, Goal, Holding, SimulationParams, UserState } from '../types/domain';
import { expectedCompletion, goalProbability, projectValue } from './goals';
import { monthsBetween, addMonths } from './month';
import { emergencyAmount, emergencyMonths, savingsCapacity, peaceScore } from './peace';
import { portfolioStats, totalValue } from './portfolio';

/** Mức nhạy của từng loại tài sản với biến động thị trường cổ phiếu. */
export const MARKET_BETA: Record<AssetCategory, number> = { stock: 1, fund: 0.8, other: 0.4, bond: 0.1, cash: 0 };
/** Thời gian đáo hạn bình quân của trái phiếu (năm) — lãi suất tăng 1% → trái phiếu giảm ~4%. */
const BOND_DURATION = 4;
/** Lạm phát nền đã tính sẵn trong chi tiêu hiện tại. */
const BASE_INFLATION = 4;
/** Phần chi tiêu phải rút từ quỹ dự phòng trong thời gian mất thu nhập (phần còn lại do thu nhập khác của gia đình). */
const INCOME_PAUSE_COVERAGE = 0.5;
/** Phần chi phí bất ngờ trả từ quỹ dự phòng; phần còn lại bán bớt tài sản đầu tư. */
const SURPRISE_FROM_EMERGENCY = 0.5;
const PROJECTION_YEARS = 10;

export const DEFAULT_PARAMS: SimulationParams = {
  marketDropPct: 0,
  inflationPct: BASE_INFLATION,
  incomePauseMonths: 0,
  interestRateDeltaPct: 0,
  surpriseCost: 0,
};

/** Áp cú sốc lên trạng thái → trạng thái mới ngay sau cú sốc. Hàm thuần. */
export function applyShock(state: UserState, params: SimulationParams): UserState {
  const expense = state.profile.monthlyExpense;
  const pauseDraw = params.incomePauseMonths * expense * INCOME_PAUSE_COVERAGE;
  const emergencyBefore = emergencyAmount(state);
  const emergencyNeed = pauseDraw + params.surpriseCost * SURPRISE_FROM_EMERGENCY;
  const emergencyAfter = Math.max(0, emergencyBefore - emergencyNeed);
  const shortfall = Math.max(0, emergencyNeed - emergencyBefore) + params.surpriseCost * (1 - SURPRISE_FROM_EMERGENCY);

  const before = totalValue(state.holdings);
  let holdings: Holding[] = state.holdings.map((h) => {
    let change = (params.marketDropPct / 100) * MARKET_BETA[h.category];
    if (h.category === 'bond') change -= (params.interestRateDeltaPct / 100) * BOND_DURATION;
    return { ...h, value: Math.max(0, Math.round(h.value * (1 + change))) };
  });
  // Tiền rút ra (quỹ dự phòng + phần bán tài sản) trừ theo tỷ lệ trên toàn danh mục
  const marketAfter = totalValue(holdings);
  const withdraw = Math.min(marketAfter, emergencyBefore - emergencyAfter + shortfall);
  holdings = holdings.map((h) => ({ ...h, value: Math.round(h.value * (1 - withdraw / (marketAfter || 1))) }));
  const portfolioChange = before > 0 ? (marketAfter - before) / before : 0;

  const inflationFactor = 1 + Math.max(0, params.inflationPct - BASE_INFLATION) / 100;
  const newExpense = Math.round(expense * inflationFactor);
  const oldCashflow = savingsCapacity(state);
  const newCashflow = state.profile.monthlyIncome - newExpense;
  const contributionScale = oldCashflow > 0 ? Math.max(0, newCashflow / oldCashflow) : 1;

  const goals: Goal[] = state.goals.map((g) => {
    if (g.kind === 'emergency') return { ...g, currentAmount: Math.round(emergencyAfter) };
    const lostContributions = g.monthlyContribution * params.incomePauseMonths;
    const shifted = g.kind === 'home' && params.goalShiftMonths ? addMonths(g.targetMonth, params.goalShiftMonths) : g.targetMonth;
    return {
      ...g,
      targetMonth: shifted,
      currentAmount: Math.max(0, Math.round(g.currentAmount * (1 + portfolioChange) - lostContributions)),
      monthlyContribution: Math.round(g.monthlyContribution * contributionScale),
    };
  });

  return { ...state, holdings, goals, profile: { ...state.profile, monthlyExpense: newExpense } };
}

export interface SimulationMetrics {
  netWorth: number;
  peaceScore: number;
  emergencyAmount: number;
  emergencyMonths: number;
}

export interface GoalImpact {
  goalId: string;
  title: string;
  kind: Goal['kind'];
  probabilityBefore: number;
  probabilityAfter: number;
  expectedBefore: string | null;
  expectedAfter: string | null;
  delayMonths: number; // dương = chậm hơn so với trước cú sốc
}

export interface SimulationOutcome {
  params: SimulationParams;
  before: SimulationMetrics;
  after: SimulationMetrics;
  goals: GoalImpact[];
  projection: { label: string; baseline: number; scenario: number }[];
}

const metrics = (state: UserState, originalExpense: number): SimulationMetrics => {
  const amount = emergencyAmount(state);
  return {
    // Làm tròn 100 nghìn: giá trị sau cú sốc là ước tính, tránh số lẻ kiểu 918.900.002
    netWorth: Math.round(totalValue(state.holdings) / 100_000) * 100_000,
    peaceScore: peaceScore(state).score,
    emergencyAmount: amount,
    // Đo bằng chi tiêu gốc để so sánh công bằng trước/sau
    emergencyMonths: Math.round(emergencyMonths({ ...state, profile: { ...state.profile, monthlyExpense: originalExpense } }, amount) * 10) / 10,
  };
};

export function simulate(state: UserState, params: SimulationParams): SimulationOutcome {
  const shocked = applyShock(state, params);
  const expense = state.profile.monthlyExpense;

  const goals: GoalImpact[] = state.goals.map((g, i) => {
    const after = shocked.goals[i];
    const expectedBefore = expectedCompletion(g, state);
    const expectedAfter = expectedCompletion(after, shocked);
    return {
      goalId: g.id,
      title: g.title,
      kind: g.kind,
      probabilityBefore: goalProbability(g, state),
      probabilityAfter: goalProbability(after, shocked),
      expectedBefore,
      expectedAfter,
      delayMonths: expectedBefore && expectedAfter ? monthsBetween(expectedBefore, expectedAfter) : 0,
    };
  });

  const baseReturn = portfolioStats(state.holdings).expectedReturn;
  const shockReturn = portfolioStats(shocked.holdings).expectedReturn;
  const baseSave = Math.max(0, savingsCapacity(state));
  const shockSave = Math.max(0, savingsCapacity(shocked));
  const projection = Array.from({ length: PROJECTION_YEARS + 1 }, (_, year) => {
    const months = year * 12;
    const pausedMonths = Math.min(months, params.incomePauseMonths);
    return {
      label: year === 0 ? 'Hiện tại' : `Năm ${year}`,
      baseline: Math.round(projectValue(totalValue(state.holdings), baseSave, baseReturn, months)),
      scenario: Math.round(projectValue(totalValue(shocked.holdings), shockSave, shockReturn, months) - shockSave * pausedMonths),
    };
  });

  return { params, before: metrics(state, expense), after: metrics(shocked, expense), goals, projection };
}
