// Mô phỏng cú sốc kép cho một lựa chọn cuộc đời: nghề nghiệp (lương, thưởng, cổ phiếu thưởng) và tài sản
// (cổ phiếu công ty, khoản đầu tư cùng ngành, phần còn lại của thị trường) bị ảnh hưởng cùng lúc.
// Tất định: đường tiền 24 tháng theo tháng cho 3 khung bull / base / bear, không dùng mô phỏng ngẫu nhiên.
// Mọi con số là ƯỚC TÍNH từ dữ liệu người dùng nhập — không phải lời khuyên đầu tư.

import type { Holding, Sector, UserState } from '../types/domain';
import type { LifeChoiceOptionInput } from '../types/api/lifeChoices';
import type {
  DecisionGoalTile, DecisionMode, DecisionRange, DecisionScenario, DecisionShock, DecisionShockParams,
  DecisionSimulationResult, DecisionStep,
} from '../types/api/decision';
import { evaluateLifeChoice, liquidAssets, type EvaluateContext } from './lifeChoice';
import { expectedCompletion } from './goals';
import { addMonths, monthsBetween } from './month';
import { peaceScore, savingsCapacity } from './peace';
import { MARKET_BETA } from './simulate';

export const HORIZON_MONTHS = 24;

/** Hệ số của từng khung: mức độ thu nhập bị ảnh hưởng, mức giảm tài sản, phần tài sản hồi lại sau 24 tháng. */
export const DECISION_MODE_FACTORS: Record<DecisionMode, { income: number; asset: number; recovery: number }> = {
  bull: { income: 0.6, asset: 0.6, recovery: 0.8 },
  base: { income: 1, asset: 1, recovery: 0.4 },
  bear: { income: 1.4, asset: 1.4, recovery: 0 },
};

/** Mẫu cú sốc có sẵn (UI, Agent, MCP dùng chung). Ngành lấy từ hồ sơ nghề nghiệp của người dùng. */
export function decisionPreset(shock: DecisionShock, sector: Sector = 'technology'): DecisionShockParams {
  if (shock === 'job_loss') {
    return { sector, disruptionProbPct: 100, monthsNoIncome: 6, bonusCutPct: 100, esopCutPct: 100, employerStockDropPct: 0, sectorDropPct: 0, marketDropPct: 0 };
  }
  if (shock === 'market') {
    return { sector, disruptionProbPct: 0, monthsNoIncome: 3, bonusCutPct: 20, esopCutPct: 30, employerStockDropPct: 35, sectorDropPct: 35, marketDropPct: 30 };
  }
  return { sector, disruptionProbPct: 70, monthsNoIncome: 12, bonusCutPct: 50, esopCutPct: 60, employerStockDropPct: 60, sectorDropPct: 40, marketDropPct: 15 };
}

export const DECISION_SHOCKS: DecisionShock[] = ['industry', 'job_loss', 'market'];

/** Tỷ trọng tối đa nên giữ ở tài sản cùng ngành với công việc (khớp allocation.ts employerStockCap). */
const CONCENTRATION_CAP = 0.1;
/** Khi lấp lại phần thiếu, giả định chỉ dồn được 60% tiền dư (40% vẫn góp cho mục tiêu khác) → cận trên của khoảng. */
const SLOW_SAVE_SHARE = 0.6;
const MAX_DROP = 0.95;

export interface DecisionIncomeExtras {
  /** Thưởng năm (VND) — lấy từ hồ sơ thu nhập. */
  bonusAnnual: number;
  /** Cổ phiếu thưởng (ESOP) nhận mỗi năm, quy ra VND. */
  esopAnnual: number;
}

export interface DecisionChoiceContext {
  id: string;
  title: string;
  incomeUpliftPct: number;
  evaluate: EvaluateContext;
}

export type DecisionOption = LifeChoiceOptionInput & { id: string; startMonth?: string | null };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const roundMillion = (n: number) => Math.round(n / 1_000_000) * 1_000_000;

const isLiquid = (h: Holding) => h.category === 'cash' || h.inPortfolio === true || (h.inPortfolio === undefined && h.category !== 'other');

/** Mức giảm của 1 khoản khi sốc (0..MAX_DROP). */
function holdingDrop(h: Holding, p: DecisionShockParams, assetFactor: number): number {
  const base = h.isEmployerStock
    ? p.employerStockDropPct
    : h.sector === p.sector && h.category !== 'cash'
      ? p.sectorDropPct
      : p.marketDropPct * MARKET_BETA[h.category];
  return clamp((base / 100) * assetFactor, 0, MAX_DROP);
}

interface Timeline {
  start: number;
  duration: number;
  noIncome: number;
  delta: number;
  upfront: number;
  uplift: number;
}

interface Projection {
  path: number[];
  /** Thu nhập tháng m (1..24): lương + thưởng + cổ phiếu thưởng bình quân tháng. */
  income: number[];
  assetLoss: number;
}

function project(state: UserState, t: Timeline, extras: DecisionIncomeExtras, shock: DecisionShockParams | null, mode: DecisionMode): Projection {
  const f = DECISION_MODE_FACTORS[mode];
  const E = Math.max(0, state.profile.monthlyExpense);
  const salary = Math.max(0, state.profile.monthlyIncome);
  const bonusM = Math.max(0, extras.bonusAnnual) / 12;
  const esopM = Math.max(0, extras.esopAnnual) / 12;

  const liquid = state.holdings.filter(isLiquid);
  const assetLoss = shock ? Math.round(liquid.reduce((s, h) => s + h.value * holdingDrop(h, shock, f.asset), 0)) : 0;
  let lostLeft = shock ? Math.round(clamp(shock.monthsNoIncome, 0, HORIZON_MONTHS) * clamp((shock.disruptionProbPct / 100) * f.income, 0, 1)) : 0;
  const bonusKeep = shock ? 1 - clamp((shock.bonusCutPct / 100) * f.income, 0, 1) : 1;
  const esopKeep = shock ? 1 - clamp((shock.esopCutPct / 100) * f.income, 0, 1) : 1;

  let cash = liquidAssets(state);
  const path = [cash - assetLoss];
  const income: number[] = [0];
  for (let m = 1; m <= HORIZON_MONTHS; m++) {
    const k = m - t.start; // tháng thứ k của lựa chọn (≤ 0 = đang chuẩn bị, vẫn đi làm)
    const inChoice = k >= 1 && k <= t.duration;
    let pay = !inChoice ? (k > t.duration ? salary * (1 + t.uplift / 100) : salary) : k <= t.noIncome ? 0 : Math.max(0, salary + t.delta);
    // Thưởng / cổ phiếu thưởng chỉ có khi đang làm công việc chính (không tính lúc đang thực hiện lựa chọn)
    let extra = inChoice ? 0 : bonusM * (m <= 12 ? bonusKeep : 1) + esopM * (m <= 12 ? esopKeep : 1);
    // Mất lương rơi vào những tháng đáng lẽ có lương đầu tiên
    if (pay > 0 && lostLeft > 0) { pay = 0; extra = 0; lostLeft--; }
    const monthIncome = Math.round(pay + extra);
    cash += monthIncome - E - (k === 1 ? t.upfront : 0);
    const recovered = assetLoss * f.recovery * (m / HORIZON_MONTHS);
    path.push(Math.round(cash - assetLoss + recovered));
    income.push(monthIncome);
  }
  return { path, income, assetLoss };
}

/** Trạng thái tại thời điểm eo hẹp nhất: tiền dùng được co lại, thu nhập tháng đó. */
function stateAt(state: UserState, balance: number, monthIncome: number): UserState {
  const liquid = liquidAssets(state);
  const scale = liquid > 0 ? Math.max(0, balance) / liquid : 0;
  return {
    ...state,
    profile: { ...state.profile, monthlyIncome: monthIncome },
    holdings: state.holdings.map((h) => (isLiquid(h) ? { ...h, value: Math.round(h.value * scale) } : h)),
    goals: state.goals.map((g) => (g.kind === 'emergency' ? { ...g, currentAmount: Math.min(g.currentAmount, Math.max(0, balance)) } : g)),
  };
}

function summarize(state: UserState, mode: DecisionMode, p: Projection, baseline: Projection | null): DecisionScenario {
  const E = Math.max(1, state.profile.monthlyExpense);
  let lowestMonth = 0;
  p.path.forEach((v, m) => { if (v < p.path[lowestMonth]) lowestMonth = m; });
  const lowestBalance = p.path[lowestMonth];
  const idx = p.path.findIndex((v, m) => m > 0 && v < 0);
  const incomeAt = p.income[Math.max(1, lowestMonth)] ?? state.profile.monthlyIncome;
  return {
    mode,
    path: p.path,
    monthsSafe: round1(Math.max(0, lowestBalance) / E),
    lowestMonth,
    lowestBalance,
    shortfallMonth: idx < 0 ? null : idx,
    safetyScore: peaceScore(stateAt(state, lowestBalance, incomeAt)).score,
    incomeLost: baseline ? Math.max(0, baseline.income.reduce((s, v) => s + v, 0) - p.income.reduce((s, v) => s + v, 0)) : 0,
    assetLoss: p.assetLoss,
  };
}

/** Khoảng số tháng để tích lũy lại `amount`: dồn toàn bộ tiền dư (nhanh) … chỉ dồn 60% (chậm). */
function refillRange(amount: number, monthlySave: number): DecisionRange {
  if (amount <= 0) return { min: 0, max: 0 };
  if (monthlySave <= 0) return { min: HORIZON_MONTHS, max: HORIZON_MONTHS };
  return { min: Math.ceil(amount / monthlySave), max: Math.ceil(amount / (monthlySave * SLOW_SAVE_SHARE)) };
}

export function analyzeDecisionSimulation(
  state: UserState,
  choice: DecisionChoiceContext,
  option: DecisionOption,
  input: { mode: DecisionMode; shock: DecisionShock; params: DecisionShockParams },
  extras: DecisionIncomeExtras = { bonusAnnual: 0, esopAnnual: 0 },
): DecisionSimulationResult {
  const E = Math.max(1, state.profile.monthlyExpense);
  const duration = Math.max(1, Math.round(option.durationMonths));
  const timeline: Timeline = {
    start: option.startMonth ? clamp(monthsBetween(state.today, option.startMonth), 0, HORIZON_MONTHS) : 0,
    duration,
    noIncome: clamp(Math.round(option.monthsWithoutIncome), 0, duration),
    delta: option.monthlyIncomeDelta,
    upfront: Math.max(0, option.cost) + Math.max(0, option.otherCost),
    uplift: choice.incomeUpliftPct,
  };

  const baseProj = project(state, timeline, extras, null, 'base');
  const baseline = summarize(state, 'base', baseProj, null);
  const scenarios = Object.fromEntries((['bull', 'base', 'bear'] as DecisionMode[]).map((mode) => {
    const p = project(state, timeline, extras, input.params, mode);
    return [mode, summarize(state, mode, p, baseProj)];
  })) as Record<DecisionMode, DecisionScenario>;
  const selected = scenarios[input.mode];
  const surplus = Math.max(0, savingsCapacity(state));

  // Quỹ dự phòng: số tháng an toàn còn lại so với mục tiêu của người dùng
  const targetMonths = state.profile.emergencyTargetMonths || 6;
  const extraMonths = Math.max(0, Math.ceil(targetMonths - selected.monthsSafe));

  // Mục tiêu mua nhà: phần tiền mất đi sau 24 tháng phải tích lũy lại trước khi góp tiếp
  const home = state.goals.find((g) => g.kind === 'home');
  const lost24 = Math.max(0, baseline.path[HORIZON_MONTHS] - selected.path[HORIZON_MONTHS]);
  let homeDelay: DecisionSimulationResult['impact']['homeDelay'] = null;
  if (home) {
    const min = surplus > 0 ? Math.ceil(lost24 / surplus) : HORIZON_MONTHS;
    const max = home.monthlyContribution > 0 ? Math.max(min, Math.ceil(lost24 / home.monthlyContribution)) : min;
    const before = expectedCompletion(home, state);
    homeDelay = { min, max, goalTitle: home.title, before, after: before ? addMonths(before, max) : null };
  }

  // Lựa chọn: phải lấp lại phần quỹ bị hụt ở thời điểm eo hẹp nhất trước khi bắt đầu
  const delayStart = refillRange(Math.max(0, baseline.lowestBalance - selected.lowestBalance), surplus);
  const shockedState = stateAt(state, liquidAssets(state) - Math.max(0, baseline.lowestBalance - selected.lowestBalance), state.profile.monthlyIncome);
  const optInput: LifeChoiceOptionInput = { ...option };
  const before = evaluateLifeChoice(state, optInput, choice.evaluate);
  const after = evaluateLifeChoice(shockedState, optInput, choice.evaluate);

  // Mức độ rủi ro tập trung: tài sản gắn với cùng ngành đang làm
  const liquid = liquidAssets(state);
  const concentrated = state.holdings.filter((h) => isLiquid(h) && (h.isEmployerStock || (h.sector === input.params.sector && h.category !== 'cash')))
    .reduce((s, h) => s + h.value, 0);
  const share = liquid > 0 ? concentrated / liquid : 0;

  const avg12 = (xs: number[]) => Math.round(xs.slice(1, 13).reduce((s, v) => s + v, 0) / 12);
  const incomeBefore = avg12(baseProj.income);
  const incomeAfter = avg12(project(state, timeline, extras, input.params, input.mode).income);
  const startMonth = addMonths(state.today, timeline.start);

  const goals: DecisionGoalTile[] = [];
  if (homeDelay) goals.push({ key: 'home', title: homeDelay.goalTitle, before: homeDelay.before, after: homeDelay.after, delta: { min: homeDelay.min, max: homeDelay.max } });
  goals.push({ key: 'reserve', title: 'reserve', before: baseline.monthsSafe, after: selected.monthsSafe, delta: round1(selected.monthsSafe - baseline.monthsSafe) });
  goals.push({ key: 'choice', title: choice.title, before: startMonth, after: addMonths(startMonth, delayStart.max), delta: delayStart });
  goals.push({ key: 'cashflow', title: 'cashflow', before: incomeBefore, after: incomeAfter, delta: incomeBefore > 0 ? Math.round(((incomeAfter - incomeBefore) / incomeBefore) * 100) : null });

  const sideIncome = roundMillion(selected.incomeLost / HORIZON_MONTHS);
  const steps: DecisionStep[] = [];
  if (share > CONCENTRATION_CAP) steps.push({ key: 'reduce_concentration', params: { amount: roundMillion(concentrated - CONCENTRATION_CAP * liquid), sharePct: Math.round(share * 100), capPct: CONCENTRATION_CAP * 100 } });
  if (extraMonths > 0) steps.push({ key: 'raise_reserve', params: { from: Math.floor(selected.monthsSafe), to: targetMonths, amount: roundMillion(extraMonths * E) } });
  if (sideIncome > 0) steps.push({ key: 'side_income', params: { amount: sideIncome } });
  if (delayStart.max > 0) steps.push({ key: 'delay_start', params: { min: delayStart.min, max: delayStart.max } });
  if (!steps.length) steps.push({ key: 'keep_plan', params: {} });

  return {
    choiceId: choice.id, choiceTitle: choice.title, optionId: option.id, optionTitle: option.title,
    mode: input.mode, shock: input.shock, params: input.params,
    baseline, scenarios, selected,
    impact: {
      monthsSafe: { before: baseline.monthsSafe, after: selected.monthsSafe },
      reserve: { targetMonths, extraMonths, extraAmount: extraMonths * E },
      homeDelay,
      safety: { before: baseline.safetyScore, after: selected.safetyScore },
    },
    goals,
    choiceImpact: {
      feasibilityBefore: before.feasibility,
      feasibilityAfter: after.feasibility,
      verdictAfter: after.verdict,
      delayStart,
      notes: [
        { key: 'delay_start', params: { min: delayStart.min, max: delayStart.max } },
        { key: 'raise_reserve', params: { months: Math.max(targetMonths, extraMonths + Math.floor(selected.monthsSafe)) } },
        { key: 'side_income', params: { amount: sideIncome } },
      ],
    },
    steps: steps.slice(0, 4),
    concentration: { amount: concentrated, share: Math.round(share * 1000) / 1000 },
    basis: 'Ước tính tất định theo từng tháng từ thu nhập, thưởng, chi tiêu, tài sản và phương án bạn nhập. '
      + 'Bull nhẹ hơn 40% và tài sản hồi 80% sau 24 tháng; Bear nặng hơn 40% và chưa hồi. Không phải dự báo thị trường.',
  };
}
