// Kế hoạch an toàn: đề xuất 3 bước và đo tác động trước / sau.

import type { Goal, Holding, UserState } from '../types/domain';
import { formatVnd } from '../format';
import { goalProbability, nearestMajorGoal, projectValue, statsForGoal } from './goals';
import { addMonths } from './month';
import { emergencyAmount, emergencyMonths, freeCashflow, peaceScore } from './peace';
import { portfolioStats } from './portfolio';

/** Tỷ trọng chuyển từ tài sản biến động cao sang trái phiếu. */
const SHIFT_SHARE = 0.1;
/** Số tháng để bù quỹ dự phòng. */
const EMERGENCY_MONTHS_TO_FILL = 8;
/** Phần dòng tiền tự do dồn thêm cho mục tiêu lớn gần nhất (tối đa). */
const EXTRA_GOAL_CAP = 3_000_000;
const CHART_MONTHS = 12;

export type VolatilityLabel = 'Thấp' | 'Vừa phải' | 'Cao';

export const volatilityLabel = (riskyShare: number): VolatilityLabel => (riskyShare >= 0.45 ? 'Cao' : riskyShare >= 0.3 ? 'Vừa phải' : 'Thấp');

export interface PlanMetrics {
  goalProbability: number;
  peaceScore: number;
  emergencyMonths: number;
  volatility: VolatilityLabel;
}

export interface PlanStep {
  key: 'emergency' | 'rebalance' | 'contribution';
  title: string;
  detail: string;
  amount: number;
}

export interface PlanProposal {
  goalTitle: string | null;
  steps: PlanStep[];
  current: PlanMetrics;
  proposed: PlanMetrics;
  /** Xác suất đạt mục tiêu chính theo tháng nếu giữ nguyên / làm theo kế hoạch. */
  chart: { label: string; current: number; proposed: number }[];
  tasks: { title: string; tag: 'Quan trọng' | 'Nên làm' }[];
}

const metrics = (state: UserState, goal: Goal | undefined): PlanMetrics => ({
  goalProbability: goal ? goalProbability(state.goals.find((g) => g.id === goal.id)!, state) : 0,
  peaceScore: peaceScore(state).score,
  emergencyMonths: Math.round(emergencyMonths(state) * 10) / 10,
  volatility: volatilityLabel(portfolioStats(state.holdings).riskyShare),
});

/** Áp 3 bước lên trạng thái (giả định đã hoàn tất). Hàm thuần. */
export function applyPlan(state: UserState, steps: PlanStep[]): UserState {
  let holdings: Holding[] = state.holdings;
  let goals: Goal[] = state.goals;
  const major = nearestMajorGoal(state);
  for (const step of steps) {
    if (step.key === 'emergency') {
      goals = goals.map((g) => (g.kind === 'emergency' ? { ...g, currentAmount: g.currentAmount + step.amount } : g));
    }
    if (step.key === 'rebalance') {
      const high = holdings.filter((h) => h.volatility === 'high');
      const highTotal = high.reduce((s, h) => s + h.value, 0);
      let moved = 0;
      holdings = holdings.map((h) => {
        if (h.volatility !== 'high' || highTotal === 0) return h;
        const cut = Math.round((step.amount * h.value) / highTotal);
        moved += cut;
        return { ...h, value: h.value - cut };
      });
      const bondIdx = holdings.findIndex((h) => h.category === 'bond');
      holdings =
        bondIdx >= 0
          ? holdings.map((h, i) => (i === bondIdx ? { ...h, value: h.value + moved } : h))
          : [...holdings, { id: 'plan-bond', name: 'Quỹ trái phiếu', category: 'bond', value: moved, role: 'Ổn định', volatility: 'low', riskGroup: 'Lãi suất và trái phiếu', isMain: true }];
    }
    if (step.key === 'contribution' && major) {
      goals = goals.map((g) => (g.id === major.id ? { ...g, monthlyContribution: g.monthlyContribution + step.amount } : g));
    }
  }
  return { ...state, holdings, goals };
}

/** Dời trạng thái tới n tháng sau theo giá trị kỳ vọng (dùng cho biểu đồ tiến độ). */
function advance(state: UserState, months: number): UserState {
  return {
    ...state,
    today: addMonths(state.today, months),
    goals: state.goals.map((g) => ({
      ...g,
      currentAmount: Math.round(projectValue(g.currentAmount, g.monthlyContribution, statsForGoal(g, state).expectedReturn, months)),
    })),
  };
}

export function proposePlan(state: UserState): PlanProposal {
  const major = nearestMajorGoal(state);
  const steps: PlanStep[] = [];

  const targetEmergency = state.profile.monthlyExpense * state.profile.emergencyTargetMonths;
  const gap = Math.max(0, targetEmergency - emergencyAmount(state));
  if (gap > 0) {
    const amount = Math.ceil(gap / 10_000_000) * 10_000_000;
    steps.push({ key: 'emergency', title: `Tăng quỹ dự phòng thêm ${formatVnd(amount)}`, detail: `trong ${EMERGENCY_MONTHS_TO_FILL} tháng`, amount });
  }

  const highTotal = state.holdings.filter((h) => h.volatility === 'high').reduce((s, h) => s + h.value, 0);
  if (highTotal > 0) {
    const total = state.holdings.reduce((s, h) => s + h.value, 0);
    steps.push({ key: 'rebalance', title: `Chuyển ${Math.round(SHIFT_SHARE * 100)}% từ nhóm biến động cao`, detail: 'sang quỹ an toàn hơn', amount: Math.round(total * SHIFT_SHARE) });
  }

  if (major) {
    const extra = Math.min(EXTRA_GOAL_CAP, Math.max(1_000_000, Math.round(freeCashflow(state) / 6 / 1_000_000) * 1_000_000));
    steps.push({ key: 'contribution', title: `Mỗi tháng ưu tiên ${formatVnd(extra)} cho mục tiêu`, detail: major.title.toLowerCase(), amount: extra });
  }

  const emergencyStep = steps.find((s) => s.key === 'emergency');
  const planned = applyPlan(state, steps);
  const chart = Array.from({ length: CHART_MONTHS }, (_, i) => {
    const m = i + 1;
    const a = advance(state, m);
    const b = advance(planned, m);
    const pa = major ? goalProbability(a.goals.find((g) => g.id === major.id)!, a) : 0;
    const pb = major ? goalProbability(b.goals.find((g) => g.id === major.id)!, b) : 0;
    return { label: `Tháng ${m}`, current: pa, proposed: pb };
  });

  return {
    goalTitle: major?.title ?? null,
    steps,
    current: metrics(state, major),
    proposed: metrics(planned, major),
    chart,
    tasks: [
      ...(emergencyStep ? [{ title: `Thêm ${formatVnd(Math.ceil(emergencyStep.amount / EMERGENCY_MONTHS_TO_FILL / 1_000_000) * 1_000_000)} vào quỹ dự phòng`, tag: 'Quan trọng' as const }] : []),
      ...(steps.some((s) => s.key === 'rebalance') ? [{ title: 'Giảm bớt một phần quỹ tăng trưởng', tag: 'Nên làm' as const }] : []),
      { title: `Xem lại mục tiêu ${major?.title.toLowerCase() ?? 'chính'}`, tag: 'Nên làm' },
    ],
  };
}
