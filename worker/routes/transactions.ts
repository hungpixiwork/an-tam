import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { LedgerData } from '../../shared/types/api';
import type { MonthTotal, Transaction } from '../../shared/types/domain';
import { categoryOf, TRANSACTION_CATEGORIES } from '../../shared/engine/ledger';
import { addMonths, currentMonth } from '../../shared/engine/month';
import { formatMonth, formatVnd } from '../../shared/format';
import { ApiError, notFound, ok } from '../lib/http';
import { afterChange } from '../lib/refresh';
import { loadUserState, type LoadedState } from '../lib/state';
import { body, dateString, money, monthString } from '../lib/validate';

/** Số tháng hiển thị ở biểu đồ thu / chi. */
const HISTORY_MONTHS = 6;

const transactionSchema = z
  .object({
    kind: z.enum(['income', 'expense']),
    amount: money.positive('Số tiền phải lớn hơn 0'),
    category: z.string(),
    note: z.string().trim().max(120).default(''),
    occurredOn: dateString,
    valueTag: z.enum(['essential', 'useful', 'joy', 'growth', 'regret']).optional(),
  })
  .refine((t) => categoryOf(t.category)?.kind === t.kind, { message: 'Danh mục không khớp loại thu / chi', path: ['category'] });

/** Ngày giao dịch hợp lệ: từ năm 2000 tới hết ngày mai (chênh múi giờ). */
function checkDate(date: string) {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (date < '2000-01-01' || date > tomorrow) throw new ApiError(400, 'invalid_input', 'Ngày giao dịch không hợp lệ');
}

interface Row {
  id: string;
  kind: Transaction['kind'];
  amount: number;
  category: string;
  note: string;
  occurred_on: string;
  value_tag: string | null;
}

const toTransaction = (r: Row): Transaction => ({ id: r.id, kind: r.kind, amount: r.amount, category: r.category, note: r.note, occurredOn: r.occurred_on, valueTag: (r.value_tag as any) || undefined });

/** "Tháng 9/2026: thu 12 triệu · chi 4,5 triệu." cho nhật ký AI. */
const monthLine = (month: string) => (s: LoadedState) => {
  const t = s.ledger.find((m) => m.month === month) ?? { income: 0, expense: 0 };
  return `${formatMonth(month)}: thu ${formatVnd(t.income)} · chi ${formatVnd(t.expense)}.`;
};

export const transactions = new Hono<AppEnv>()
  .get('/categories', (c) => ok(c, TRANSACTION_CATEGORIES))
  .get('/', async (c) => {
    const userId = c.get('userId');
    const today = currentMonth();
    const q = c.req.query('month');
    const month = q && monthString.safeParse(q).success ? q : today;
    const [state, { results }] = await Promise.all([
      loadUserState(c.env.DB, userId, today),
      c.env.DB.prepare(
        "SELECT id, kind, amount, category, note, occurred_on, value_tag FROM transactions WHERE user_id = ? AND occurred_on LIKE ? ORDER BY occurred_on DESC, created_at DESC",
      )
        .bind(userId, `${month}-%`)
        .all<Row>(),
    ]);
    const items = results.map(toTransaction);

    const totals = { income: 0, expense: 0 };
    const byKey = new Map<string, number>();
    for (const t of items) {
      totals[t.kind] += t.amount;
      byKey.set(t.category, (byKey.get(t.category) ?? 0) + t.amount);
    }
    const byCategory = TRANSACTION_CATEGORIES.filter((cat) => byKey.has(cat.key)).map((cat) => {
      const amount = byKey.get(cat.key)!;
      const kindTotal = totals[cat.kind] || 1;
      return { key: cat.key, kind: cat.kind, label: cat.label, icon: cat.icon, amount, pct: amount / kindTotal };
    }).sort((a, b) => b.amount - a.amount);

    const months: MonthTotal[] = Array.from({ length: HISTORY_MONTHS }, (_, i) => {
      const m = addMonths(month, i - (HISTORY_MONTHS - 1));
      return state.ledger.find((x) => x.month === m) ?? { month: m, income: 0, expense: 0 };
    });

    return ok<LedgerData>(c, {
      month,
      items,
      totals: { ...totals, net: totals.income - totals.expense },
      byCategory,
      months,
      // Con số thu / chi AI đang dùng để tính mức an tâm và nguồn của nó
      used: { income: state.profile.monthlyIncome, expense: state.profile.monthlyExpense, ...state.sources },
    });
  })
  .post('/', body(transactionSchema), async (c) => {
    const userId = c.get('userId');
    const t = c.req.valid('json');
    checkDate(t.occurredOn);
    const before = await loadUserState(c.env.DB, userId);
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO transactions (id, user_id, kind, amount, category, note, occurred_on, value_tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, userId, t.kind, t.amount, t.category, t.note, t.occurredOn, t.valueTag ?? null)
      .run();
    await afterChange(c.env.DB, userId, { title: 'Cập nhật sổ thu chi', detail: monthLine(t.occurredOn.slice(0, 7)), before });
    return ok(c, { id }, 201);
  })
  .patch('/:id', body(transactionSchema), async (c) => {
    const userId = c.get('userId');
    const t = c.req.valid('json');
    checkDate(t.occurredOn);
    const before = await loadUserState(c.env.DB, userId);
    const res = await c.env.DB.prepare('UPDATE transactions SET kind = ?, amount = ?, category = ?, note = ?, occurred_on = ?, value_tag = ? WHERE id = ? AND user_id = ?')
      .bind(t.kind, t.amount, t.category, t.note, t.occurredOn, t.valueTag ?? null, c.req.param('id'), userId)
      .run();
    if (!res.meta.changes) throw notFound('Không tìm thấy giao dịch');
    await afterChange(c.env.DB, userId, { title: 'Cập nhật sổ thu chi', detail: monthLine(t.occurredOn.slice(0, 7)), before });
    return ok(c, null);
  })
  .delete('/:id', async (c) => {
    const userId = c.get('userId');
    const row = await c.env.DB.prepare('SELECT occurred_on FROM transactions WHERE id = ? AND user_id = ?')
      .bind(c.req.param('id'), userId)
      .first<{ occurred_on: string }>();
    if (!row) throw notFound('Không tìm thấy giao dịch');
    const before = await loadUserState(c.env.DB, userId);
    await c.env.DB.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').bind(c.req.param('id'), userId).run();
    await afterChange(c.env.DB, userId, { title: 'Cập nhật sổ thu chi', detail: monthLine(row.occurred_on.slice(0, 7)), before });
    return ok(c, null);
  });
