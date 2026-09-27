// Sổ thu chi theo tháng: ngân sách, so với tháng trước, cơ cấu chi tiêu và gợi ý tiết kiệm từ chi tiêu thật.

import type { Transaction } from '../types/domain';
import { PEER_SPENDING_SHARES } from '../data/peer-benchmarks';

export interface BudgetStatus {
  limit: number | null;
  spent: number;
  /** Đã chi / ngân sách (0..∞); null khi chưa đặt ngân sách. */
  pct: number | null;
  /** Còn lại (âm = vượt). */
  remaining: number | null;
}

export function budgetStatus(limit: number | null, spent: number): BudgetStatus {
  if (!limit || limit <= 0) return { limit: null, spent, pct: null, remaining: null };
  return { limit, spent, pct: spent / limit, remaining: limit - spent };
}

export interface Totals { income: number; expense: number; net: number }

/** % thay đổi so với tháng trước (0.12 = +12%); null khi tháng trước bằng 0. */
export const momDelta = (cur: number, prev: number): number | null => (prev === 0 ? null : (cur - prev) / Math.abs(prev));

export function momDeltas(cur: Totals, prev: Totals): Record<keyof Totals, number | null> {
  return { income: momDelta(cur.income, prev.income), expense: momDelta(cur.expense, prev.expense), net: momDelta(cur.net, prev.net) };
}

export function totalsOf(items: Pick<Transaction, 'kind' | 'amount'>[]): Totals {
  const t = { income: 0, expense: 0, net: 0 };
  for (const i of items) t[i.kind] += i.amount;
  t.net = t.income - t.expense;
  return t;
}

export interface CategoryShare { key: string; amount: number; pct: number }

/** Chi theo danh mục, lớn → nhỏ ("Khác" luôn cuối). Quá `max` danh mục thì gộp phần nhỏ vào "Khác". */
export function categoryBreakdown(items: Pick<Transaction, 'kind' | 'amount' | 'category'>[], max = 7): CategoryShare[] {
  const by = new Map<string, number>();
  let total = 0;
  for (const t of items) {
    if (t.kind !== 'expense') continue;
    total += t.amount;
    by.set(t.category, (by.get(t.category) ?? 0) + t.amount);
  }
  let list = [...by].map(([key, amount]) => ({ key, amount })).sort((a, b) => b.amount - a.amount);
  if (list.length > max) {
    const keep = list.filter((c) => c.key !== 'other_expense').slice(0, max - 1);
    const rest = total - keep.reduce((s, c) => s + c.amount, 0);
    list = [...keep, { key: 'other_expense', amount: rest }];
  }
  list.sort((a, b) => (a.key === 'other_expense' ? 1 : b.key === 'other_expense' ? -1 : b.amount - a.amount));
  return list.map((c) => ({ ...c, pct: total ? c.amount / total : 0 }));
}

/* ───────── Gợi ý tiết kiệm ───────── */

/** Cần ít nhất ngần này khoản chi trong tháng để AI nhận xét. */
export const ADVICE_MIN_EXPENSES = 5;
/** Danh mục vượt mức phổ biến ít nhất ngần này (điểm %) mới được nêu. */
export const ADVICE_MIN_GAP = 0.03;
/** Gợi ý giảm một nửa các khoản người dùng tự đánh dấu "Không đáng". */
export const ADVICE_CUT_RATIO = 0.5;

export interface SpendingAdvice {
  ready: boolean;
  /** Danh mục đang chi cao hơn mức phổ biến. */
  focus: { category: string; share: number; peerShare: number } | null;
  /** Nhóm khoản "Không đáng" lớn nhất (theo ghi chú) trong tháng. */
  items: { label: string; amount: number }[];
  saving: { monthly: number; yearly: number; labels: string[]; basis: 'regret' | 'peer' } | null;
}

const round10k = (v: number) => Math.round(v / 10_000) * 10_000;

export function spendingAdvice(
  items: Pick<Transaction, 'kind' | 'amount' | 'category' | 'note' | 'valueTag'>[],
  peerShares: Record<string, number> = PEER_SPENDING_SHARES,
): SpendingAdvice {
  const expenses = items.filter((t) => t.kind === 'expense');
  if (expenses.length < ADVICE_MIN_EXPENSES) return { ready: false, focus: null, items: [], saving: null };

  const total = expenses.reduce((s, t) => s + t.amount, 0);
  const gaps = categoryBreakdown(expenses, 99)
    .filter((c) => peerShares[c.key] !== undefined)
    .map((c) => ({ category: c.key, share: c.pct, peerShare: peerShares[c.key], gap: c.pct - peerShares[c.key] }))
    .sort((a, b) => b.gap - a.gap);
  const top = gaps[0] && gaps[0].gap >= ADVICE_MIN_GAP ? gaps[0] : null;
  const focus = top ? { category: top.category, share: top.share, peerShare: top.peerShare } : null;

  // Khoản "Không đáng": ưu tiên trong danh mục đang chi cao, nhóm theo ghi chú
  const regretAll = expenses.filter((t) => t.valueTag === 'regret');
  const inFocus = focus ? regretAll.filter((t) => t.category === focus.category) : [];
  const regret = inFocus.length ? inFocus : regretAll;
  const groups = new Map<string, number>();
  for (const t of regret) {
    const label = t.note.trim() || t.category;
    groups.set(label, (groups.get(label) ?? 0) + t.amount);
  }
  const grouped = [...groups].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);

  let saving: SpendingAdvice['saving'] = null;
  if (grouped.length) {
    const monthly = round10k(grouped.reduce((s, g) => s + g.amount, 0) * ADVICE_CUT_RATIO);
    if (monthly > 0) saving = { monthly, yearly: monthly * 12, labels: grouped.slice(0, 3).map((g) => g.label), basis: 'regret' };
  } else if (top) {
    const monthly = round10k(top.gap * total);
    if (monthly > 0) saving = { monthly, yearly: monthly * 12, labels: [], basis: 'peer' };
  }
  return { ready: true, focus, items: grouped.slice(0, 3), saving };
}
