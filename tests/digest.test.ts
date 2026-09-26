import { describe, expect, it } from 'vitest';
import { weeklyDigest } from '../shared/engine/digest';
import type { UserState, Transaction } from '../shared/types/domain';

const mockState: UserState = {
  profile: {
    monthlyIncome: 20000000,
    monthlyExpense: 10000000,
    emergencyTargetMonths: 3,
    riskSelfScore: 5,
  },
  goals: [
    {
      id: 'g1',
      kind: 'home',
      title: 'Mua nhà',
      targetAmount: 1000000000,
      currentAmount: 200000000,
      monthlyContribution: 5000000,
      targetMonth: '2030-01',
      priority: 1,
    }
  ],
  holdings: [],
  ledger: [],
  today: '2026-09',
  salutation: 'anh',
  snapshots: [],
};

describe('weeklyDigest', () => {
  it('basic calculation', () => {
    const txs: Transaction[] = [
      { id: '1', kind: 'income', amount: 5000000, category: 'salary', note: '', occurredOn: '2026-09-25' },
      { id: '2', kind: 'expense', amount: 1000000, category: 'food', note: '', occurredOn: '2026-09-26' },
    ];
    
    const digest = weeklyDigest(mockState, txs, 10);
    
    expect(digest.moneyIn).toBe(5000000);
    expect(digest.moneyOut).toBe(1000000);
    expect(digest.saved).toBe(4000000);
    expect(digest.valueHours).toBe(10);
  });

  it('no transactions -> zero values', () => {
    const digest = weeklyDigest(mockState, [], 0);
    expect(digest.moneyIn).toBe(0);
    expect(digest.moneyOut).toBe(0);
    expect(digest.saved).toBe(0);
  });

  it('goal progress calculation', () => {
    const digest = weeklyDigest(mockState, [], 0);
    expect(digest.goalProgress).not.toBeNull();
    expect(digest.goalProgress?.title).toBe('Mua nhà');
    expect(digest.goalProgress?.pct).toBe(0.2); // 200M / 1B
  });

  it('oneNotice selection logic', () => {
    const cleanState: UserState = { ...mockState, goals: [], profile: { ...mockState.profile, emergencyTargetMonths: 0 } };
    // 1. overspending
    const txs: Transaction[] = [
      { id: '1', kind: 'expense', amount: 5000000, category: 'food', note: '', occurredOn: '2026-09-26' },
    ];
    const d1 = weeklyDigest(cleanState, txs, 0);
    expect(d1.actionTo).toBe('/thu-chi');

    // 2. saving
    const txs2: Transaction[] = [
      { id: '2', kind: 'income', amount: 5000000, category: 'salary', note: '', occurredOn: '2026-09-26' },
    ];
    const d2 = weeklyDigest(cleanState, txs2, 0);
    expect(d2.actionTo).toBe('/muc-tieu');
  });
});
