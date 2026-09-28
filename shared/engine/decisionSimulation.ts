import type { DecisionMode, DecisionShock } from '../types/api/decision';
import type { LifeChoiceOptionInput } from '../types/api/lifeChoices';
import type { SimulationParams, UserState } from '../types/domain';
import { liquidAssets } from './lifeChoice';
import { monthsBetween } from './month';

export interface DecisionProjectionPoint {
  month: number;
  baseline: number;
  bull: number;
  base: number;
  bear: number;
}

export interface DecisionScenarioResult {
  mode: DecisionMode;
  runwayBefore: number;
  runwayAfter: number;
  extraReserveMonths: number;
  safetyBefore: number;
  safetyAfter: number;
  month24Cash: number;
  cashShortfallMonth: number | null;
}

export interface DecisionGoalImpact {
  id: string;
  title: string;
  kind: string;
  delayMonths: number | null;
  targetMonth: string;
}

export interface DecisionSimulationAnalysis {
  choiceId: string;
  choiceTitle: string;
  optionId: string;
  optionTitle: string;
  mode: DecisionMode;
  shock: DecisionShock;
  params: SimulationParams;
  basis: string;
  projection: DecisionProjectionPoint[];
  scenarios: Record<DecisionMode, DecisionScenarioResult>;
  selected: DecisionScenarioResult;
  goals: DecisionGoalImpact[];
  suggestions: { key: string; title: string; body: string }[];
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const factor: Record<DecisionMode, number> = { bull: 0.75, base: 1, bear: 1.25 };

/** Dòng tiền của phương án thực lấy từ life_choice_options; cú sốc chỉ làm thay đổi các đầu vào đã khai báo. */
export function analyzeDecisionSimulation(
  state: UserState,
  choice: { id: string; title: string; incomeUpliftPct: number },
  option: LifeChoiceOptionInput & { id: string },
  input: { mode: DecisionMode; shock: DecisionShock; params: SimulationParams },
): DecisionSimulationAnalysis {
  const liquid = liquidAssets(state);
  const monthlyIncome = Math.max(0, state.profile.monthlyIncome);
  const monthlyExpense = Math.max(0, state.profile.monthlyExpense);
  const duration = Math.max(1, option.durationMonths);
  const noIncome = Math.min(duration, option.monthsWithoutIncome);
  const startingCash = liquid - option.cost - option.otherCost;
  const risky = state.holdings
    .filter((h) => h.category === 'stock' || h.category === 'fund' || (h.category === 'other' && h.inPortfolio))
    .reduce((sum, h) => sum + h.value, 0);
  const monthlyBaseline = (month: number) => {
    const income = month <= noIncome ? 0 : month <= duration
      ? Math.max(0, monthlyIncome + option.monthlyIncomeDelta)
      : Math.round(monthlyIncome * (1 + choice.incomeUpliftPct / 100));
    return income - monthlyExpense;
  };
  const baseline: number[] = [Math.round(startingCash)];
  for (let month = 1; month <= 24; month++) baseline.push(Math.round(baseline[month - 1] + monthlyBaseline(month)));

  const shockPath = (mode: DecisionMode) => {
    const severity = factor[mode];
    const hasIncomeShock = input.shock === 'industry' || input.shock === 'job_loss';
    const hasMarketShock = input.shock === 'industry' || input.shock === 'market';
    const paused = hasIncomeShock ? clamp(Math.round(input.params.incomePauseMonths * severity), 0, 24) : 0;
    const marketLoss = hasMarketShock ? Math.max(0, -input.params.marketDropPct) / 100 * risky * severity : 0;
    const extraInflation = Math.max(0, input.params.inflationPct - 4) / 100 * monthlyExpense * severity;
    const extraCost = input.params.surpriseCost * severity;
    const values = [Math.round(startingCash - marketLoss - extraCost)];
    for (let month = 1; month <= 24; month++) {
      const income = month > noIncome && month <= noIncome + paused ? 0 : monthlyBaseline(month) + monthlyExpense;
      values.push(Math.round(values[month - 1] + income - monthlyExpense - extraInflation));
    }
    return values;
  };
  const paths = { bull: shockPath('bull'), base: shockPath('base'), bear: shockPath('bear') };
  const projection = baseline.map((amount, month) => ({ month, baseline: amount, bull: paths.bull[month], base: paths.base[month], bear: paths.bear[month] }));
  const reserveTarget = Math.max(1, state.profile.emergencyTargetMonths || 6);
  const months = (cash: number) => monthlyExpense > 0 ? Math.max(0, cash) / monthlyExpense : 0;
  const score = (cash: number) => clamp(Math.round(months(cash) / reserveTarget * 100), 0, 100);
  const summarize = (mode: DecisionMode): DecisionScenarioResult => {
    const path = paths[mode];
    const runwayBefore = Math.round(months(baseline[Math.min(12, baseline.length - 1)]) * 10) / 10;
    const runwayAfter = Math.round(months(path[Math.min(12, path.length - 1)]) * 10) / 10;
    return {
      mode,
      runwayBefore,
      runwayAfter,
      extraReserveMonths: Math.max(0, Math.ceil((reserveTarget * monthlyExpense - path[12]) / Math.max(1, monthlyExpense))),
      safetyBefore: score(baseline[12]),
      safetyAfter: score(path[12]),
      month24Cash: path[24],
      cashShortfallMonth: (() => { const index = path.findIndex((cash, month) => month > 0 && cash < 0); return index < 0 ? null : index; })(),
    };
  };
  const scenarios = { bull: summarize('bull'), base: summarize('base'), bear: summarize('bear') };
  const selected = scenarios[input.mode];
  const lossAt24 = Math.max(0, baseline[24] - paths[input.mode][24]);
  const goals: DecisionGoalImpact[] = state.goals.filter((g) => g.kind !== 'emergency').map((g) => {
    const horizon = clamp(monthsBetween(state.today, g.targetMonth), 0, 24);
    const lost = Math.max(0, baseline[horizon] - paths[input.mode][horizon]);
    const estimatedDelay = g.monthlyContribution > 0 ? Math.ceil(lost / g.monthlyContribution) : null;
    return {
      id: g.id, title: g.title, kind: g.kind, targetMonth: g.targetMonth,
      delayMonths: estimatedDelay !== null && estimatedDelay <= 24 ? Math.max(0, estimatedDelay) : null,
    };
  });
  const suggestions: DecisionSimulationAnalysis['suggestions'] = [];
  if (selected.runwayAfter < reserveTarget) suggestions.push({ key: 'reserve', title: 'Tăng quỹ dự phòng', body: `Cần thêm khoảng ${selected.extraReserveMonths} tháng chi phí sinh hoạt để đạt mức an toàn đã đặt.` });
  if (lossAt24 > 0 && risky > 0) suggestions.push({ key: 'portfolio', title: 'Giảm rủi ro tập trung', body: 'Rà soát phần tài sản biến động mạnh trước khi bắt đầu lựa chọn này.' });
  if (selected.cashShortfallMonth !== null) suggestions.push({ key: 'timing', title: 'Lùi thời điểm bắt đầu', body: `Dòng tiền dự kiến âm từ tháng ${selected.cashShortfallMonth}; cân nhắc tích lũy thêm hoặc giảm chi phí phương án.` });
  if (!suggestions.length) suggestions.push({ key: 'review', title: 'Tiếp tục theo dõi kế hoạch', body: 'Các giả định hiện tại vẫn giữ được quỹ an toàn trong khoảng mô phỏng 24 tháng.' });

  return {
    choiceId: choice.id, choiceTitle: choice.title, optionId: option.id, optionTitle: option.title,
    mode: input.mode, shock: input.shock, params: input.params,
    basis: 'Ước tính tất định từ thu nhập, chi tiêu, tài sản, mục tiêu và phương án hiện có. Giá trị tài sản và thu nhập tương lai có thể khác.',
    projection, scenarios, selected, goals, suggestions,
  };
}
