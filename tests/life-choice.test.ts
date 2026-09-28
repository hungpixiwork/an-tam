import { describe, expect, it } from 'vitest';
import { evaluateLifeChoice, previewLifeChoice } from '../shared/engine/lifeChoice';
import { financialSignals } from '../shared/engine/signals';
import { addMonths } from '../shared/engine/month';
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

describe('hồ sơ tài chính gộp + kịch bản xấu', () => {
  it('mức tin cậy theo số tháng sổ thu chi thật', () => {
    const withMonths = (n: number) => {
      const s = demoState();
      s.ledger = Array.from({ length: n }, (_, i) => ({ month: addMonths(s.today, -(n - i)), income: 30 * M, expense: 20 * M }));
      return financialSignals(s, { bills: 5 * M }).confidence.level;
    };
    expect([withMonths(1), withMonths(3), withMonths(5)]).toEqual(['thap', 'vua', 'cao']);
  });

  it('kịch bản xấu: đủ tiền thì trụ được, hết tiền thì không; câu kết luận nói rõ căn cứ', () => {
    const s = demoState();
    const opt = { title: 'Nghỉ 6 tháng', cost: 0, otherCost: 0, durationMonths: 6, monthsWithoutIncome: 6, monthlyIncomeDelta: 0 };
    const rich = evaluateLifeChoice(s, opt, { ...ctx, signals: financialSignals(s, { bills: 5 * M }) });
    expect(rich.worstCase?.survives).toBe(true);
    expect(rich.basis).toContain('Số còn ước lượng');
    const poor = { ...s, holdings: [{ ...s.holdings[0], category: 'cash' as const, value: 10 * M }] };
    const bad = evaluateLifeChoice(poor, opt, { ...ctx, signals: financialSignals(poor) });
    expect(bad.worstCase).toEqual({ survives: false, monthsCovered: 0 });
  });
});

describe('preview lựa chọn', () => {
  it('base giữ ước tính gốc, bull và bear tính lại từ cùng phương án và hồ sơ', () => {
    const state = demoState();
    const option = { title: 'Vừa học vừa làm', cost: 100 * M, otherCost: 20 * M, durationMonths: 12, monthsWithoutIncome: 3, monthlyIncomeDelta: -2 * M };
    const base = previewLifeChoice(state, 'option-1', option, ctx, 'base');
    const bull = previewLifeChoice(state, 'option-1', option, ctx, 'bull');
    const bear = previewLifeChoice(state, 'option-1', option, ctx, 'bear');
    expect(base.evaluation).toEqual(evaluateLifeChoice(state, option, ctx));
    expect(bull.evaluation.costs.total).toBeLessThan(base.evaluation.costs.total);
    expect(bear.evaluation.costs.total).toBeGreaterThan(base.evaluation.costs.total);
    expect(bull.expectedMonthlyIncome).toBeGreaterThan(base.expectedMonthlyIncome);
    expect(bear.expectedMonthlyIncome).toBeLessThan(base.expectedMonthlyIncome);
    expect(base.startAfterMonths).not.toBeNull();
    expect(bear.startAfterMonths ?? 0).toBeGreaterThanOrEqual(base.startAfterMonths ?? 0);
  });
});
