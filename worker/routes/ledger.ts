// Sổ thu chi: dashboard tháng, chia đều chi phí + VietQR, tài khoản nhận tiền.
// Mount: /api/ledger, /api/settings/payout-account

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { LedgerDashboard, PayoutAccountData, SplitResult } from '../../shared/types/api';
import type { Transaction } from '../../shared/types/domain';
import { categoryBreakdown, momDeltas, spendingAdvice, totalsOf } from '../../shared/engine/budget';
import { addMonths, vnDate } from '../../shared/engine/month';
import { splitEvenly, vietQrName, vietQrUrl, type PayoutAccount } from '../../shared/engine/split';
import { bankByBin } from '../../shared/data/vn-banks';
import { ApiError, ok } from '../lib/http';
import { body, money, monthString } from '../lib/validate';
import { loadBudget } from './budgets';
import { loadBills } from './bills';

/** Số tháng ở biểu đồ dòng tiền. */
const CHART_MONTHS = 6;
/** Số giao dịch gần đây trên dashboard. */
const RECENT_COUNT = 5;

interface TxRow { id: string; kind: Transaction['kind']; amount: number; category: string; note: string; occurred_on: string; value_tag: string | null }
const toTx = (r: TxRow): Transaction => ({ id: r.id, kind: r.kind, amount: r.amount, category: r.category, note: r.note, occurredOn: r.occurred_on, valueTag: (r.value_tag as Transaction['valueTag']) ?? undefined });
const TX_COLS = 'id, kind, amount, category, note, occurred_on, value_tag';

export async function loadPayout(db: D1Database, userId: string): Promise<PayoutAccount | null> {
  const r = await db
    .prepare('SELECT payout_bank_bin, payout_account_no, payout_account_name FROM user_settings WHERE user_id = ?')
    .bind(userId)
    .first<{ payout_bank_bin: string | null; payout_account_no: string | null; payout_account_name: string | null }>();
  if (!r?.payout_bank_bin || !r.payout_account_no || !r.payout_account_name) return null;
  return { bankBin: r.payout_bank_bin, accountNo: r.payout_account_no, accountName: r.payout_account_name };
}

const splitSchema = z.object({
  title: z.string().trim().min(1, 'Nhập nội dung khoản chi').max(40),
  total: money.positive('Tổng tiền phải lớn hơn 0'),
  /** Tên những người cùng chia (không gồm bạn). */
  people: z.array(z.string().trim().min(1).max(30)).min(1, 'Cần ít nhất 1 người cùng chia').max(20),
});

export const ledger = new Hono<AppEnv>()
  .get('/dashboard', async (c) => {
    const db = c.env.DB;
    const userId = c.get('userId');
    const today = vnDate();
    const q = c.req.query('month');
    const month = q && monthString.safeParse(q).success ? q : today.slice(0, 7);
    const from = addMonths(month, -(CHART_MONTHS - 1));

    const [[win, recent], budget, bills, payout] = await Promise.all([
      db.batch([
        db.prepare(`SELECT ${TX_COLS} FROM transactions WHERE user_id = ? AND occurred_on >= ? AND occurred_on < ?`).bind(userId, `${from}-01`, `${addMonths(month, 1)}-01`),
        db.prepare(`SELECT ${TX_COLS} FROM transactions WHERE user_id = ? AND occurred_on <= ? ORDER BY occurred_on DESC, created_at DESC LIMIT ?`).bind(userId, today, RECENT_COUNT),
      ]),
      loadBudget(db, userId, month),
      loadBills(db, userId, today),
      loadPayout(db, userId),
    ]);
    const items = (win.results as unknown as TxRow[]).map(toTx);
    const inMonth = (m: string) => items.filter((t) => t.occurredOn.startsWith(m));
    const cur = inMonth(month);
    const totals = totalsOf(cur);
    const prevTotals = totalsOf(inMonth(addMonths(month, -1)));
    const months = Array.from({ length: CHART_MONTHS }, (_, i) => {
      const m = addMonths(from, i);
      return { month: m, ...totalsOf(inMonth(m)) };
    });

    return ok<LedgerDashboard>(c, {
      month,
      today,
      hasData: cur.length > 0,
      totals,
      prevTotals,
      deltas: momDeltas(totals, prevTotals),
      budget,
      months,
      categories: categoryBreakdown(cur),
      advice: spendingAdvice(cur),
      recent: (recent.results as unknown as TxRow[]).map(toTx),
      bills,
      payoutConfigured: payout !== null,
    });
  })
  .post('/split', body(splitSchema), async (c) => {
    const db = c.env.DB;
    const userId = c.get('userId');
    const { title, total, people } = c.req.valid('json');
    const amounts = splitEvenly(total, people.length + 1);
    const payout = await loadPayout(db, userId);
    const shares: SplitResult['shares'] = [
      { name: 'me', amount: amounts[0], isMe: true, qrUrl: null },
      ...people.map((name, i) => ({ name, amount: amounts[i + 1], isMe: false, qrUrl: payout ? vietQrUrl(payout, amounts[i + 1], `${vietQrName(title)} ${vietQrName(name)}`) : null })),
    ];
    const id = crypto.randomUUID();
    await db.prepare('INSERT INTO split_bills (id, user_id, title, total, shares_json) VALUES (?, ?, ?, ?, ?)')
      .bind(id, userId, title, total, JSON.stringify(shares.map(({ name, amount }) => ({ name, amount }))))
      .run();
    return ok<SplitResult>(c, { id, title, total, shares, payoutConfigured: payout !== null }, 201);
  });

const payoutSchema = z.object({
  bankBin: z.string().refine((b) => !!bankByBin(b), 'Ngân hàng chưa được hỗ trợ'),
  accountNo: z.string().trim().regex(/^\d{6,19}$/, 'Số tài khoản gồm 6–19 chữ số'),
  accountName: z.string().trim().min(2, 'Nhập tên chủ tài khoản').max(50),
});

const toPayoutData = (p: PayoutAccount): PayoutAccountData => ({ ...p, bankName: bankByBin(p.bankBin)?.name ?? p.bankBin });

/** /api/settings/payout-account — tài khoản nhận tiền VietQR. */
export const payoutAccount = new Hono<AppEnv>()
  .get('/', async (c) => {
    const p = await loadPayout(c.env.DB, c.get('userId'));
    return ok(c, p ? toPayoutData(p) : null);
  })
  .put('/', body(payoutSchema), async (c) => {
    const userId = c.get('userId');
    const p = c.req.valid('json');
    const name = vietQrName(p.accountName);
    if (!name) throw new ApiError(400, 'invalid_input', 'Tên chủ tài khoản không hợp lệ');
    await c.env.DB.prepare(
      'INSERT INTO user_settings (user_id, payout_bank_bin, payout_account_no, payout_account_name) VALUES (?, ?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET payout_bank_bin = excluded.payout_bank_bin, payout_account_no = excluded.payout_account_no, payout_account_name = excluded.payout_account_name',
    )
      .bind(userId, p.bankBin, p.accountNo, name)
      .run();
    return ok(c, toPayoutData({ bankBin: p.bankBin, accountNo: p.accountNo, accountName: name }), 200);
  });

