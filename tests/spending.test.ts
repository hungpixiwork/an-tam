import { describe, expect, it } from 'vitest';
import { spendingSummary } from '../shared/engine/spending';
import type { Transaction } from '../shared/types/domain';

describe('Spending Engine', () => {
  it('empty transactions -> totals zero', () => {
    const summary = spendingSummary([]);
    expect(summary.totalExpense).toBe(0);
    expect(summary.tagged).toBe(0);
    expect(summary.untagged).toBe(0);
    expect(summary.optimizable).toBe(0);
    expect(summary.valueSpending).toBe(0);
    expect(summary.insight).toBeNull();
  });

  it('mixed tags -> correct amounts', () => {
    const transactions: Transaction[] = [
      { id: '1', kind: 'expense', amount: 100000, category: 'food', note: '', occurredOn: '2026-09-01', valueTag: 'essential' },
      { id: '2', kind: 'expense', amount: 50000, category: 'food', note: '', occurredOn: '2026-09-02', valueTag: 'joy' },
      { id: '3', kind: 'expense', amount: 200000, category: 'shopping', note: '', occurredOn: '2026-09-03', valueTag: 'regret' },
      { id: '4', kind: 'expense', amount: 150000, category: 'education', note: '', occurredOn: '2026-09-04', valueTag: 'growth' },
      { id: '5', kind: 'income', amount: 5000000, category: 'salary', note: '', occurredOn: '2026-09-05' },
      { id: '6', kind: 'expense', amount: 30000, category: 'coffee', note: '', occurredOn: '2026-09-06' }, // untagged
    ];
    
    const summary = spendingSummary(transactions);
    expect(summary.totalExpense).toBe(530000); // 100k+50k+200k+150k+30k
    expect(summary.tagged).toBe(4);
    expect(summary.untagged).toBe(1);
    expect(summary.optimizable).toBe(200000);
    expect(summary.valueSpending).toBe(200000); // growth 150k + joy 50k
  });

  it('regret > 10% -> insight message', () => {
    const transactions: Transaction[] = [
      { id: '1', kind: 'expense', amount: 100000, category: 'food', note: '', occurredOn: '2026-09-01', valueTag: 'essential' },
      { id: '2', kind: 'expense', amount: 50000, category: 'food', note: '', occurredOn: '2026-09-02', valueTag: 'joy' },
      { id: '3', kind: 'expense', amount: 200000, category: 'shopping', note: '', occurredOn: '2026-09-03', valueTag: 'regret' },
      { id: '4', kind: 'expense', amount: 150000, category: 'education', note: '', occurredOn: '2026-09-04', valueTag: 'growth' },
      { id: '5', kind: 'expense', amount: 30000, category: 'coffee', note: '', occurredOn: '2026-09-06', valueTag: 'essential' }, 
    ];
    // 5 tagged. Regret = 200k, total = 530k. Regret > 10%
    const summary = spendingSummary(transactions);
    expect(summary.insight).toContain('Khoản dễ tối ưu nhất có thể là');
  });

  it('too few tagged -> null insight', () => {
    const transactions: Transaction[] = [
      { id: '1', kind: 'expense', amount: 100000, category: 'food', note: '', occurredOn: '2026-09-01', valueTag: 'essential' },
      { id: '3', kind: 'expense', amount: 200000, category: 'shopping', note: '', occurredOn: '2026-09-03', valueTag: 'regret' },
    ];
    const summary = spendingSummary(transactions);
    expect(summary.insight).toBeNull();
  });
});
