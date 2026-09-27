// Chia tiền để dành cho các mục tiêu + danh mục đề xuất + các bước chuyển tiền.
// Thuần: cùng đầu vào → cùng kết quả. Khả năng đạt dùng lại goals.ts, quỹ dự phòng dùng lại safety.ts.

import type { AssetCategory, Goal, UserState } from '../types/domain';
import type { MixShares, RebalanceReason, RebalanceStep, SavingsFix, SavingsItem, SavingsPlan, SavingsStatus, TargetPortfolio } from '../types/api/allocation';
import { expectedCompletion, goalProbability, nearestMajorGoal, requiredMonthly } from './goals';
import { addMonths, monthsBetween } from './month';
import { emergencyAmount, recommendedRiskyShare, savingsCapacity } from './peace';
import { CATEGORY_ORDER, isInvestment } from './portfolio';
import { safetyPlans } from './safety';

/**
 * Mọi giả định của phần chia tiền / danh mục đề xuất ở một chỗ.
 * TODO: cập nhật theo nghiên cứu issue #1 (Uyên) — các con số dưới đây là mức khởi điểm hợp lý, chưa hiệu chỉnh.
 */
export const ALLOCATION_ASSUMPTIONS = {
  /** Nợ có lãi suất năm từ mức này (basis point) được xem là "lãi cao" → nên trả bớt sớm. */
  highInterestBp: 1200,
  /** Muốn trả hết nợ lãi cao trong bao nhiêu tháng. */
  debtPayoffMonths: 24,
  /** Lượt đầu, quỹ dự phòng nhận tối đa phần này của tiền dư — để các mục tiêu khác vẫn tiến lên; lượt sau được bù phần còn lại. */
  emergencyFirstShare: 0.6,
  /** Số tháng lấp quỹ dự phòng khi số tháng mục tiêu không phải 6 / 12. */
  emergencyFillMonths: 6,
  /** Phần tài sản biến động chia cho quỹ mở / cổ phiếu (quỹ đa dạng hơn nên nhiều hơn). */
  riskySplit: { fund: 0.6, stock: 0.4 },
  /** Phần an toàn chia cho trái phiếu / tiền mặt / vàng & khác. */
  safeSplit: { bond: 0.6, cash: 0.25, other: 0.15 },
  /** Cổ phiếu công ty mình tối đa bao nhiêu phần danh mục đầu tư. */
  employerStockCap: 0.1,
  /** Bước chuyển tiền: tối thiểu, làm tròn, tối đa số bước. */
  minStep: 5_000_000,
  stepRound: 1_000_000,
  maxSteps: 4,
  /** Làm tròn tiền để dành hằng tháng. */
  monthlyRound: 100_000,
} as const;

const A = ALLOCATION_ASSUMPTIONS;
const RISKY: AssetCategory[] = ['stock', 'fund'];
const floorTo = (v: number, step: number) => Math.floor(Math.max(0, v) / step) * step;
const ceilTo = (v: number, step: number) => Math.ceil(Math.max(0, v) / step) * step;

const statusOf = (required: number, suggested: number): SavingsStatus => (required <= 0 ? 'du_du' : suggested >= required ? 'du' : 'thieu');

/** Tháng trả hết nợ với số trả mỗi tháng (tính lãi); null nếu không trả hết trong 50 năm. */
function payoffMonth(today: string, balance: number, payment: number, rateBp: number): string | null {
  const r = rateBp / 10_000 / 12;
  let left = balance;
  for (let n = 0; n <= 600; n++) {
    if (left <= 0) return addMonths(today, n);
    left = left * (1 + r) - payment;
  }
  return null;
}

interface Draft {
  item: SavingsItem;
  goal: Goal | null;
  targetMonth: string | null;
}

/** Quỹ dự phòng dưới dạng mục tiêu (dùng mục tiêu có sẵn nếu có) với đích = số tháng chi tiêu mong muốn. */
function emergencyDraft(state: UserState): Draft | null {
  const expense = state.profile.monthlyExpense;
  if (expense <= 0) return null;
  const months = state.profile.emergencyTargetMonths || 6;
  const existing = state.goals.find((g) => g.kind === 'emergency') ?? null;
  const have = emergencyAmount(state);
  const target = months * expense;
  const plan = months === 6 || months === 12 ? safetyPlans(state).find((p) => p.months === months) : undefined;
  const gap = Math.max(0, target - have);
  const required = plan ? plan.monthly : gap > 0 ? ceilTo(gap / A.emergencyFillMonths, A.monthlyRound) : 0;
  const targetMonth = existing?.targetMonth && monthsBetween(state.today, existing.targetMonth) > 0 ? existing.targetMonth : addMonths(state.today, plan?.duration || A.emergencyFillMonths);
  const goal: Goal = existing
    ? { ...existing, targetAmount: Math.max(target, 1), currentAmount: have, targetMonth }
    : { id: '', kind: 'emergency', title: 'Quỹ dự phòng', targetAmount: Math.max(target, 1), currentAmount: have, targetMonth, monthlyContribution: 0, priority: 1, icon: 'umbrella' };
  return {
    goal,
    targetMonth,
    item: {
      kind: 'emergency', goalId: existing?.id ?? null, title: existing?.title ?? 'Quỹ dự phòng', icon: existing?.icon ?? 'umbrella',
      required, suggested: 0, current: existing?.monthlyContribution ?? 0, status: 'du_du',
      probabilityBefore: null, probabilityAfter: null, completionBefore: null, completionAfter: null,
    },
  };
}

/** Kế hoạch chia tiền dư hằng tháng: quỹ dự phòng → nợ lãi cao → mục tiêu theo ưu tiên rồi theo hạn. Không bao giờ vượt tiền dư. */
export function allocateSavings(state: UserState): SavingsPlan {
  const capacity = savingsCapacity(state);
  let remaining = floorTo(capacity, A.monthlyRound);

  const emergency = emergencyDraft(state);
  const debts: Draft[] = (state.liabilities ?? [])
    .filter((l) => l.rateBp >= A.highInterestBp && l.balance > 0)
    .map((l) => ({
      goal: null,
      targetMonth: addMonths(state.today, A.debtPayoffMonths),
      item: {
        kind: 'debt', goalId: null, liabilityId: l.id, title: l.name, icon: 'credit-card',
        required: ceilTo(l.balance / A.debtPayoffMonths - l.monthlyPayment, A.monthlyRound), suggested: 0, current: 0, status: 'du_du',
        probabilityBefore: null, probabilityAfter: null,
        completionBefore: payoffMonth(state.today, l.balance, l.monthlyPayment, l.rateBp), completionAfter: null,
      },
    }));
  const goals: Draft[] = state.goals
    .filter((g) => g.kind !== 'emergency')
    .sort((a, b) => a.priority - b.priority || monthsBetween(state.today, a.targetMonth) - monthsBetween(state.today, b.targetMonth))
    .map((g) => ({
      goal: g,
      targetMonth: g.targetMonth,
      item: {
        kind: 'goal', goalId: g.id, title: g.title, icon: g.icon ?? null,
        required: requiredMonthly(g, state), suggested: 0, current: g.monthlyContribution, status: 'du_du',
        probabilityBefore: null, probabilityAfter: null, completionBefore: null, completionAfter: null,
      },
    }));

  const give = (d: Draft, cap = Infinity) => {
    const amount = Math.min(d.item.required - d.item.suggested, remaining, floorTo(cap, A.monthlyRound));
    if (amount <= 0) return;
    d.item.suggested += amount;
    remaining -= amount;
  };

  const others = [...debts, ...goals].some((d) => d.item.required > 0);
  if (emergency) give(emergency, others ? remaining * A.emergencyFirstShare : Infinity);
  for (const d of debts) give(d);
  for (const d of goals) give(d);
  if (emergency) give(emergency); // lượt 2: bù phần quỹ dự phòng còn thiếu

  const drafts = [...(emergency ? [emergency] : []), ...debts, ...goals];
  const fixes: SavingsFix[] = [];
  for (const d of drafts) {
    const it = d.item;
    it.status = statusOf(it.required, it.suggested);
    if (d.goal) {
      it.probabilityBefore = goalProbability(d.goal, state, { monthlyContribution: it.current });
      it.probabilityAfter = goalProbability(d.goal, state, { monthlyContribution: it.suggested });
      it.completionBefore = expectedCompletion(d.goal, state, { monthlyContribution: it.current });
      it.completionAfter = expectedCompletion(d.goal, state, { monthlyContribution: it.suggested });
    } else {
      const l = state.liabilities!.find((x) => x.id === it.liabilityId)!;
      it.completionAfter = payoffMonth(state.today, l.balance, l.monthlyPayment + it.suggested, l.rateBp);
    }
    if (it.status === 'thieu' && d.goal) {
      fixes.push({
        goalId: it.goalId,
        title: it.title,
        extraMonthly: it.required - it.suggested,
        delayMonths: it.completionAfter && d.targetMonth ? Math.max(0, monthsBetween(d.targetMonth, it.completionAfter)) : null,
      });
    }
  }

  const items = drafts.map((d) => d.item);
  const allocated = items.reduce((s, i) => s + i.suggested, 0);
  return {
    capacity,
    items,
    allocated,
    unallocated: Math.max(0, capacity - allocated),
    shortfall: items.reduce((s, i) => s + Math.max(0, i.required - i.suggested), 0),
    fixes,
  };
}

const emptyMix = (): MixShares => ({ cash: 0, bond: 0, fund: 0, stock: 0, other: 0 });

/** Danh mục đề xuất theo thời gian tới mục tiêu lớn gần nhất; phần quỹ dự phòng nằm trong danh mục giữ ở tiền mặt. */
export function targetPortfolio(state: UserState): TargetPortfolio {
  const inv = state.holdings.filter(isInvestment);
  const base = inv.reduce((s, h) => s + h.value, 0);
  const current = emptyMix();
  for (const h of inv) current[h.category] += base > 0 ? h.value / base : 0;

  // Quỹ dự phòng trước hết nằm ở tiền mặt ngoài danh mục; phần còn lại (nếu có) đang nằm trong tiền mặt của danh mục → giữ nguyên
  const outsideCash = state.holdings.filter((h) => h.category === 'cash' && !isInvestment(h)).reduce((s, h) => s + h.value, 0);
  const insideCash = inv.filter((h) => h.category === 'cash').reduce((s, h) => s + h.value, 0);
  const emergencyCash = Math.min(insideCash, Math.max(0, emergencyAmount(state) - outsideCash));

  const major = nearestMajorGoal(state);
  const months = major ? Math.max(0, monthsBetween(state.today, major.targetMonth)) : 240;
  const riskyShare = recommendedRiskyShare(months);

  // Chia theo tỷ lệ (base = 0 vẫn trả về tỷ lệ gợi ý cho người mới)
  const reserve = base > 0 ? emergencyCash / base : 0;
  const rest = 1 - reserve;
  const target: MixShares = {
    cash: reserve + rest * (1 - riskyShare) * A.safeSplit.cash,
    bond: rest * (1 - riskyShare) * A.safeSplit.bond,
    other: rest * (1 - riskyShare) * A.safeSplit.other,
    fund: rest * riskyShare * A.riskySplit.fund,
    stock: rest * riskyShare * A.riskySplit.stock,
  };

  const employerValue = inv.filter((h) => h.isEmployerStock).reduce((s, h) => s + h.value, 0);
  return {
    base,
    current,
    target,
    riskyShare,
    horizonGoal: major ? { title: major.title, months } : null,
    emergencyCash,
    employerCap: Math.round(base * A.employerStockCap),
    employerValue,
  };
}

function reasonFor(from: AssetCategory, to: AssetCategory, fromEmployer: boolean, t: TargetPortfolio): RebalanceReason {
  if (fromEmployer) return 'employer_cap';
  if (to === 'cash' && t.emergencyCash > 0) return 'emergency_cash';
  const riskyFrom = RISKY.includes(from);
  const riskyTo = RISKY.includes(to);
  if (riskyFrom && !riskyTo) return 'too_risky';
  if (!riskyFrom && riskyTo) return 'more_growth';
  return 'balance';
}

/** ≤ 4 bước "Chuyển X đ từ A sang B" để đưa danh mục hiện tại về danh mục đề xuất. Mỗi bước là một lần chuyển nên tổng thay đổi = 0. */
export function rebalanceSteps(state: UserState, target: TargetPortfolio = targetPortfolio(state)): RebalanceStep[] {
  if (target.base <= 0) return [];
  const diff = {} as Record<AssetCategory, number>;
  for (const c of CATEGORY_ORDER) diff[c] = (target.target[c] - target.current[c]) * target.base;

  // Cổ phiếu công ty vượt giới hạn phải bán; nếu nhiều hơn phần cổ phiếu cần giảm → phần dôi ra chuyển sang quỹ (đa dạng hơn)
  let employerExcess = Math.max(0, target.employerValue - target.employerCap);
  const stockSell = Math.max(0, -diff.stock);
  if (employerExcess > stockSell) {
    diff.stock -= employerExcess - stockSell;
    diff.fund += employerExcess - stockSell;
  }

  const sellers = CATEGORY_ORDER.filter((c) => diff[c] < 0).map((c) => ({ c, left: -diff[c] })).sort((a, b) => b.left - a.left);
  const buyers = CATEGORY_ORDER.filter((c) => diff[c] > 0).map((c) => ({ c, left: diff[c] })).sort((a, b) => b.left - a.left);
  const steps: RebalanceStep[] = [];
  for (const s of sellers) {
    for (const b of buyers) {
      if (steps.length >= A.maxSteps) break;
      const amount = Math.round(Math.min(s.left, b.left) / A.stepRound) * A.stepRound;
      if (amount < A.minStep) continue;
      const fromEmployer = s.c === 'stock' && employerExcess >= A.minStep;
      if (fromEmployer) employerExcess = Math.max(0, employerExcess - amount);
      steps.push({ from: s.c, to: b.c, amount, fromEmployer, reason: reasonFor(s.c, b.c, fromEmployer, target) });
      s.left -= amount;
      b.left -= amount;
    }
  }
  return steps;
}
