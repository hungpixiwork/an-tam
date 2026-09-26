import type { SpendingTag, Transaction } from '../types/domain';
import { formatVnd } from '../format';

export const SPENDING_TAGS: { tag: SpendingTag; label: string; icon: string }[] = [
  { tag: 'essential', label: 'Thiết yếu', icon: 'shield-check' },
  { tag: 'useful', label: 'Hữu ích', icon: 'wrench' },
  { tag: 'joy', label: 'Niềm vui', icon: 'heart' },
  { tag: 'growth', label: 'Phát triển', icon: 'trending-up' },
  { tag: 'regret', label: 'Không đáng', icon: 'thumbs-down' },
];

export interface TagSummary {
  tag: SpendingTag | 'untagged';
  label: string;
  amount: number;
  pct: number;
  count: number;
}

export interface SpendingSummary {
  totalExpense: number;
  tagged: number;
  untagged: number;
  byTag: TagSummary[];
  optimizable: number;
  valueSpending: number;
  insight: string | null;
}

export function spendingSummary(transactions: Transaction[]): SpendingSummary {
  const expenses = transactions.filter((t) => t.kind === 'expense');
  let totalExpense = 0;
  let tagged = 0;
  let untagged = 0;
  
  const byTagMap = new Map<SpendingTag | 'untagged', { amount: number; count: number }>();
  
  for (const t of expenses) {
    totalExpense += t.amount;
    const tag = t.valueTag || 'untagged';
    if (tag !== 'untagged') {
      tagged++;
    } else {
      untagged++;
    }
    const current = byTagMap.get(tag) || { amount: 0, count: 0 };
    byTagMap.set(tag, { amount: current.amount + t.amount, count: current.count + 1 });
  }

  const byTag: TagSummary[] = [];
  
  const tags: (SpendingTag | 'untagged')[] = ['essential', 'useful', 'joy', 'growth', 'regret', 'untagged'];
  for (const t of tags) {
    const data = byTagMap.get(t) || { amount: 0, count: 0 };
    if (data.count > 0 || t !== 'untagged') {
      let label = 'Chưa phân loại';
      if (t !== 'untagged') {
        label = SPENDING_TAGS.find(x => x.tag === t)?.label || '';
      }
      
      byTag.push({
        tag: t,
        label,
        amount: data.amount,
        pct: totalExpense > 0 ? data.amount / totalExpense : 0,
        count: data.count,
      });
    }
  }

  const regret = byTag.find(t => t.tag === 'regret')?.amount || 0;
  const growth = byTag.find(t => t.tag === 'growth')?.amount || 0;
  const joy = byTag.find(t => t.tag === 'joy')?.amount || 0;

  let insight: string | null = null;
  if (tagged >= 5) {
    if (regret > 0.1 * totalExpense) {
      insight = `Khoản dễ tối ưu nhất có thể là ${formatVnd(regret)}.`;
    } else if (growth > 0) {
      insight = `Bạn đã đầu tư ${formatVnd(growth)} cho phát triển bản thân tháng này.`;
    }
  }

  return {
    totalExpense,
    tagged,
    untagged,
    byTag: byTag.sort((a, b) => b.amount - a.amount),
    optimizable: regret,
    valueSpending: growth + joy,
    insight,
  };
}
