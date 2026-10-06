import type { SpendingTag, Transaction } from '../types/domain';

export interface SpendingSummary {
  totalExpense: number;
  byTag: Record<SpendingTag, number>;
  topTag: SpendingTag;
  healthScore: number; // 0..100
  insight: string;
}

/**
 * Phân tích ý định chi tiêu (Intentional Spending Framework) của An Tâm AI.
 */
export function analyzeSpendingIntent(transactions: Transaction[]): SpendingSummary {
  const expenses = transactions.filter((t) => t.kind === 'expense');
  const total = expenses.reduce((s, t) => s + t.amount, 0);

  const byTag: Record<SpendingTag, number> = {
    essential: 0,
    useful: 0,
    joy: 0,
    growth: 0,
    regret: 0,
    untagged: 0,
  };

  for (const t of expenses) {
    const tag = t.valueTag || 'untagged';
    byTag[tag] = (byTag[tag] || 0) + t.amount;
  }

  let topTag: SpendingTag = 'essential';
  let maxAmount = 0;
  for (const [k, v] of Object.entries(byTag)) {
    if (k !== 'untagged' && v > maxAmount) {
      maxAmount = v;
      topTag = k as SpendingTag;
    }
  }

  // Điểm sức khỏe chi tiêu: Hối tiếc (regret) trừ điểm nặng, Thiết yếu & Phát triển cộng điểm
  const regretRatio = total > 0 ? byTag.regret / total : 0;
  const growthRatio = total > 0 ? byTag.growth / total : 0;
  const essentialRatio = total > 0 ? byTag.essential / total : 0;

  let healthScore = 75;
  if (regretRatio > 0.1) healthScore -= 25;
  if (growthRatio >= 0.1) healthScore += 15;
  if (essentialRatio > 0.7) healthScore -= 10;
  healthScore = Math.max(0, Math.min(100, healthScore));

  let insight = 'Chi tiêu của bạn cân bằng và có chủ đích rõ ràng.';
  if (regretRatio > 0.15) {
    insight = `Khoản chi mang lại cảm giác tiếc nuối chiếm ${Math.round(regretRatio * 100)}% tổng chi tiêu. Hãy cân nhắc quy tắc trì hoãn mua sắm 48h.`;
  } else if (growthRatio >= 0.1) {
    insight = `Tuyệt vời! Bạn đang dành ${Math.round(growthRatio * 100)}% ngân sách để đầu tư phát triển bản thân và kỹ năng.`;
  }

  return {
    totalExpense: total,
    byTag,
    topTag,
    healthScore,
    insight,
  };
}
