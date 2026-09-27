import { describe, expect, it } from 'vitest';
import { allocateSavings, rebalanceSteps, targetPortfolio } from '../shared/engine/allocation';
import { savingsCapacity } from '../shared/engine/peace';
import type { AssetCategory } from '../shared/types/domain';
import { demoState } from './fixtures';

const M = 1_000_000;

describe('allocation', () => {
  it('chia tiền để dành không bao giờ vượt tiền dư mỗi tháng', () => {
    for (const income of [0, 15 * M, 25 * M, 60 * M]) {
      const s = demoState();
      s.profile = { ...s.profile, monthlyIncome: income };
      const plan = allocateSavings(s);
      expect(plan.allocated).toBeLessThanOrEqual(Math.max(0, savingsCapacity(s)));
      for (const i of plan.items) expect(i.suggested).toBeGreaterThanOrEqual(0);
    }
  });

  it('các bước chuyển tiền có tổng thay đổi bằng 0', () => {
    const s = demoState();
    s.holdings = [
      ...s.holdings,
      { id: 'emp', name: 'Cổ phiếu công ty', category: 'stock', value: 200 * M, role: '', volatility: 'high', riskGroup: '', isMain: false, isEmployerStock: true, inPortfolio: true },
    ];
    const steps = rebalanceSteps(s, targetPortfolio(s));
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.length).toBeLessThanOrEqual(4);
    const net: Partial<Record<AssetCategory, number>> = {};
    for (const st of steps) {
      expect(st.amount % M).toBe(0);
      expect(st.amount).toBeGreaterThanOrEqual(5 * M);
      net[st.from] = (net[st.from] ?? 0) - st.amount;
      net[st.to] = (net[st.to] ?? 0) + st.amount;
    }
    expect(Object.values(net).reduce((a, b) => a + b, 0)).toBe(0);
  });
});
