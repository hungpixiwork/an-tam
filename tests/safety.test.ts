import { describe, it, expect } from 'vitest';
import { buildSafety } from '../shared/engine/safety';
import type { UserState } from '../shared/types/domain';

const M = 1_000_000;
const state: UserState = {
  today: '2026-09',
  salutation: 'anh',
  profile: { monthlyIncome: 28.5 * M, monthlyExpense: 20 * M, emergencyTargetMonths: 6, riskSelfScore: 5 },
  holdings: [],
  goals: [
    { id: 'e', kind: 'emergency', title: 'Quỹ dự phòng', targetAmount: 120 * M, currentAmount: 84 * M, targetMonth: '2027-03', monthlyContribution: 4 * M, priority: 1 },
    { id: 'j', kind: 'custom', title: 'Nhật Bản', targetAmount: 60 * M, currentAmount: 16 * M, targetMonth: '2027-07', monthlyContribution: 2 * M, priority: 3, horizon: 'short' },
  ],
  snapshots: [],
  ledger: [],
};

describe('buildSafety', () => {
  it('tính số tháng an toàn, kế hoạch 6/12 tháng và trạng thái mất việc', () => {
    const s = buildSafety(state);
    expect(s.fund.months).toBe(4.2);
    expect(s.fund.gap6).toBe(36 * M);
    expect(s.plans[0]).toMatchObject({ months: 6, gap: 36 * M, monthly: 6 * M, duration: 6, active: false });
    expect(s.plans[1]).toMatchObject({ months: 12, gap: 156 * M });
    expect(s.plans[1].monthly * s.plans[1].duration).toBeGreaterThanOrEqual(156 * M);
    expect(s.jobLoss.status).toBe('unsafe');
    expect(s.counts).toEqual({ all: 2, short: 2, mid: 0, long: 0 });
  });

  it('để dành thêm giúp đạt quỹ 6 tháng sớm hơn', () => {
    const s = buildSafety(state, {
      recent: [{ id: 't', kind: 'expense', amount: 7 * M, category: 'food', note: '', occurredOn: '2026-09-05' }],
    });
    expect(s.advice.extraMonthly).toBe(1.4 * M);
    expect(s.advice.fundMonthsFrom).toBe(6);
    expect(s.advice.fundMonthsTo).toBe(5);
    expect(s.advice.accelerations.find((a) => a.goalId === 'e')?.monthsSooner).toBe(1);
  });
});
