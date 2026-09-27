// Trang 3 — Quỹ an toàn & mục tiêu: số tháng an toàn, kế hoạch 6/12 tháng, "nếu mất việc", mục tiêu theo kỳ hạn, gợi ý để dành thêm.

import type { Goal, GoalHorizon, IncomeProfile, Transaction, UserState } from '../types/domain';
import type { GoalAcceleration, SafetyData, SafetyGoalItem, SafetyPlan, SafetyStatus, SavingIdea } from '../types/api/safety';
import { monthsBetween } from './month';
import { emergencyAmount, emergencyMonths, savingsCapacity } from './peace';

/** Kế hoạch mặc định: đạt 6 tháng an toàn trong nửa năm. */
const DEFAULT_PLAN_MONTHS = 6;
/** Tỷ lệ cắt giảm đề xuất cho ăn uống / mua sắm – giải trí. */
const TRIM_SHARE = 0.2;
const STEP = 100_000;

const roundUp = (v: number, step = STEP) => Math.ceil(v / step) * step;
const roundDown = (v: number, step: number) => Math.floor(v / step) * step;

export function safetyStatus(months: number): SafetyStatus {
  if (months < 3) return 'danger';
  if (months < 6) return 'unsafe';
  if (months < 12) return 'safe';
  return 'very_safe';
}

/** Kỳ hạn mục tiêu: người dùng chọn, nếu chưa chọn thì suy từ số tháng còn lại. */
export function goalHorizon(goal: Goal, today: string): GoalHorizon {
  if (goal.horizon) return goal.horizon;
  const left = monthsBetween(today, goal.targetMonth);
  return left <= 12 ? 'short' : left <= 36 ? 'mid' : 'long';
}

/** Kế hoạch 6 và 12 tháng chi tiêu thiết yếu. */
export function safetyPlans(state: UserState): [SafetyPlan, SafetyPlan] {
  const essential = state.profile.monthlyExpense;
  const amount = emergencyAmount(state);
  const capacity = savingsCapacity(state);
  const goal = state.goals.find((g) => g.kind === 'emergency');

  const make = (months: 6 | 12, duration: number): SafetyPlan => {
    const targetAmount = months * essential;
    const gap = Math.max(0, targetAmount - amount);
    const d = gap > 0 ? Math.max(1, duration) : 0;
    const monthly = d > 0 ? roundUp(gap / d) : 0;
    return { months, targetAmount, gap, monthly, duration: d, active: !!goal && goal.targetAmount === targetAmount && goal.monthlyContribution === monthly };
  };

  const p6 = make(6, DEFAULT_PLAN_MONTHS);
  const gap12 = Math.max(0, 12 * essential - amount);
  // Mốc 12 tháng: giữ nhịp của kế hoạch 6 tháng (hoặc toàn bộ phần dư nếu lớn hơn)
  const pace = Math.max(capacity, p6.monthly, 1);
  const p12 = make(12, Math.max(p6.duration + 1, Math.ceil(gap12 / pace)));
  return [p6, p12];
}

/** Ý tưởng để dành thêm từ chi tiêu tháng gần nhất + mục tiêu thu nhập. */
export function savingIdeas(recent: Transaction[], income: IncomeProfile | null): SavingIdea[] {
  const expenses = recent.filter((t) => t.kind === 'expense');
  const latest = expenses.map((t) => t.occurredOn.slice(0, 7)).sort().at(-1);
  const sum = (cats: string[]) => expenses.filter((t) => t.occurredOn.startsWith(latest ?? '') && cats.includes(t.category)).reduce((s, t) => s + t.amount, 0);
  const ideas: SavingIdea[] = [
    { key: 'trim_food', amount: roundUp(sum(['food']) * TRIM_SHARE) },
    { key: 'trim_shopping', amount: roundUp(sum(['shopping', 'entertainment']) * TRIM_SHARE) },
    // Một phần ba khoảng cách tới mục tiêu thu nhập — bước đầu vừa sức
    { key: 'side_income', amount: income ? roundDown(Math.max(0, income.targetIncome - income.currentIncome) / 3, 500_000) : 0 },
  ];
  return ideas.filter((i) => i.amount > 0);
}

const monthsNeeded = (remaining: number, monthly: number) => (monthly > 0 ? Math.ceil(remaining / monthly) : null);

/** Mỗi mục tiêu sớm hơn bao nhiêu tháng nếu dồn thêm `extra` mỗi tháng. Quỹ dự phòng tính theo kế hoạch 6 tháng. */
export function goalAccelerations(state: UserState, extra: number, plan6: SafetyPlan): GoalAcceleration[] {
  if (extra <= 0) return [];
  const out: GoalAcceleration[] = [];
  for (const g of state.goals) {
    const emergency = g.kind === 'emergency';
    const remaining = emergency ? plan6.gap : g.targetAmount - g.currentAmount;
    const monthly = emergency ? plan6.monthly : g.monthlyContribution;
    const base = monthsNeeded(remaining, monthly);
    if (remaining <= 0 || base === null) continue;
    const faster = monthsNeeded(remaining, monthly + extra)!;
    out.push({ goalId: g.id, title: g.title, icon: g.icon ?? null, monthsSooner: Math.max(0, base - faster) });
  }
  return out;
}

export function buildSafety(state: UserState, opts: { recent?: Transaction[]; income?: IncomeProfile | null } = {}): SafetyData {
  const essential = state.profile.monthlyExpense;
  const amount = emergencyAmount(state);
  const months = Math.round(emergencyMonths(state, amount) * 10) / 10;
  const goal = state.goals.find((g) => g.kind === 'emergency');
  const plans = safetyPlans(state);

  const goals: SafetyGoalItem[] = [...state.goals]
    .sort((a, b) => Number(b.kind === 'emergency') - Number(a.kind === 'emergency') || monthsBetween(state.today, a.targetMonth) - monthsBetween(state.today, b.targetMonth))
    .map((g) => ({
      goal: g,
      horizon: goalHorizon(g, state.today),
      essential: g.kind === 'emergency',
      progress: g.targetAmount > 0 ? Math.min(1, g.currentAmount / g.targetAmount) : 0,
      monthsLeft: Math.max(0, monthsBetween(state.today, g.targetMonth)),
    }));
  const counts = { all: goals.length, short: 0, mid: 0, long: 0 };
  for (const g of goals) counts[g.horizon]++;

  const ideas = savingIdeas(opts.recent ?? [], opts.income ?? null);
  const extraMonthly = ideas.reduce((s, i) => s + i.amount, 0);
  const [p6] = plans;

  return {
    ready: essential > 0,
    essentialMonthly: essential,
    fund: { amount, months, targetMonths: state.profile.emergencyTargetMonths || 6, target6: p6.targetAmount, gap6: p6.gap, goalId: goal?.id ?? null },
    plans,
    jobLoss: {
      months,
      status: safetyStatus(months),
      steps: [
        { key: 'current', months },
        { key: 'safe', months: 6 },
        { key: 'very_safe', months: 12 },
      ],
    },
    goals,
    counts,
    advice: {
      ideas,
      extraMonthly,
      fundMonthsFrom: p6.duration,
      fundMonthsTo: p6.gap > 0 ? monthsNeeded(p6.gap, p6.monthly + extraMonthly)! : 0,
      accelerations: goalAccelerations(state, extraMonthly, p6),
    },
  };
}
