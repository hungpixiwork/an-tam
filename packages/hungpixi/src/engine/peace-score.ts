import type { PeaceScoreResult } from '../types/domain';

export interface PeaceScoreInput {
  cash: number;
  essentialMonthlyExpense: number;
  targetMonths?: number;
  goalCompletionAverage?: number; // 0..1
  volatileAssetsRatio?: number; // 0..1
  postDebtSavingsRatio?: number; // 0..1
}

/**
 * Tính toán Điểm An Tâm (Peace Score) chuẩn mực từ 0 đến 100 điểm.
 * Dựa trên 4 trụ cột tài chính trong ma trận Issue #4 của An Tâm AI.
 */
export function calculatePeaceScore(input: PeaceScoreInput): PeaceScoreResult {
  const targetMonths = input.targetMonths || 6;
  const essential = Math.max(1, input.essentialMonthlyExpense);
  const actualMonths = input.cash / essential;

  // 1. Điểm Quỹ dự phòng (Tối đa 30đ)
  const emergencyScore = Math.min(30, (actualMonths / targetMonths) * 30);

  // 2. Điểm Tiến độ Mục tiêu (Tối đa 30đ)
  const goalRate = Math.max(0, Math.min(1, input.goalCompletionAverage ?? 0.5));
  const goalsScore = goalRate * 30;

  // 3. Điểm Mức độ Rủi ro Phù hợp (Tối đa 20đ)
  // Khuyến nghị tài sản biến động cao <= 40%
  const volatileRatio = input.volatileAssetsRatio ?? 0.3;
  let riskScore = 20;
  if (volatileRatio > 0.4) {
    riskScore = Math.max(5, 20 - (volatileRatio - 0.4) * 30);
  }

  // 4. Điểm Dòng tiền Thặng dư (Tối đa 20đ)
  // Khuyến nghị để dành >= 20% thu nhập sau trả nợ
  const savingsRatio = Math.max(0, input.postDebtSavingsRatio ?? 0.2);
  const cashflowScore = Math.min(20, (savingsRatio / 0.2) * 20);

  const total = Math.round(emergencyScore + goalsScore + riskScore + cashflowScore);

  let level: 'stable' | 'watch' | 'action' = 'stable';
  if (total < 60) level = 'action';
  else if (total < 80) level = 'watch';

  return {
    total,
    level,
    factors: {
      emergency: {
        score: Math.round(emergencyScore * 10) / 10,
        max: 30,
        detail: `Đủ ${actualMonths.toFixed(1)} / ${targetMonths} tháng chi tiêu thiết yếu`,
      },
      goals: {
        score: Math.round(goalsScore * 10) / 10,
        max: 30,
        detail: `Đạt ${Math.round(goalRate * 100)}% kế hoạch mục tiêu`,
      },
      riskFit: {
        score: Math.round(riskScore * 10) / 10,
        max: 20,
        detail: `Tài sản biến động ${Math.round(volatileRatio * 100)}% (Khuyến nghị ≤ 40%)`,
      },
      cashflow: {
        score: Math.round(cashflowScore * 10) / 10,
        max: 20,
        detail: `Để dành ${Math.round(savingsRatio * 100)}% thu nhập sau trả nợ`,
      },
    },
  };
}
