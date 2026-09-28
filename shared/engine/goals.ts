import type { Goal, UserState } from '../types/domain';
import { monthsBetween, addMonths } from './month';
import { portfolioStats, type PortfolioStats } from './portfolio';

/** Quỹ dự phòng giữ ở kênh an toàn, không theo danh mục đầu tư. */
const EMERGENCY_STATS: PortfolioStats = { expectedReturn: 0.045, volatility: 0.01, riskyShare: 0 };

/** Độ bất định nền (thu nhập, chi tiêu) cộng vào mẫu số của z-score. */
const BASE_UNCERTAINTY = 0.02;
/** Hệ số co biến động: đóng góp đều hằng tháng làm giảm rủi ro thời điểm. */
const CONTRIBUTION_DAMPING = 0.4;
/** Giới hạn tìm tháng hoàn thành (50 năm). */
const MAX_MONTHS = 600;

export const statsForGoal = (goal: Goal, state: UserState): PortfolioStats =>
  goal.kind === 'emergency' ? EMERGENCY_STATS : portfolioStats(state.holdings);

const monthlyRate = (annual: number): number => Math.pow(1 + annual, 1 / 12) - 1;

/** Giá trị kỳ vọng sau n tháng với vốn ban đầu và đóng góp đều. */
export function projectValue(current: number, monthly: number, annualReturn: number, months: number): number {
  const r = monthlyRate(annualReturn);
  const growth = Math.pow(1 + r, months);
  return current * growth + (r === 0 ? monthly * months : (monthly * (growth - 1)) / r);
}

/** Hàm phân phối chuẩn tích lũy (xấp xỉ Abramowitz–Stegun 7.1.26). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

export interface GoalOptions {
  /** Ghi đè đóng góp hằng tháng (mô phỏng / kế hoạch). */
  monthlyContribution?: number;
  /** Ghi đè số tiền hiện có. */
  currentAmount?: number;
  /** Ghi đè giả định danh mục. */
  stats?: PortfolioStats;
  /** Ghi đè tháng mục tiêu. */
  targetMonth?: string;
}

/** Xác suất đạt mục tiêu đúng hạn, 0..1. Tất định: cùng đầu vào → cùng kết quả. */
export function goalProbability(goal: Goal, state: UserState, opts: GoalOptions = {}): number {
  const stats = opts.stats ?? statsForGoal(goal, state);
  const current = opts.currentAmount ?? goal.currentAmount;
  const monthly = opts.monthlyContribution ?? goal.monthlyContribution;
  const months = monthsBetween(state.today, opts.targetMonth ?? goal.targetMonth);
  if (current >= goal.targetAmount) return 0.99;
  if (months <= 0) return 0.01;
  const expected = projectValue(current, monthly, stats.expectedReturn, months);
  const years = months / 12;
  const spread = stats.volatility * Math.sqrt(years) * CONTRIBUTION_DAMPING + BASE_UNCERTAINTY;
  const z = Math.log(expected / goal.targetAmount) / spread;
  return Math.min(0.99, Math.max(0.01, normalCdf(z)));
}

/** Tháng dự kiến đạt mục tiêu theo giá trị kỳ vọng; null nếu quá 50 năm. */
export function expectedCompletion(goal: Goal, state: UserState, opts: GoalOptions = {}): string | null {
  const stats = opts.stats ?? statsForGoal(goal, state);
  const current = opts.currentAmount ?? goal.currentAmount;
  const monthly = opts.monthlyContribution ?? goal.monthlyContribution;
  for (let n = 0; n <= MAX_MONTHS; n++) {
    if (projectValue(current, monthly, stats.expectedReturn, n) >= goal.targetAmount) return addMonths(state.today, n);
  }
  return null;
}

/** Số tiền cần để dành mỗi tháng để giá trị kỳ vọng chạm mục tiêu đúng hạn. */
export function requiredMonthly(goal: Goal, state: UserState, opts: GoalOptions = {}): number {
  const stats = opts.stats ?? statsForGoal(goal, state);
  const current = opts.currentAmount ?? goal.currentAmount;
  const months = monthsBetween(state.today, opts.targetMonth ?? goal.targetMonth);
  if (months <= 0) return Math.max(0, goal.targetAmount - current);
  const gap = goal.targetAmount - projectValue(current, 0, stats.expectedReturn, months);
  if (gap <= 0) return 0;
  const perUnit = projectValue(0, 1, stats.expectedReturn, months);
  return Math.ceil(gap / perUnit / 100_000) * 100_000;
}

export interface GoalInsight {
  goal: Goal;
  progress: number;            // 0..1
  probability: number;         // 0..1
  expectedMonth: string | null;
  delayMonths: number;         // dương = trễ so với hạn
  requiredMonthly: number;
}

export function goalInsights(state: UserState): GoalInsight[] {
  return state.goals.map((goal) => {
    const expectedMonth = expectedCompletion(goal, state);
    return {
      goal,
      progress: Math.min(1, goal.currentAmount / goal.targetAmount),
      probability: goalProbability(goal, state),
      expectedMonth,
      delayMonths: expectedMonth ? monthsBetween(goal.targetMonth, expectedMonth) : MAX_MONTHS,
      requiredMonthly: requiredMonthly(goal, state),
    };
  });
}

/** Mục tiêu lớn chính để đo độ lùi: mua nhà nếu có, không thì mục tiêu có số tiền lớn nhất (trừ quỹ dự phòng). */
export function mainGoal(state: UserState): Goal | undefined {
  return state.goals.find((g) => g.kind === 'home')
    ?? [...state.goals].filter((g) => g.kind !== 'emergency').sort((a, b) => b.targetAmount - a.targetAmount)[0];
}

/** Mục tiêu lớn gần nhất (không tính quỹ dự phòng) — quyết định khẩu vị rủi ro khuyến nghị. */
export function nearestMajorGoal(state: UserState): Goal | undefined {
  return [...state.goals]
    .filter((g) => g.kind !== 'emergency')
    .sort((a, b) => monthsBetween(state.today, a.targetMonth) - monthsBetween(state.today, b.targetMonth) || a.priority - b.priority)[0];
}
