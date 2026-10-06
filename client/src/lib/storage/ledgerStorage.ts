import type { Bill } from '../../../../shared/types/api/ledger';
import type { Transaction } from '../../../../shared/types/domain';
import type { BillInput, TransactionInput } from '../queries/ledger';

export const LEDGER_STORAGE_KEY = 'antam.ledger.transactions.v1';
export const ACTIVE_USER_KEY = 'antam:active_user_id';

export function getLedgerStorageKey(userId?: string): string {
  if (userId) {
    return `antam:v1:user:${userId}:ledger.transactions`;
  }
  const s = getStorage();
  const activeUser = s?.getItem(ACTIVE_USER_KEY);
  if (activeUser) {
    return `antam:v1:user:${activeUser}:ledger.transactions`;
  }
  return LEDGER_STORAGE_KEY;
}

export interface LedgerStoragePayload {
  version: 1;
  updatedAt: string;
  transactions: Transaction[];
  budgets?: Record<string, number>;
  bills?: Bill[];
}

const createDefaultPayload = (): LedgerStoragePayload => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  transactions: [],
  budgets: {},
  bills: [],
});

interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getStorage(): LocalStorageLike | null {
  const g = globalThis as any;
  if (typeof g !== 'undefined') {
    if (g.localStorage) return g.localStorage;
    if (g.window && g.window.localStorage) return g.window.localStorage;
  }
  return null;
}

function readPayload(userId?: string): LedgerStoragePayload {
  const s = getStorage();
  if (!s) return createDefaultPayload();
  try {
    const key = getLedgerStorageKey(userId);
    let raw = s.getItem(key);
    // Fallback sang legacy key nếu key mới chưa có data nhưng legacy key có data
    if (!raw && key !== LEDGER_STORAGE_KEY) {
      raw = s.getItem(LEDGER_STORAGE_KEY);
    }
    if (!raw) return createDefaultPayload();
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.version === 1 && Array.isArray(parsed.transactions)) {
      return {
        version: 1,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
        transactions: parsed.transactions.filter((t: any) => t && typeof t.id === 'string' && typeof t.amount === 'number'),
        budgets: parsed.budgets && typeof parsed.budgets === 'object' ? parsed.budgets : {},
        bills: Array.isArray(parsed.bills) ? parsed.bills : [],
      };
    }
  } catch (err) {
    console.warn('[ledgerStorage] Dữ liệu LocalStorage không hợp lệ, dùng mặc định an toàn:', err);
  }
  return createDefaultPayload();
}

function writePayload(payload: LedgerStoragePayload, userId?: string): void {
  const s = getStorage();
  if (!s) return;
  try {
    payload.updatedAt = new Date().toISOString();
    const key = getLedgerStorageKey(userId);
    s.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.error('[ledgerStorage] Lỗi ghi LocalStorage:', err);
  }
}

export const ledgerStorage = {
  /** Lấy toàn bộ giao dịch */
  getAll(): Transaction[] {
    return readPayload().transactions;
  },

  /** Tìm giao dịch theo ID */
  getById(id: string): Transaction | undefined {
    return readPayload().transactions.find((t) => t.id === id);
  },

  /** Tạo mới một giao dịch */
  create(input: TransactionInput): Transaction {
    const payload = readPayload();
    const now = new Date().toISOString();
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const tx: Transaction = {
      id,
      kind: input.kind,
      amount: input.amount,
      category: input.category,
      note: input.note || '',
      occurredOn: input.occurredOn,
      valueTag: input.valueTag,
      createdAt: now,
      updatedAt: now,
    };
    payload.transactions = [tx, ...payload.transactions];
    writePayload(payload);
    return tx;
  },

  /** Cập nhật một giao dịch hiện có */
  update(id: string, input: Partial<TransactionInput>): Transaction | null {
    const payload = readPayload();
    const idx = payload.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const existing = payload.transactions[idx];
    const updated: Transaction = {
      ...existing,
      ...input,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    payload.transactions[idx] = updated;
    writePayload(payload);
    return updated;
  },

  /** Xóa một giao dịch */
  remove(id: string): boolean {
    const payload = readPayload();
    const initialLen = payload.transactions.length;
    payload.transactions = payload.transactions.filter((t) => t.id !== id);
    if (payload.transactions.length !== initialLen) {
      writePayload(payload);
      return true;
    }
    return false;
  },

  /** Thay thế toàn bộ danh sách giao dịch (dùng khi sync/seed) */
  replaceAll(transactions: Transaction[]): void {
    const payload = readPayload();
    payload.transactions = transactions;
    writePayload(payload);
  },

  /** Lấy ngân sách đã lưu của một tháng (YYYY-MM) */
  getBudget(month: string): number | null {
    const payload = readPayload();
    return payload.budgets?.[month] ?? null;
  },

  /** Lưu ngân sách tháng (YYYY-MM) */
  setBudget(month: string, limit: number | null): void {
    const payload = readPayload();
    payload.budgets = payload.budgets || {};
    if (limit === null || limit <= 0) {
      delete payload.budgets[month];
    } else {
      payload.budgets[month] = limit;
    }
    writePayload(payload);
  },

  /** Lấy danh sách hóa đơn định kỳ */
  getBills(): Bill[] {
    return readPayload().bills || [];
  },

  /** Thêm hoặc sửa hóa đơn */
  saveBill(bill: BillInput & { id?: string }): Bill {
    const payload = readPayload();
    payload.bills = payload.bills || [];
    const id = bill.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bill_${Date.now()}`);
    const existingIdx = payload.bills.findIndex((b) => b.id === id);

    const updatedBill: Bill = {
      id,
      name: bill.name,
      amount: bill.amount,
      category: bill.category,
      dayOfMonth: bill.dayOfMonth,
      autoRenew: bill.autoRenew,
      icon: bill.icon,
      nextDue: '',
      daysLeft: 0,
      state: 'upcoming',
      paidThisMonth: false,
    };

    if (existingIdx !== -1) {
      payload.bills[existingIdx] = { ...payload.bills[existingIdx], ...updatedBill };
    } else {
      payload.bills.push(updatedBill);
    }
    writePayload(payload);
    return updatedBill;
  },

  /** Xóa hóa đơn */
  deleteBill(id: string): boolean {
    const payload = readPayload();
    payload.bills = payload.bills || [];
    const initialLen = payload.bills.length;
    payload.bills = payload.bills.filter((b) => b.id !== id);
    if (payload.bills.length !== initialLen) {
      writePayload(payload);
      return true;
    }
    return false;
  },

  /** Đánh dấu hóa đơn đã thanh toán tháng này */
  payBill(id: string): void {
    const payload = readPayload();
    payload.bills = payload.bills || [];
    const b = payload.bills.find((x) => x.id === id);
    if (b) {
      b.paidThisMonth = true;
      writePayload(payload);
    }
  },

  /** Đọc toàn bộ snapshot payload */
  getRaw(): LedgerStoragePayload {
    return readPayload();
  },

  /** Xóa sạch storage ledger */
  clear(): void {
    const s = getStorage();
    if (s) {
      s.removeItem(LEDGER_STORAGE_KEY);
    }
  },
};
