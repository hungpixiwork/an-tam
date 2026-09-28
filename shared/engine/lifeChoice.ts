// Lựa chọn cuộc đời (B1).
// - lifeChoiceReadiness: mức sẵn sàng tài chính (thẻ ở Tổng quan).
// - evaluateLifeChoice: điểm khả thi 0..100 của một phương án =
//     40 số tháng an toàn còn lại + 30 giữ được mục tiêu khác + 20 giá trị nghề nghiệp + 10 điều kiện tiên quyết.
// Có hồ sơ tài chính gộp (signals.ts) → chi phí sống lấy từ chi cố định + chi linh hoạt đã cắt, thu nhập bấp bênh trừ điểm an toàn,
// kịch bản xấu tất định (mất thu nhập 3 tháng + tài sản đầu tư −20%), không dùng mô phỏng ngẫu nhiên.
// Mọi con số là ƯỚC TÍNH từ dữ liệu người dùng nhập — không phải lời khuyên đầu tư.

import type { UserState } from '../types/domain';
import type {
  LifeChoiceEvaluation, LifeChoiceKind, LifeChoiceOptionInput, LifeChoiceVerdict, TextKey,
} from '../types/api';
import { emergencyAmount, savingsCapacity } from './peace';
import { humanCapital, presentValueIncome, RISK_FREE } from './humanCapital';
import type { FinancialSignals } from '../types/api/signals';
import { formatVnd } from '../format';

export interface LifeChoiceReadiness {
  /** Quỹ dự phòng tối thiểu nên có trước khi bắt đầu = số tháng an toàn mục tiêu × chi tiêu tháng. */
  requiredReserve: number;
  reserveMonths: number;
  have: number;
  gap: number;
  /** Số tháng cần chuẩn bị thêm; null = không tính được (chưa có khoản để dành mỗi tháng). */
  monthsNeeded: number | null;
  ready: boolean;
}

export function lifeChoiceReadiness(state: UserState): LifeChoiceReadiness {
  const reserveMonths = state.profile.emergencyTargetMonths || 6;
  const requiredReserve = Math.round(state.profile.monthlyExpense * reserveMonths);
  const have = emergencyAmount(state);
  const gap = Math.max(0, requiredReserve - have);
  const goal = state.goals.find((g) => g.kind === 'emergency');
  // Tốc độ lấp khoảng thiếu: số tiền đang góp vào quỹ dự phòng mỗi tháng, chưa có thì lấy phần để dành được
  const monthly = goal && goal.monthlyContribution > 0 ? goal.monthlyContribution : Math.max(0, savingsCapacity(state));
  const monthsNeeded = gap === 0 ? 0 : monthly > 0 ? Math.ceil(gap / monthly) : null;
  return { requiredReserve, reserveMonths, have, gap, monthsNeeded, ready: requiredReserve > 0 && gap === 0 };
}

/* ───────── Điểm khả thi ───────── */

export const FEASIBILITY_WEIGHTS = { safety: 40, goals: 30, career: 20, prereqs: 10 } as const;
/** Điều kiện tự kiểm tra: quỹ đủ ≥ 12 tháng chi phí trước khi bắt đầu. */
export const RESERVE_PREREQ_MONTHS = 12;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const round1 = (x: number) => Math.round(x * 10) / 10;

/** Tiền có thể dùng khi cần: tiền mặt / tiết kiệm + các khoản trong danh mục đầu tư (không tính nhà, xe). */
export function liquidAssets(state: UserState): number {
  return state.holdings
    .filter((h) => h.category === 'cash' || h.inPortfolio === true || (h.inPortfolio === undefined && h.category !== 'other'))
    .reduce((s, h) => s + h.value, 0);
}

export const monthsCovered = (state: UserState, amount = liquidAssets(state)): number =>
  state.profile.monthlyExpense > 0 ? amount / state.profile.monthlyExpense : 0;

export interface EvaluateContext {
  kind: LifeChoiceKind;
  incomeUpliftPct: number;
  prereqsDone: number;
  prereqsTotal: number;
  /** Hồ sơ tài chính gộp từ dữ liệu thật (signals.ts). Không có → tính như cũ theo chi tiêu tháng. */
  signals?: FinancialSignals;
}

/** Phần chi linh hoạt mặc định cắt được trong thời gian thực hiện phương án. */
export const DEFAULT_CUT_PCT = 0.15;
/** Thu nhập bấp bênh → điểm an toàn chỉ còn 75% (trừ 25% số điểm an toàn). */
export const UNSTABLE_SAFETY_CUT = 0.25;
/** Kịch bản xấu tất định (thay cho mô phỏng ngẫu nhiên): mất thu nhập 3 tháng + tài sản đầu tư giảm 20%. */
export const WORST_CASE = { incomeLossMonths: 3, riskyDropPct: 20 } as const;

/** Phần tiền dùng được ngay nằm ở tài sản có giá lên xuống (cổ phiếu, quỹ, vàng/khác) — không tính tiền mặt, trái phiếu. */
const riskyLiquid = (state: UserState): number =>
  state.holdings
    .filter((h) => h.category !== 'cash' && h.category !== 'bond' && (h.inPortfolio === true || (h.inPortfolio === undefined && h.category !== 'other')))
    .reduce((s, h) => s + h.value, 0);

const OPPORTUNITIES: Record<LifeChoiceKind, string[]> = {
  study: ['promotion', 'network', 'skills', 'international'],
  care: ['family', 'flexible', 'wellbeing'],
  startup: ['ownership', 'promotion', 'skills'],
  switch: ['promotion', 'fit', 'skills'],
  sabbatical: ['rest', 'perspective', 'skills'],
  custom: ['promotion', 'skills'],
};
const KIND_RISK: Record<LifeChoiceKind, string> = {
  study: 'discipline', care: 'career_gap', startup: 'failure', switch: 'restart', sabbatical: 'career_gap', custom: 'discipline',
};

export function evaluateLifeChoice(state: UserState, option: LifeChoiceOptionInput, ctx: EvaluateContext): LifeChoiceEvaluation {
  const E = Math.max(0, state.profile.monthlyExpense);
  const I = Math.max(0, state.profile.monthlyIncome);
  const dur = Math.max(1, Math.round(option.durationMonths));
  const noIncome = Math.min(dur, Math.max(0, Math.round(option.monthsWithoutIncome)));
  const working = dur - noIncome;
  const incomeWorking = Math.max(0, I + option.monthlyIncomeDelta);
  // Chi phí sống trong thời gian thực hiện: có hồ sơ thật → chi cố định + chi linh hoạt đã cắt; không có → chi tiêu tháng
  const sig = ctx.signals;
  const cutPct = clamp01(option.cutPct ?? DEFAULT_CUT_PCT);
  const Ec = sig ? Math.round(sig.expense.fixed + sig.expense.flexible * (1 - cutPct)) : E;

  // Chi phí: học phí + sinh hoạt phí phải tự bỏ tiền (tháng không đủ thu nhập) + chi phí khác
  const living = Math.round(noIncome * Ec + working * Math.max(0, Ec - incomeWorking));
  const tuition = Math.max(0, option.cost);
  const other = Math.max(0, option.otherCost);
  const total = tuition + living + other;
  // Tháng vẫn đi làm mà dư tiền → bù vào chi phí
  const incomeCover = Math.round(working * Math.max(0, incomeWorking - Ec));
  const drain = Math.max(0, total - incomeCover);

  const liquid = liquidAssets(state);
  const shortfall = Math.max(0, drain - liquid);
  const monthsBefore = round1(monthsCovered(state, liquid));
  const monthsAfter = round1(monthsCovered(state, Math.max(0, liquid - drain)));

  // 1) An toàn (40): số tháng còn lại so với mục tiêu quỹ dự phòng của người dùng
  const targetMonths = state.profile.emergencyTargetMonths || 6;
  //    Thu nhập bấp bênh (theo sổ thật) → trừ UNSTABLE_SAFETY_CUT số điểm an toàn
  const unstable = sig?.income.stability === 'bap_benh';
  const safety = FEASIBILITY_WEIGHTS.safety * clamp01(monthsAfter / targetMonths) * (unstable ? 1 - UNSTABLE_SAFETY_CUT : 1);

  // 2) Giữ mục tiêu (30): phần dư mỗi tháng trong thời gian thực hiện có đủ góp cho các mục tiêu khác không
  const contributions = state.goals.filter((g) => g.kind !== 'education').reduce((s, g) => s + g.monthlyContribution, 0);
  const monthlyFree = (working * incomeWorking - dur * Ec) / dur;
  const goalsRatio = shortfall > 0 ? 0 : contributions > 0 ? clamp01(monthlyFree / contributions) : monthlyFree >= 0 ? 1 : 0;
  const goals = FEASIBILITY_WEIGHTS.goals * goalsRatio;

  // 3) Giá trị nghề (20): vốn con người sau khi hoàn thành so với giữ nguyên (humanCapital.ts)
  const birthYear = state.profile.birthYear ?? null;
  const age = birthYear ? Number(state.today.slice(0, 4)) - birthYear : 30;
  const retirementAge = state.profile.retirementAge ?? 60;
  const base = humanCapital({ annualIncome: I * 12, age, retirementAge });
  let careerChangePct = 0;
  if (base.hc > 0) {
    const disc = RISK_FREE + (base.pi ?? 0.03);
    const years = Math.max(0, (base.years ?? 0) - dur / 12);
    const during = working * incomeWorking;
    const after = presentValueIncome(I * 12 * (1 + ctx.incomeUpliftPct / 100), base.g ?? 0.05, disc, years) / Math.pow(1 + disc, dur / 12);
    careerChangePct = (during + after - base.hc) / base.hc;
  }
  // Không đổi → 10/20; +20% vốn con người → 20/20; −20% → 0
  const career = FEASIBILITY_WEIGHTS.career * clamp01(0.5 + careerChangePct / 0.4);

  // 4) Điều kiện tiên quyết (10)
  const prereqs = ctx.prereqsTotal > 0 ? FEASIBILITY_WEIGHTS.prereqs * (ctx.prereqsDone / ctx.prereqsTotal) : 0;

  const feasibility = Math.round(safety + goals + career + prereqs);
  const verdict: LifeChoiceVerdict = feasibility >= 75 && shortfall === 0 ? 'go' : feasibility >= 50 ? 'conditional' : 'wait';

  const save = Math.max(0, savingsCapacity(state));
  const upliftPct = Math.max(0, ctx.incomeUpliftPct);
  const opportunities: TextKey[] = OPPORTUNITIES[ctx.kind].map((key) => ({ key, params: { pct: upliftPct } }));
  const risks: TextKey[] = [];
  if (shortfall > 0) risks.push({ key: 'shortfall', params: { amount: Math.round(shortfall) } });
  if (noIncome > 0) risks.push({ key: 'income_gap', params: { months: noIncome } });
  if (monthsAfter < targetMonths) risks.push({ key: 'low_safety', params: { months: monthsAfter } });
  if (goalsRatio < 1) risks.push({ key: 'goals_paused' });
  risks.push({ key: KIND_RISK[ctx.kind] });

  const pending = ctx.prereqsTotal - ctx.prereqsDone;
  const reserveGap = Math.max(0, targetMonths * E - Math.max(0, liquid - drain));
  const unlock: TextKey =
    shortfall > 0
      ? { key: 'shortfall', params: { amount: Math.round(shortfall), months: save > 0 ? Math.ceil(shortfall / save) : 0 } }
      : reserveGap > 0
        ? { key: 'reserve', params: { amount: Math.round(reserveGap), months: targetMonths } }
        : pending > 0
          ? { key: 'prereqs', params: { n: pending } }
          : { key: 'ready' };

  // Kịch bản xấu tất định, sau khi đã làm phương án: tài sản có giá lên xuống giảm 20% (trên phần còn lại)
  // và mất thu nhập 3 tháng (phải tự trả chi phí sống đã cắt).
  const left = liquid - drain;
  const drop = Math.min(Math.max(0, left), riskyLiquid(state) * (WORST_CASE.riskyDropPct / 100));
  const worstLeft = left - drop - WORST_CASE.incomeLossMonths * Ec;
  const worstCase = { survives: worstLeft >= 0, monthsCovered: round1(monthsCovered(state, Math.max(0, worstLeft))) };

  return {
    feasibility,
    parts: { safety: Math.round(safety), goals: Math.round(goals), career: Math.round(career), prereqs: Math.round(prereqs) },
    monthsBefore,
    monthsAfter,
    monthsDelta: round1(monthsAfter - monthsBefore),
    costs: { tuition, living, other, total },
    funding: { liquid, incomeCover, shortfall },
    careerChangePct: Math.round(careerChangePct * 1000) / 1000,
    prereqsDone: ctx.prereqsDone,
    prereqsTotal: ctx.prereqsTotal,
    opportunities,
    risks: risks.slice(0, 4),
    verdict,
    unlock,
    worstCase,
    ...(sig ? { basis: lifeChoiceBasis(sig, cutPct, worstCase, worstLeft) } : {}),
  };
}

/** Số tháng sổ thật tối thiểu để bỏ nhãn "ước lượng" (khớp mức 'vua' trong signals.ts). */
const ESTIMATE_MONTHS = 2;

/** Câu nói rõ căn cứ của kết luận, bằng tiếng Việt dễ hiểu. */
function lifeChoiceBasis(sig: FinancialSignals, cutPct: number, worst: { survives: boolean; monthsCovered: number }, worstLeft: number): string {
  const n = sig.income.monthsOfData;
  const from = n > 0 ? `Dựa trên ${n} tháng sổ thu chi thật` : 'Dựa trên số bạn tự nhập';
  const parts = [
    `${from}: chi cố định ${formatVnd(sig.expense.fixed)}/tháng, chi linh hoạt ${formatVnd(sig.expense.flexible)}/tháng (đã tính cắt ${Math.round(cutPct * 100)}%), tiền dùng được ngay ${formatVnd(sig.liquid.amount)}.`,
  ];
  if (sig.income.stability === 'bap_benh') parts.push('Thu nhập các tháng lên xuống nhiều nên điểm an toàn bị trừ bớt.');
  parts.push(
    worst.survives
      ? `Nếu mất thu nhập ${WORST_CASE.incomeLossMonths} tháng và tài sản đầu tư giảm ${WORST_CASE.riskyDropPct}%, bạn vẫn còn tiền đủ sống ${String(worst.monthsCovered).replace('.', ',')} tháng.`
      : `Nếu mất thu nhập ${WORST_CASE.incomeLossMonths} tháng và tài sản đầu tư giảm ${WORST_CASE.riskyDropPct}%, tiền dùng được ngay sẽ thiếu khoảng ${formatVnd(-worstLeft)}.`,
  );
  if (sig.confidence.level === 'thap') parts.push(`Số còn ước lượng — ghi thêm ${Math.max(1, ESTIMATE_MONTHS - n)} tháng sổ thu chi để chắc hơn.`);
  return parts.join(' ');
}

/** Điều kiện tự kiểm tra từ dữ liệu tài chính (auto_key). */
export function autoPrereq(state: UserState, key: string): { done: boolean; params: Record<string, number> } {
  if (key === 'reserve_12m') {
    const months = round1(monthsCovered(state));
    return { done: months >= RESERVE_PREREQ_MONTHS, params: { months, need: RESERVE_PREREQ_MONTHS } };
  }
  return { done: false, params: {} };
}
