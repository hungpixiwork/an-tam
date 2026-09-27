// Hóa đơn & đăng ký định kỳ hàng tháng: ngày đến hạn kế tiếp và trạng thái (tính khi đọc, không lưu).

export interface BillLike { id: string; name: string; amount: number; category: string; dayOfMonth: number; autoRenew: boolean }

/** Hóa đơn chưa tự gia hạn đến hạn trong số ngày này → "Sắp đến hạn". */
export const BILL_DUE_SOON_DAYS = 7;

export type BillState = 'auto' | 'due_soon' | 'upcoming' | 'overdue';

export interface BillStatus { nextDue: string; daysLeft: number; state: BillState; paidThisMonth: boolean }

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dueIn = (y: number, m: number, day: number) => {
  const d = Math.min(day, daysInMonth(y, m));
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};
const diffDays = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** Ngày đến hạn của kỳ tháng này ('YYYY-MM-DD', ngày 31 tự lùi về cuối tháng). */
export const dueThisMonth = (dayOfMonth: number, today: string): string => {
  const [y, m] = today.split('-').map(Number);
  return dueIn(y, m, dayOfMonth);
};

/** Ngày đến hạn kế tiếp: chưa trả kỳ này → ngày của tháng này (có thể đã qua = quá hạn); đã trả → tháng sau. */
export function nextDueDate(dayOfMonth: number, today: string, paidThisMonth = false): string {
  if (!paidThisMonth) return dueThisMonth(dayOfMonth, today);
  const [y, m] = today.split('-').map(Number);
  return m === 12 ? dueIn(y + 1, 1, dayOfMonth) : dueIn(y, m + 1, dayOfMonth);
}

export function billStatus(bill: Pick<BillLike, 'dayOfMonth' | 'autoRenew'>, today: string, paidThisMonth: boolean): BillStatus {
  // Tự gia hạn: qua ngày trừ tiền của tháng này coi như đã trả.
  const paid = paidThisMonth || (bill.autoRenew && dueThisMonth(bill.dayOfMonth, today) < today);
  const nextDue = nextDueDate(bill.dayOfMonth, today, paid);
  const daysLeft = diffDays(today, nextDue);
  const state: BillState = bill.autoRenew ? 'auto' : daysLeft < 0 ? 'overdue' : daysLeft <= BILL_DUE_SOON_DAYS ? 'due_soon' : 'upcoming';
  return { nextDue, daysLeft, state, paidThisMonth: paid };
}

/** Giao dịch có phải là lần trả của hóa đơn này không (gắn bill_id, hoặc ghi tay cùng danh mục + số tiền + tên). */
export function matchBillTransaction(bill: BillLike, tx: { billId?: string | null; kind: string; category: string; amount: number; note: string }): boolean {
  if (tx.billId) return tx.billId === bill.id;
  return tx.kind === 'expense' && tx.category === bill.category && tx.amount === bill.amount && tx.note.toLowerCase().includes(bill.name.toLowerCase());
}
