import { describe, expect, it } from 'vitest';
import { buildLedgerDashboard } from '../shared/engine/ledgerDashboard';
import type { Transaction } from '../shared/types/domain';

describe('buildLedgerDashboard Centralized Engine', () => {
  const mockTransactions: Transaction[] = [
    {
      id: 'tx1',
      kind: 'income',
      amount: 30_000_000,
      category: 'salary',
      note: 'Lương tháng',
      occurredOn: '2026-09-05',
    },
    {
      id: 'tx2',
      kind: 'expense',
      amount: 6_200_000,
      category: 'food',
      note: 'Ăn uống gia đình',
      occurredOn: '2026-09-10',
    },
    {
      id: 'tx3',
      kind: 'expense',
      amount: 4_500_000,
      category: 'housing',
      note: 'Tiền nhà',
      occurredOn: '2026-09-12',
    },
    {
      id: 'tx4',
      kind: 'expense',
      amount: 1_200_000,
      category: 'transport',
      note: 'Xăng xe',
      occurredOn: '2026-09-15',
    },
    // Tháng trước (2026-08)
    {
      id: 'tx5',
      kind: 'income',
      amount: 25_000_000,
      category: 'salary',
      note: 'Lương tháng trước',
      occurredOn: '2026-08-05',
    },
    {
      id: 'tx6',
      kind: 'expense',
      amount: 10_000_000,
      category: 'food',
      note: 'Ăn uống tháng trước',
      occurredOn: '2026-08-10',
    },
  ];

  it('tổng hợp thu nhập, chi tiêu, và dòng tiền ròng chính xác', () => {
    const d = buildLedgerDashboard(mockTransactions, {
      month: '2026-09',
      today: '2026-09-28',
      budgetLimit: 15_000_000,
    });

    expect(d.month).toBe('2026-09');
    expect(d.hasData).toBe(true);
    expect(d.totals.income).toBe(30_000_000);
    expect(d.totals.expense).toBe(11_900_000); // 6.2M + 4.5M + 1.2M
    expect(d.totals.net).toBe(18_100_000);

    // Tháng trước: 25M thu, 10M chi
    expect(d.prevTotals.income).toBe(25_000_000);
    expect(d.prevTotals.expense).toBe(10_000_000);
    expect(d.prevTotals.net).toBe(15_000_000);

    // Deltas
    expect(d.deltas.income).toBeCloseTo(0.2); // +20%
    expect(d.deltas.expense).toBeCloseTo(0.19); // +19%
  });

  it('tổng hợp ngân sách và % đã dùng', () => {
    const d = buildLedgerDashboard(mockTransactions, {
      month: '2026-09',
      today: '2026-09-28',
      budgetLimit: 20_000_000,
    });

    expect(d.budget.limit).toBe(20_000_000);
    expect(d.budget.spent).toBe(11_900_000);
    expect(d.budget.remaining).toBe(8_100_000);
    expect(d.budget.pct).toBeCloseTo(0.595);
  });

  it('phân chia cơ cấu chi tiêu danh mục (category breakdown)', () => {
    const d = buildLedgerDashboard(mockTransactions, {
      month: '2026-09',
      today: '2026-09-28',
    });

    expect(d.categories.length).toBe(3);
    expect(d.categories[0].key).toBe('food');
    expect(d.categories[0].amount).toBe(6_200_000);
    expect(d.categories[0].pct).toBeCloseTo(6_200_000 / 11_900_000);

    expect(d.categories[1].key).toBe('housing');
    expect(d.categories[1].amount).toBe(4_500_000);

    expect(d.categories[2].key).toBe('transport');
    expect(d.categories[2].amount).toBe(1_200_000);
  });

  it('tạo 6 tháng dòng tiền lịch sử liên tục', () => {
    const d = buildLedgerDashboard(mockTransactions, {
      month: '2026-09',
      today: '2026-09-28',
    });

    expect(d.months.length).toBe(6);
    expect(d.months[5].month).toBe('2026-09');
    expect(d.months[5].income).toBe(30_000_000);
    expect(d.months[5].expense).toBe(11_900_000);
    expect(d.months[5].net).toBe(18_100_000);

    expect(d.months[4].month).toBe('2026-08');
    expect(d.months[4].income).toBe(25_000_000);
    expect(d.months[4].expense).toBe(10_000_000);
  });

  it('xử lý tài khoản trống / 0 giao dịch an toàn (empty state)', () => {
    const d = buildLedgerDashboard([], {
      month: '2026-09',
      today: '2026-09-28',
    });

    expect(d.hasData).toBe(false);
    expect(d.totals).toEqual({ income: 0, expense: 0, net: 0 });
    expect(d.prevTotals).toEqual({ income: 0, expense: 0, net: 0 });
    expect(d.deltas).toEqual({ income: null, expense: null, net: null });
    expect(d.categories).toEqual([]);
    expect(d.months.length).toBe(6);
    expect(d.recent).toEqual([]);
  });

  it('xử lý số tiền lớn hàng tỷ đồng chính xác', () => {
    const bigTransactions: Transaction[] = [
      {
        id: 'big1',
        kind: 'income',
        amount: 2_500_000_000,
        category: 'business',
        note: 'Doanh thu dự án lớn',
        occurredOn: '2026-09-01',
      },
      {
        id: 'big2',
        kind: 'expense',
        amount: 1_200_000_000,
        category: 'investment_expense',
        note: 'Mua máy móc thiết bị',
        occurredOn: '2026-09-02',
      },
    ];

    const d = buildLedgerDashboard(bigTransactions, {
      month: '2026-09',
      today: '2026-09-28',
    });

    expect(d.totals.income).toBe(2_500_000_000);
    expect(d.totals.expense).toBe(1_200_000_000);
    expect(d.totals.net).toBe(1_300_000_000);
  });
});
