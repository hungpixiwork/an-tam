import { beforeEach, describe, expect, it } from 'vitest';
import { ledgerStorage, LEDGER_STORAGE_KEY } from '../client/src/lib/storage/ledgerStorage';

describe('ledgerStorage Local Storage Abstraction', () => {
  // Mock localStorage
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: mockLocalStorage },
      writable: true,
      configurable: true,
    });
  });

  it('bắt đầu từ trạng thái rỗng an toàn', () => {
    expect(ledgerStorage.getAll()).toEqual([]);
    expect(ledgerStorage.getBudget('2026-09')).toBeNull();
    expect(ledgerStorage.getBills()).toEqual([]);
  });

  it('thêm, đọc, sửa, xóa giao dịch ổn định', () => {
    // Create
    const tx = ledgerStorage.create({
      kind: 'expense',
      amount: 150_000,
      category: 'food',
      note: 'Ăn trưa',
      occurredOn: '2026-09-28',
    });
    expect(tx.id).toBeDefined();
    expect(tx.amount).toBe(150_000);
    expect(ledgerStorage.getAll().length).toBe(1);
    expect(ledgerStorage.getById(tx.id)?.note).toBe('Ăn trưa');

    // Update
    const updated = ledgerStorage.update(tx.id, { amount: 250_000, note: 'Ăn trưa buffet' });
    expect(updated?.amount).toBe(250_000);
    expect(updated?.note).toBe('Ăn trưa buffet');
    expect(ledgerStorage.getById(tx.id)?.amount).toBe(250_000);

    // Delete
    const removed = ledgerStorage.remove(tx.id);
    expect(removed).toBe(true);
    expect(ledgerStorage.getAll().length).toBe(0);
    expect(ledgerStorage.getById(tx.id)).toBeUndefined();
  });

  it('lưu và truy xuất ngân sách theo tháng', () => {
    ledgerStorage.setBudget('2026-09', 15_000_000);
    expect(ledgerStorage.getBudget('2026-09')).toBe(15_000_000);
    expect(ledgerStorage.getBudget('2026-10')).toBeNull();

    // Xóa ngân sách
    ledgerStorage.setBudget('2026-09', null);
    expect(ledgerStorage.getBudget('2026-09')).toBeNull();
  });

  it('lưu, sửa, thanh toán và xóa hóa đơn định kỳ', () => {
    const bill = ledgerStorage.saveBill({
      name: 'Internet FPT',
      amount: 250_000,
      category: 'utilities',
      dayOfMonth: 15,
      autoRenew: true,
      icon: 'wifi',
    });
    expect(bill.id).toBeDefined();
    expect(ledgerStorage.getBills().length).toBe(1);

    // Pay bill
    ledgerStorage.payBill(bill.id);
    expect(ledgerStorage.getBills()[0].paidThisMonth).toBe(true);

    // Delete bill
    ledgerStorage.deleteBill(bill.id);
    expect(ledgerStorage.getBills().length).toBe(0);
  });

  it('chống crash khi LocalStorage chứa JSON hỏng (corrupt data)', () => {
    store[LEDGER_STORAGE_KEY] = 'INVALID_CORRUPTED_JSON_{[';
    expect(ledgerStorage.getAll()).toEqual([]);
    expect(ledgerStorage.getBills()).toEqual([]);
  });
});
