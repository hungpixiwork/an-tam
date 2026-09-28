// Gói dịch vụ và hạn mức — nguồn duy nhất cho worker (usage, checkout) và client.

export type PlanKey = 'free' | 'plus' | 'bank';

export interface PlanLimits {
  /** Số lượt gọi AI mỗi ngày (giờ Việt Nam). Hết lượt → chế độ cơ bản (luật), không báo lỗi. */
  aiPerDay: number;
  /** Số luật cảnh báo tự đặt tối đa. */
  alertRules: number;
  mcp: boolean;
  deskAsk: boolean;
  autoApprove: boolean;
  /** Giá mỗi tháng (VND); 0 = miễn phí / theo hợp đồng. */
  priceVnd: number;
}

const PLUS: PlanLimits = { aiPerDay: 200, alertRules: 1000, mcp: true, deskAsk: true, autoApprove: true, priceVnd: 49_000 };

export const PLANS: Record<PlanKey, PlanLimits> = {
  free: { aiPerDay: 10, alertRules: 3, mcp: false, deskAsk: false, autoApprove: false, priceVnd: 0 },
  plus: PLUS,
  bank: { ...PLUS, aiPerDay: 1000, priceVnd: 0 },
};

/** Số ngày mỗi lần gia hạn gói Plus. */
export const PLAN_PERIOD_DAYS = 30;

export const PLAN_LABEL: Record<PlanKey, string> = { free: 'Miễn phí', plus: 'Gói Plus', bank: 'Gói Ngân hàng' };

export const isPlanKey = (v: unknown): v is PlanKey => v === 'free' || v === 'plus' || v === 'bank';

/**
 * Gói đang có hiệu lực: gói trả phí hết hạn (plan_until đã qua) → 'free'.
 * plan_until NULL = không hết hạn (vd. gói ngân hàng theo hợp đồng).
 */
export function effectivePlan(plan: string | null | undefined, planUntil: string | null | undefined, now: Date = new Date()): PlanKey {
  if (!isPlanKey(plan) || plan === 'free') return 'free';
  if (planUntil && Date.parse(planUntil) <= now.getTime()) return 'free';
  return plan;
}
