// Logic tiền của màn Tổng quan: đề xuất quỹ dự phòng, tài sản ròng, số tháng chuẩn bị.
import { describe, expect, test } from 'vitest';
import type { UserState } from '../shared/types/domain';
import { emergencySuggestion, lifeChoiceReadiness, monthCashflow, netWorthBreakdown } from '../shared/engine';

const M = 1_000_000;
const base: UserState = {
  today: '2026-09',
  salutation: 'anh',
  profile: { monthlyIncome: 28.5 * M, monthlyExpense: 20 * M, emergencyTargetMonths: 6, riskSelfScore: 5 },
  holdings: [
    { id: 'c', name: 'Tiết kiệm', category: 'cash', value: 100 * M, role: '', volatility: 'low', riskGroup: '', isMain: true },
    { id: 'f', name: 'Quỹ', category: 'fund', value: 320 * M, role: '', volatility: 'mid', riskGroup: '', isMain: true },
    { id: 'o', name: 'Vàng', category: 'other', value: 150 * M, role: '', volatility: 'low', riskGroup: '', isMain: true },
  ],
  goals: [{ id: 'e', kind: 'emergency', title: 'Quỹ dự phòng', targetAmount: 120 * M, currentAmount: 84 * M, targetMonth: '2027-03', monthlyContribution: 4 * M, priority: 1 }],
  snapshots: [],
  ledger: [
    { month: '2026-08', income: 28 * M, expense: 18.5 * M },
    { month: '2026-09', income: 28.5 * M, expense: 21 * M },
  ],
  liabilities: [{ id: 'l', name: 'Vay', kind: 'consumer', balance: 50 * M, monthlyPayment: 0, rateBp: 0 }],
};

describe('Tổng quan — tiền', () => {
  test('thiếu 36tr trong 6 tháng, đang góp 4tr → đề xuất góp thêm 2tr/tháng', () => {
    const s = emergencySuggestion(base);
    expect(s.key).toBe('emergency_topup');
    expect(s.vars.amount).toBe(2 * M);
    expect(s.action).toMatchObject({ kind: 'emergency_topup', current: 4 * M, suggested: 6 * M });
  });

  test('góp đủ 6tr/tháng → đúng tiến độ, số tháng chuẩn bị giảm 9 → 6', () => {
    expect(lifeChoiceReadiness(base).monthsNeeded).toBe(9);
    const ok = { ...base, goals: [{ ...base.goals[0], monthlyContribution: 6 * M }] };
    expect(emergencySuggestion(ok).key).toBe('emergency_on_track');
    expect(lifeChoiceReadiness(ok)).toMatchObject({ requiredReserve: 120 * M, gap: 36 * M, monthsNeeded: 6, ready: false });
  });

  test('tài sản ròng = tài sản − nợ; so 3 tháng trước bằng phần để dành trong sổ', () => {
    const nw = netWorthBreakdown(base);
    expect(nw).toMatchObject({ net: 520 * M, cash: 100 * M, invested: 320 * M, other: 150 * M, debt: 50 * M });
    // Để dành tháng 8 + 9 = 17tr → trước đó 503tr
    expect(nw.deltaPct).toBeCloseTo(17 / 503, 6);
  });

  test('dòng tiền tháng này lấy từ sổ, chuỗi 6 tháng có tháng trống = null', () => {
    const cf = monthCashflow(base);
    expect(cf).toMatchObject({ income: 28.5 * M, expense: 21 * M, net: 7.5 * M, source: 'ledger' });
    expect(cf.months.map((m) => m.net)).toEqual([null, null, null, null, 9.5 * M, 7.5 * M]);
  });
});
