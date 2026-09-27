import { describe, expect, it } from 'vitest';
import { evaluateLifeChoice } from '../shared/engine/lifeChoice';
import { demoState } from './fixtures';

const M = 1_000_000;
const ctx = { kind: 'study' as const, incomeUpliftPct: 30, prereqsDone: 5, prereqsTotal: 6 };

describe('evaluateLifeChoice', () => {
  it('điểm khả thi = tổng 4 phần, chi phí gộp đúng, nghỉ hẳn làm giảm số tháng an toàn nhiều hơn vừa học vừa làm', () => {
    const state = demoState();
    const full = evaluateLifeChoice(state, { title: 'Nghỉ hẳn', cost: 300 * M, otherCost: 60 * M, durationMonths: 12, monthsWithoutIncome: 12, monthlyIncomeDelta: 0 }, ctx);
    const part = evaluateLifeChoice(state, { title: 'Vừa học vừa làm', cost: 300 * M, otherCost: 40 * M, durationMonths: 24, monthsWithoutIncome: 0, monthlyIncomeDelta: 0 }, ctx);

    for (const e of [full, part]) {
      const p = e.parts;
      expect(Math.abs(e.feasibility - (p.safety + p.goals + p.career + p.prereqs))).toBeLessThanOrEqual(2);
      expect(e.feasibility).toBeGreaterThanOrEqual(0);
      expect(e.feasibility).toBeLessThanOrEqual(100);
      expect(e.parts.prereqs).toBe(8);
    }
    expect(full.costs.living).toBe(12 * state.profile.monthlyExpense);
    expect(full.costs.total).toBe(360 * M + full.costs.living);
    expect(full.monthsAfter).toBeLessThan(part.monthsAfter);
    expect(full.feasibility).toBeLessThan(part.feasibility);
  });
});
