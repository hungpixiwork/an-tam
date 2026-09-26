import type { UserState, IncomeProfile } from '../types/domain';
import type { SpendingSummary } from './spending';
import { monthsBetween } from './month';

export type NbaKey =
  | 'negative_cashflow'
  | 'emergency_low'
  | 'goal_gap'
  | 'income_growth'
  | 'portfolio_risk'
  | 'spending_optimize'
  | 'savings_declining'
  | 'inactivity';

export interface NextBestAction {
  key: NbaKey;
  priority: number;
  title: string;
  description: string;
  actionLabel: string;
  actionTo: string;
}

export function nextBestActions(
  state: UserState,
  opts?: {
    incomeProfile?: IncomeProfile | null;
    spending?: SpendingSummary | null;
    learningHours?: number;
  },
): NextBestAction[] {
  const actions: NextBestAction[] = [];

  // Helper to safely get the latest snapshot
  const latestSnapshot = state.snapshots.length > 0 ? state.snapshots[state.snapshots.length - 1] : null;

  // 1. negative_cashflow (chi > thu)
  // Check latest ledger entry
  const latestLedger = state.ledger.length > 0 ? state.ledger[state.ledger.length - 1] : null;
  if (latestLedger && latestLedger.expense > latestLedger.income) {
    actions.push({
      key: 'negative_cashflow',
      priority: 1,
      title: 'Thu không đủ chi',
      description: 'Tháng vừa qua bạn đã chi tiêu nhiều hơn thu nhập. Hãy xem lại các khoản chi để cân đối lại.',
      actionLabel: 'Xem chi tiêu',
      actionTo: '/thu-chi',
    });
  }

  // 2. emergency_low (quỹ dự phòng < target)
  const targetEmergency = state.profile.monthlyExpense * state.profile.emergencyTargetMonths;
  if (latestSnapshot && latestSnapshot.emergency < targetEmergency) {
    actions.push({
      key: 'emergency_low',
      priority: 2,
      title: 'Quỹ dự phòng đang thấp',
      description: 'Quỹ dự phòng của bạn hiện chưa đủ mục tiêu an toàn. Nên ưu tiên tích lũy thêm.',
      actionLabel: 'Xem mục tiêu',
      actionTo: '/muc-tieu',
    });
  }

  // 3. goal_gap (mục tiêu lớn bị trễ > 6 tháng)
  let goalDelayed = false;
  for (const goal of state.goals) {
    // A simplified check for delay: if currentAmount is significantly behind expected monthly contribution
    const monthsToTarget = monthsBetween(state.today, goal.targetMonth);
    const shortfall = goal.targetAmount - goal.currentAmount;
    if (monthsToTarget > 0 && shortfall > 0) {
      // If we are way behind (e.g. required is much larger than what we are contributing or time is extended)
      // Actually, standard check: if we continue at current monthly contribution, will it take > 6 months longer?
      const monthsAtCurrentRate = goal.monthlyContribution > 0 ? shortfall / goal.monthlyContribution : Infinity;
      if (monthsAtCurrentRate > monthsToTarget + 6) {
        goalDelayed = true;
        break;
      }
    }
  }
  
  if (goalDelayed) {
    actions.push({
      key: 'goal_gap',
      priority: 3,
      title: 'Mục tiêu bị chậm tiến độ',
      description: 'Một số mục tiêu quan trọng của bạn có nguy cơ trễ hạn hơn 6 tháng.',
      actionLabel: 'Điều chỉnh kế hoạch',
      actionTo: '/ke-hoach',
    });
  }

  // 4. income_growth (có income profile nhưng chưa dành time < 2h)
  if (opts?.incomeProfile && (opts.learningHours === undefined || opts.learningHours < 2)) {
    actions.push({
      key: 'income_growth',
      priority: 4,
      title: 'Chưa dành thời gian phát triển kỹ năng',
      description: 'Bạn có mục tiêu tăng thu nhập nhưng tuần qua chưa dành đủ thời gian cho việc học hỏi.',
      actionLabel: 'Lên kế hoạch học tập',
      actionTo: '/tang-thu-nhap',
    });
  }

  // 5. portfolio_risk (tài sản biến động quá cao)
  // Let's say if high volatility assets > 50% of total
  const totalValue = state.holdings.reduce((sum, h) => sum + h.value, 0);
  const highRiskValue = state.holdings.filter(h => h.volatility === 'high').reduce((sum, h) => sum + h.value, 0);
  if (totalValue > 0 && highRiskValue / totalValue > 0.5) {
    actions.push({
      key: 'portfolio_risk',
      priority: 5,
      title: 'Rủi ro danh mục cao',
      description: 'Tỷ trọng các tài sản biến động mạnh trong danh mục của bạn đang khá cao.',
      actionLabel: 'Xem danh mục',
      actionTo: '/danh-muc',
    });
  }

  // 6. spending_optimize (có khoản regret đáng kể)
  if (opts?.spending && opts.spending.optimizable > 0.1 * opts.spending.totalExpense) {
    actions.push({
      key: 'spending_optimize',
      priority: 6,
      title: 'Có khoản chi có thể tối ưu',
      description: 'Một số khoản chi tiêu tháng này được đánh giá là không đáng. Hãy thử tối ưu chúng.',
      actionLabel: 'Xem chi tiêu',
      actionTo: '/thu-chi',
    });
  }

  // 7. savings_declining (3 tháng giảm liên tiếp)
  if (state.snapshots.length >= 4) {
    const s1 = state.snapshots[state.snapshots.length - 1].total;
    const s2 = state.snapshots[state.snapshots.length - 2].total;
    const s3 = state.snapshots[state.snapshots.length - 3].total;
    const s4 = state.snapshots[state.snapshots.length - 4].total;
    if (s1 < s2 && s2 < s3 && s3 < s4) {
      actions.push({
        key: 'savings_declining',
        priority: 7,
        title: 'Tài sản đang giảm',
        description: 'Tổng tài sản của bạn đã giảm trong 3 tháng liên tiếp.',
        actionLabel: 'Xem tổng quan',
        actionTo: '/',
      });
    }
  }

  // Sort by priority and take max 3
  actions.sort((a, b) => a.priority - b.priority);
  const finalActions = actions.slice(0, 3);

  // 8. inactivity (không có gì đáng chú ý -> gợi ý nhẹ)
  if (finalActions.length === 0) {
    finalActions.push({
      key: 'inactivity',
      priority: 8,
      title: 'Mọi thứ đang ổn định',
      description: 'Tình hình tài chính của bạn đang đi đúng hướng. Hãy tiếp tục duy trì nhé!',
      actionLabel: 'Xem tổng quan',
      actionTo: '/',
    });
  }

  return finalActions;
}
