// Hóa đơn & đăng ký định kỳ. Mount: /api/bills
// "Đánh dấu đã trả" ghi một giao dịch chi (source='bill', bill_id) → sổ thu chi, ngân sách, điểm An Tâm cập nhật.

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { Bill } from '../../shared/types/api';
import { billStatus } from '../../shared/engine/bills';
import { categoryOf } from '../../shared/engine/ledger';
import { addMonths, vnDate } from '../../shared/engine/month';
import { formatVndFull } from '../../shared/format';
import { auditUserWrite } from '../lib/audit';
import { ApiError, notFound, ok } from '../lib/http';
import { afterChange } from '../lib/refresh';
import { loadUserState } from '../lib/state';
import { body, dateString, money } from '../lib/validate';

const BILL_ICONS = ['zap', 'wifi', 'tv', 'music', 'shield', 'droplet', 'phone', 'home', 'receipt'] as const;

const billSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên hóa đơn').max(60),
  amount: money.positive('Số tiền phải lớn hơn 0'),
  category: z.string().refine((k) => categoryOf(k)?.kind === 'expense', 'Danh mục chi không hợp lệ').default('housing'),
  dayOfMonth: z.number().int().min(1).max(31),
  autoRenew: z.boolean().default(false),
  icon: z.enum(BILL_ICONS).default('receipt'),
});

// Sửa: mọi trường tùy chọn, KHÔNG có .default() — trường không gửi thì giữ nguyên giá trị đã lưu.
const billPatchSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên hóa đơn').max(60).optional(),
  amount: money.positive('Số tiền phải lớn hơn 0').optional(),
  category: z.string().refine((k) => categoryOf(k)?.kind === 'expense', 'Danh mục chi không hợp lệ').optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  autoRenew: z.boolean().optional(),
  icon: z.enum(BILL_ICONS).optional(),
});

/** Nhật ký không ghi tên hóa đơn hay số tiền — chỉ loại thao tác. */
const billAudit = (action: 'create' | 'update' | 'delete' | 'paid', summary: string, id: string) =>
  ({ agent: 'cashflow', action: `bill.${action}`, entityType: 'bill', entityId: id, summary, dataLabel: 'Hóa đơn định kỳ (đã ẩn danh)' });

interface Row { id: string; name: string; amount: number; category: string; day_of_month: number; auto_renew: number; icon: string }

export async function loadBills(db: D1Database, userId: string, today = vnDate()): Promise<Bill[]> {
  const month = today.slice(0, 7);
  const [bills, paid] = await db.batch([
    db.prepare('SELECT id, name, amount, category, day_of_month, auto_renew, icon FROM recurring_bills WHERE user_id = ? ORDER BY day_of_month, created_at').bind(userId),
    db.prepare('SELECT DISTINCT bill_id FROM transactions WHERE user_id = ? AND bill_id IS NOT NULL AND occurred_on >= ? AND occurred_on < ?').bind(userId, `${month}-01`, `${addMonths(month, 1)}-01`),
  ]);
  const paidIds = new Set((paid.results as { bill_id: string }[]).map((r) => r.bill_id));
  return (bills.results as unknown as Row[]).map((r) => {
    const base = { dayOfMonth: r.day_of_month, autoRenew: r.auto_renew === 1 };
    return { id: r.id, name: r.name, amount: r.amount, category: r.category, icon: r.icon, ...base, ...billStatus(base, today, paidIds.has(r.id)) };
  });
}

export const bills = new Hono<AppEnv>()
  .get('/', async (c) => ok(c, await loadBills(c.env.DB, c.get('userId'))))
  .post('/', body(billSchema), async (c) => {
    const b = c.req.valid('json');
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO recurring_bills (id, user_id, name, amount, category, day_of_month, auto_renew, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, c.get('userId'), b.name, b.amount, b.category, b.dayOfMonth, b.autoRenew ? 1 : 0, b.icon)
      .run();
    await auditUserWrite(c.env, c.get('userId'), billAudit('create', 'Thêm hóa đơn định kỳ', id));
    return ok(c, { id }, 201);
  })
  .patch('/:id', body(billPatchSchema), async (c) => {
    const b = c.req.valid('json');
    const userId = c.get('userId');
    const cols: Record<string, unknown> = {
      name: b.name, amount: b.amount, category: b.category, day_of_month: b.dayOfMonth,
      auto_renew: b.autoRenew === undefined ? undefined : b.autoRenew ? 1 : 0, icon: b.icon,
    };
    const entries = Object.entries(cols).filter(([, v]) => v !== undefined);
    if (!entries.length) return ok(c, null);
    const res = await c.env.DB.prepare(`UPDATE recurring_bills SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...entries.map(([, v]) => v), c.req.param('id'), userId)
      .run();
    if (!res.meta.changes) throw notFound('Không tìm thấy hóa đơn');
    await auditUserWrite(c.env, userId, billAudit('update', 'Cập nhật hóa đơn định kỳ', c.req.param('id')));
    return ok(c, null);
  })
  .delete('/:id', async (c) => {
    const res = await c.env.DB.prepare('DELETE FROM recurring_bills WHERE id = ? AND user_id = ?').bind(c.req.param('id'), c.get('userId')).run();
    if (!res.meta.changes) throw notFound('Không tìm thấy hóa đơn');
    await auditUserWrite(c.env, c.get('userId'), billAudit('delete', 'Xóa một hóa đơn định kỳ', c.req.param('id')));
    return ok(c, null);
  })
  .post('/:id/paid', body(z.object({ occurredOn: dateString.optional() })), async (c) => {
    const db = c.env.DB;
    const userId = c.get('userId');
    const today = vnDate();
    const occurredOn = c.req.valid('json').occurredOn ?? today;
    if (occurredOn > today) throw new ApiError(400, 'invalid_input', 'Ngày trả không được ở tương lai');
    const bill = await db.prepare('SELECT id, name, amount, category FROM recurring_bills WHERE id = ? AND user_id = ?').bind(c.req.param('id'), userId).first<Row>();
    if (!bill) throw notFound('Không tìm thấy hóa đơn');
    const month = occurredOn.slice(0, 7);
    const dup = await db
      .prepare('SELECT 1 FROM transactions WHERE user_id = ? AND bill_id = ? AND occurred_on >= ? AND occurred_on < ?')
      .bind(userId, bill.id, `${month}-01`, `${addMonths(month, 1)}-01`)
      .first();
    if (dup) throw new ApiError(409, 'already_paid', 'Hóa đơn này đã được đánh dấu trả trong tháng');
    const before = await loadUserState(db, userId);
    await db.prepare("INSERT INTO transactions (id, user_id, kind, amount, category, note, occurred_on, value_tag, source, bill_id) VALUES (?, ?, 'expense', ?, ?, ?, ?, 'essential', 'bill', ?)")
      .bind(crypto.randomUUID(), userId, bill.amount, bill.category, bill.name, occurredOn, bill.id)
      .run();
    await afterChange(db, userId, { title: 'Đã trả hóa đơn', detail: `${bill.name}: ${formatVndFull(bill.amount)}.`, before });
    await auditUserWrite(c.env, userId, billAudit('paid', 'Đánh dấu đã trả một hóa đơn định kỳ', bill.id));
    return ok(c, null);
  });
