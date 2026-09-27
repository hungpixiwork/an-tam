// Trang 3 — Quỹ an toàn & mục tiêu. GET /api/safety, PUT /api/safety/target.

import type { Goal, GoalHorizon } from '../domain';

export type SafetyStatus = 'danger' | 'unsafe' | 'safe' | 'very_safe';

export interface SafetyPlan {
  /** Mốc số tháng chi tiêu thiết yếu (6 hoặc 12). */
  months: 6 | 12;
  targetAmount: number;
  gap: number;
  /** Để dành mỗi tháng / trong bao nhiêu tháng. 0 khi đã đạt. */
  monthly: number;
  duration: number;
  /** Kế hoạch này đang được áp dụng cho mục tiêu quỹ dự phòng. */
  active: boolean;
}

export interface SafetyGoalItem {
  goal: Goal;
  horizon: GoalHorizon;
  essential: boolean;
  progress: number;
  /** Số tháng còn lại tới hạn (≥ 0). */
  monthsLeft: number;
}

export interface SavingIdea {
  key: 'trim_food' | 'trim_shopping' | 'side_income';
  amount: number;
}

export interface GoalAcceleration {
  goalId: string;
  title: string;
  icon: string | null;
  /** Sớm hơn bao nhiêu tháng khi dồn thêm `extraMonthly` vào mục tiêu này. */
  monthsSooner: number;
}

export interface SafetyData {
  ready: boolean;
  /** Chi tiêu thiết yếu mỗi tháng (dùng để quy đổi ra số tháng an toàn). */
  essentialMonthly: number;
  fund: { amount: number; months: number; targetMonths: number; target6: number; gap6: number; goalId: string | null };
  plans: [SafetyPlan, SafetyPlan];
  jobLoss: { months: number; status: SafetyStatus; steps: { key: 'current' | 'safe' | 'very_safe'; months: number }[] };
  goals: SafetyGoalItem[];
  counts: Record<'all' | GoalHorizon, number>;
  advice: {
    ideas: SavingIdea[];
    extraMonthly: number;
    /** Quỹ an toàn 6 tháng: số tháng theo kế hoạch hiện tại → khi để dành thêm. */
    fundMonthsFrom: number;
    fundMonthsTo: number;
    accelerations: GoalAcceleration[];
  };
}

export interface SafetyTargetInput {
  months: 6 | 12;
}
