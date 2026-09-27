import { describe, expect, it } from 'vitest';
import { splitEvenly, vietQrUrl } from '../shared/engine/split';
import { budgetStatus, spendingAdvice } from '../shared/engine/budget';
import { billStatus } from '../shared/engine/bills';

describe('chia đều chi phí', () => {
  it('tổng luôn khớp, người trả nhận phần lẻ', () => {
    expect(splitEvenly(1_000_000, 3)).toEqual([334_000, 333_000, 333_000]);
    expect(splitEvenly(850_500, 4).reduce((a, b) => a + b, 0)).toBe(850_500);
  });
  it('link VietQR có số tiền và tên không dấu', () => {
    const url = vietQrUrl({ bankBin: '970436', accountNo: '0123456789', accountName: 'Phạm Phú Nguyễn Hưng' }, 333_000, 'Chia tien');
    expect(url).toContain('https://img.vietqr.io/image/970436-0123456789-compact2.png?');
    expect(url).toContain('amount=333000');
    expect(url).toContain('accountName=PHAM+PHU+NGUYEN+HUNG');
  });
});

describe('ngân sách, gợi ý, hóa đơn', () => {
  it('đã chi / còn lại', () => {
    const b = budgetStatus(31_000_000, 21_000_000);
    expect(b.remaining).toBe(10_000_000);
    expect(Math.round(b.pct! * 100)).toBe(68);
    expect(budgetStatus(null, 5).pct).toBeNull();
  });
  it('tiết kiệm = 50% khoản "Không đáng" trong danh mục chi cao', () => {
    const e = (category: string, amount: number, note = '', valueTag?: 'regret') => ({ kind: 'expense' as const, category, amount, note, valueTag });
    const a = spendingAdvice([
      e('food', 4_350_000), e('food', 1_200_000, 'Cà phê', 'regret'), e('food', 1_800_000, 'Đặt món', 'regret'),
      e('housing', 4_200_000), e('transport', 2_520_000), e('other_expense', 500_000, 'App', 'regret'),
    ]);
    expect(a.focus?.category).toBe('food');
    expect(a.saving).toMatchObject({ monthly: 1_500_000, yearly: 18_000_000 });
  });
  it('hóa đơn tự gia hạn đã qua ngày → kỳ sau', () => {
    expect(billStatus({ dayOfMonth: 20, autoRenew: true }, '2026-09-28', false)).toMatchObject({ nextDue: '2026-10-20', state: 'auto' });
    expect(billStatus({ dayOfMonth: 30, autoRenew: false }, '2026-09-28', false)).toMatchObject({ daysLeft: 2, state: 'due_soon' });
  });
});
