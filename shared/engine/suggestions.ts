// "Hôm nay AI đề xuất cho bạn": luôn 3 nhóm cố định — An toàn · Tiết kiệm · Phát triển bản thân.
// Mỗi nhóm chọn việc đáng làm nhất từ dữ liệu thật (quỹ dự phòng, sổ thu chi, hồ sơ thu nhập).
// Câu chữ do client dựng từ `key` + `vars` (đủ 3 ngôn ngữ); engine chỉ trả số liệu.

import type { IncomeProfile, Transaction, UserState } from '../types/domain';
import { addMonths, monthsBetween } from './month';
import { emergencyAmount } from './peace';

export type SuggestionGroup = 'safety' | 'saving' | 'growth';

export type SuggestionKey =
  | 'emergency_setup' // chưa có chi tiêu tháng → chưa tính được quỹ cần có
  | 'emergency_topup' // đang góp chưa đủ để đạt mục tiêu đúng hạn
  | 'emergency_on_track' // đang đúng tiến độ
  | 'emergency_done' // đã đủ
  | 'negative_cashflow' // tháng gần nhất chi nhiều hơn thu
  | 'spending_waste' // có khoản chi "không đáng"
  | 'spending_trim' // gợi ý giảm nhẹ nhóm chi lớn nhất có thể cắt
  | 'spending_track' // chưa có sổ thu chi
  | 'skill_daily' // có kỹ năng trọng tâm + số giờ mỗi tuần
  | 'income_setup'; // chưa có hồ sơ tăng thu nhập

export interface SuggestionVars {
  amount?: number;
  months?: number;
  minutes?: number;
  pct?: number;
  skill?: string;
  /** Tên các khoản chi (ghi chú người dùng tự nhập). */
  items?: string;
  /** Khóa danh mục chi (client tự dịch). */
  category?: string;
  /** Tháng dự kiến 'YYYY-MM'. */
  month?: string;
}

export type SuggestionAction =
  | { kind: 'emergency_topup'; goalId: string | null; current: number; suggested: number; targetAmount: number; currentAmount: number; targetMonth: string }
  | { kind: 'link'; to: string };

export interface TodaySuggestion {
  key: SuggestionKey;
  group: SuggestionGroup;
  /** true → badge "Ưu tiên cao" và nút chính màu đậm. */
  urgent: boolean;
  vars: SuggestionVars;
  action: SuggestionAction;
}

/** Hạn mặc định để đạt quỹ dự phòng khi người dùng chưa đặt hạn. */
export const DEFAULT_EMERGENCY_HORIZON = 12;
/** Tỷ lệ gợi ý cắt giảm cho nhóm chi lớn nhất có thể điều chỉnh. */
const TRIM_SHARE = 0.1;
const TRIMMABLE = ['food', 'shopping', 'entertainment', 'other_expense'];

/** Làm tròn lên bội số `step` (mặc định 100.000đ) cho con số dễ nhớ. */
export const roundUpTo = (v: number, step = 100_000) => Math.ceil(v / step) * step;

export function emergencySuggestion(state: UserState): TodaySuggestion {
  const expense = state.profile.monthlyExpense;
  const targetMonths = state.profile.emergencyTargetMonths || 6;
  if (expense <= 0) return { key: 'emergency_setup', group: 'safety', urgent: false, vars: { months: targetMonths }, action: { kind: 'link', to: '/cai-dat#tai-chinh' } };

  const target = Math.round(expense * targetMonths);
  const have = emergencyAmount(state);
  const gap = target - have;
  const goal = state.goals.find((g) => g.kind === 'emergency');
  if (gap <= 0) return { key: 'emergency_done', group: 'safety', urgent: false, vars: { months: targetMonths, amount: have }, action: { kind: 'link', to: '/quy-an-toan' } };

  const targetMonth = goal && monthsBetween(state.today, goal.targetMonth) > 0 ? goal.targetMonth : addMonths(state.today, DEFAULT_EMERGENCY_HORIZON);
  const monthsLeft = Math.max(1, monthsBetween(state.today, targetMonth));
  const required = roundUpTo(gap / monthsLeft);
  const current = goal?.monthlyContribution ?? 0;
  if (current > 0 && current >= required) {
    return {
      key: 'emergency_on_track',
      group: 'safety',
      urgent: false,
      vars: { amount: current, months: targetMonths, month: addMonths(state.today, Math.ceil(gap / current)) },
      action: { kind: 'link', to: '/quy-an-toan' },
    };
  }
  return {
    key: 'emergency_topup',
    group: 'safety',
    urgent: true,
    vars: { amount: required - current, months: targetMonths },
    action: { kind: 'emergency_topup', goalId: goal?.id ?? null, current, suggested: required, targetAmount: target, currentAmount: have, targetMonth },
  };
}

/** `recent`: giao dịch của tháng này và tháng trước. */
export function savingSuggestion(state: UserState, recent: Transaction[]): TodaySuggestion {
  // Tháng đã trọn gần nhất (tháng hiện tại chưa hết nên chưa kết luận)
  const last = state.ledger.filter((m) => m.month < state.today).at(-1);
  if (last && last.expense > last.income && last.income > 0) {
    return { key: 'negative_cashflow', group: 'saving', urgent: true, vars: { amount: last.expense - last.income }, action: { kind: 'link', to: '/thu-chi' } };
  }
  const expenses = recent.filter((t) => t.kind === 'expense');
  if (!expenses.length) return { key: 'spending_track', group: 'saving', urgent: false, vars: {}, action: { kind: 'link', to: '/thu-chi' } };

  // Khoản "không đáng": lấy tháng gần nhất có ghi nhận
  const months = [...new Set(expenses.map((t) => t.occurredOn.slice(0, 7)))].sort().reverse();
  for (const m of months) {
    const regret = expenses.filter((t) => t.valueTag === 'regret' && t.occurredOn.startsWith(m));
    const amount = regret.reduce((s, t) => s + t.amount, 0);
    if (amount > 0) {
      const byNote = new Map<string, number>();
      for (const t of regret) {
        const note = t.note.trim();
        if (note) byNote.set(note, (byNote.get(note) ?? 0) + t.amount);
      }
      const items = [...byNote.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n]) => n.toLowerCase()).join(', ');
      return { key: 'spending_waste', group: 'saving', urgent: false, vars: { amount: roundUpTo(amount, 10_000), items }, action: { kind: 'link', to: '/thu-chi' } };
    }
  }

  // Không có khoản "không đáng": gợi ý giảm 10% nhóm chi lớn nhất có thể điều chỉnh (tháng gần nhất)
  const latest = expenses.filter((t) => t.occurredOn.startsWith(months[0]));
  const byCat = new Map<string, number>();
  for (const t of latest) if (TRIMMABLE.includes(t.category)) byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top) return { key: 'spending_track', group: 'saving', urgent: false, vars: {}, action: { kind: 'link', to: '/thu-chi' } };
  return { key: 'spending_trim', group: 'saving', urgent: false, vars: { amount: roundUpTo(top[1] * TRIM_SHARE, 10_000), category: top[0] }, action: { kind: 'link', to: '/thu-chi' } };
}

export function growthSuggestion(income: IncomeProfile | null): TodaySuggestion {
  if (!income || !income.focusSkill.trim() || income.hoursPerWeek <= 0) {
    return { key: 'income_setup', group: 'growth', urgent: false, vars: {}, action: { kind: 'link', to: '/tang-thu-nhap' } };
  }
  const minutes = Math.max(5, Math.round((income.hoursPerWeek * 60) / 7 / 5) * 5);
  const pct =
    income.currentIncome > 0 && income.targetIncome > income.currentIncome ? Math.round(((income.targetIncome - income.currentIncome) / income.currentIncome) * 100) : 0;
  return {
    key: 'skill_daily',
    group: 'growth',
    urgent: false,
    vars: { minutes, skill: income.focusSkill.trim(), pct, months: income.targetMonths },
    action: { kind: 'link', to: '/tang-thu-nhap' },
  };
}

/** 3 thẻ đề xuất (bỏ nhóm người dùng đã "Ẩn hôm nay"). */
export function todaySuggestions(
  state: UserState,
  opts: { recent?: Transaction[]; income?: IncomeProfile | null; dismissed?: SuggestionGroup[] } = {},
): TodaySuggestion[] {
  const hidden = new Set(opts.dismissed ?? []);
  return [emergencySuggestion(state), savingSuggestion(state, opts.recent ?? []), growthSuggestion(opts.income ?? null)].filter((s) => !hidden.has(s.group));
}
