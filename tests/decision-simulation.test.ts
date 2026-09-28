import { expect, test } from 'vitest';
import { analyzeDecisionSimulation } from '../shared/engine/decisionSimulation';
import { demoState } from './fixtures';
import { liquidAssets } from '../shared/engine/lifeChoice';

const option = {
  id: 'option-1', title: 'Nghỉ học', cost: 50_000_000, otherCost: 10_000_000,
  durationMonths: 12, monthsWithoutIncome: 6, monthlyIncomeDelta: -2_000_000,
};
const choice = { id: 'choice-1', title: 'Học thạc sĩ', incomeUpliftPct: 10 };
const params = { marketDropPct: -35, inflationPct: 5, incomePauseMonths: 6, interestRateDeltaPct: 0, surpriseCost: 0 };

test('cú sốc kép dự phóng 24 tháng và kịch bản xấu không tốt hơn kịch bản cơ sở', () => {
  const state = demoState();
  const report = analyzeDecisionSimulation(state, choice, option, { mode: 'base', shock: 'industry', params });
  expect(report.projection).toHaveLength(25);
  expect(report.projection[0].baseline).toBe(liquidAssets(state) - option.cost - option.otherCost);
  expect(report.scenarios.bear.month24Cash).toBeLessThanOrEqual(report.scenarios.base.month24Cash);
  expect(report.scenarios.base.month24Cash).toBeLessThanOrEqual(report.scenarios.bull.month24Cash);
  expect(report.selected).toEqual(report.scenarios.base);
});

test('mất việc không làm mất giá tài sản và cú sốc thị trường không cắt thu nhập', () => {
  const state = demoState();
  const job = analyzeDecisionSimulation(state, choice, option, { mode: 'base', shock: 'job_loss', params });
  const market = analyzeDecisionSimulation(state, choice, option, { mode: 'base', shock: 'market', params });
  expect(job.projection[0].base).toBe(job.projection[0].baseline);
  expect(market.projection[0].base).toBeLessThan(market.projection[0].baseline);
  expect(job.projection[24].base).toBeLessThan(job.projection[24].baseline);
});
