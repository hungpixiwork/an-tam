import type { UserState } from '../types/domain';
import { formatPct, formatVnd } from '../format';
import { goalInsights, nearestMajorGoal } from './goals';
import { monthsBetween } from './month';
import { templateNarrator, capitalize, type Narrator } from './narrate';
import { emergencyAmount, recommendedRiskyShare } from './peace';
import { portfolioStats } from './portfolio';

export type AlertSeverity = 'danger' | 'warning' | 'action';

export interface AlertCandidate {
  ruleKey: string;
  severity: AlertSeverity;
  title: string;
  body: string;
}

/** Số tháng trễ tối thiểu để mở cảnh báo mục tiêu. */
const GOAL_DELAY_THRESHOLD = 6;
/** Vượt tỷ trọng biến động khuyến nghị bao nhiêu thì cảnh báo. */
const VOLATILE_MARGIN = 0.05;

/** Luật cảnh báo. Mỗi rule_key chỉ có tối đa 1 cảnh báo đang mở cho 1 người dùng. */
export function evaluateAlerts(state: UserState, narrator: Narrator = templateNarrator): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];

  for (const insight of goalInsights(state)) {
    if (insight.goal.kind === 'emergency' || insight.delayMonths < GOAL_DELAY_THRESHOLD) continue;
    const vars = { goal: insight.goal.title.toLowerCase(), months: insight.delayMonths };
    alerts.push({
      ruleKey: `goal_delay:${insight.goal.id}`,
      severity: 'danger',
      title: narrator.narrate('alert.goal_delay.title', vars),
      body: narrator.narrate('alert.goal_delay.body', vars),
    });
  }

  const major = nearestMajorGoal(state);
  const recommended = recommendedRiskyShare(major ? monthsBetween(state.today, major.targetMonth) : 240);
  const { riskyShare } = portfolioStats(state.holdings);
  if (riskyShare > recommended + VOLATILE_MARGIN) {
    const vars = { share: formatPct(riskyShare), recommended: formatPct(recommended) };
    alerts.push({
      ruleKey: 'volatile_share',
      severity: 'warning',
      title: narrator.narrate('alert.volatile_share.title', vars),
      body: narrator.narrate('alert.volatile_share.body', vars),
    });
  }

  const target = state.profile.monthlyExpense * state.profile.emergencyTargetMonths;
  const amount = emergencyAmount(state);
  if (target > 0 && amount < target) {
    const vars = { amount: formatVnd(amount), gap: formatVnd(target - amount), target: state.profile.emergencyTargetMonths };
    alerts.push({
      ruleKey: 'emergency_low',
      severity: 'action',
      title: narrator.narrate('alert.emergency_low.title', vars),
      body: narrator.narrate('alert.emergency_low.body', vars),
    });
  }

  // Rule 4: Chi tiêu tháng vượt 110% ngân sách
  if (state.ledger.length > 0) {
    const latest = state.ledger.at(-1)!;
    const budget = state.profile.monthlyExpense;
    if (budget > 0 && latest.expense > budget * 1.1) {
      const pct = formatPct((latest.expense - budget) / budget);
      alerts.push({
        ruleKey: 'spending_over',
        severity: 'warning',
        title: narrator.narrate('alert.spending_over.title', { pct }),
        body: narrator.narrate('alert.spending_over.body', {
          s_cap: capitalize(state.salutation),
          actual: formatVnd(latest.expense),
          budget: formatVnd(budget),
        }),
      });
    }
  }

  // Rule 5: Savings rate giảm 3 tháng liên tiếp
  if (state.ledger.length >= 3) {
    const last3 = state.ledger.slice(-3);
    const rates = last3.map((m) => (m.income > 0 ? (m.income - m.expense) / m.income : 0));
    if (rates[2] < rates[1] && rates[1] < rates[0]) {
      alerts.push({
        ruleKey: 'savings_declining',
        severity: 'action',
        title: narrator.narrate('alert.savings_declining.title'),
        body: narrator.narrate('alert.savings_declining.body'),
      });
    }
  }

  return alerts;
}

export const ALERT_ACTIONS: Record<string, { label: string; to: string }> = {
  goal_delay: { label: 'Xem mục tiêu', to: '/muc-tieu' },
  volatile_share: { label: 'Xem danh mục', to: '/danh-muc' },
  emergency_low: { label: 'Xem kế hoạch', to: '/ke-hoach' },
  spending_over: { label: 'Xem thu chi', to: '/thu-chi' },
  savings_declining: { label: 'Xem tổng quan', to: '/' },
};
