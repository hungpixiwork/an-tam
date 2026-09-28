import { expect, test } from 'vitest';
import { analyzeDecisionSimulation, decisionPreset } from '../shared/engine/decisionSimulation';
import { liquidAssets } from '../shared/engine/lifeChoice';
import { demoState } from './fixtures';

const option = {
  id: 'option-1', title: 'Nghỉ học', cost: 50_000_000, otherCost: 10_000_000,
  durationMonths: 12, monthsWithoutIncome: 6, monthlyIncomeDelta: -2_000_000,
};
const choice = { id: 'choice-1', title: 'Học thạc sĩ', incomeUpliftPct: 10, evaluate: { kind: 'study' as const, incomeUpliftPct: 10, prereqsDone: 3, prereqsTotal: 6 } };
const extras = { bonusAnnual: 60_000_000, esopAnnual: 40_000_000 };

test('cú sốc kép: 25 điểm tháng, bear ≤ base ≤ bull ≤ không sốc', () => {
  const state = demoState();
  const r = analyzeDecisionSimulation(state, choice, option, { mode: 'base', shock: 'industry', params: decisionPreset('industry') }, extras);
  expect(r.baseline.path).toHaveLength(25);
  expect(r.baseline.path[0]).toBe(liquidAssets(state));
  const at = (m: 'bull' | 'base' | 'bear') => r.scenarios[m].path[24];
  expect(at('bear')).toBeLessThanOrEqual(at('base'));
  expect(at('base')).toBeLessThanOrEqual(at('bull'));
  expect(at('bull')).toBeLessThanOrEqual(r.baseline.path[24]);
  expect(r.impact.safety.after).toBeLessThanOrEqual(r.impact.safety.before);
  expect(r.selected).toEqual(r.scenarios.base);
});

test('sốc cổ phiếu công ty chỉ đánh vào khoản isEmployerStock', () => {
  const state = demoState();
  state.holdings = state.holdings.map((h, i) => (i === 0 ? { ...h, category: 'stock', inPortfolio: true, isEmployerStock: true, value: 100_000_000 } : h));
  const p = { ...decisionPreset('market'), employerStockDropPct: 50, sectorDropPct: 0, marketDropPct: 0 };
  const r = analyzeDecisionSimulation(state, choice, option, { mode: 'base', shock: 'market', params: p }, extras);
  expect(r.scenarios.base.assetLoss).toBe(50_000_000);
});

test('mất việc không làm giảm tài sản, chỉ cắt thu nhập', () => {
  const r = analyzeDecisionSimulation(demoState(), choice, option, { mode: 'base', shock: 'job_loss', params: decisionPreset('job_loss') }, extras);
  expect(r.scenarios.base.assetLoss).toBe(0);
  expect(r.scenarios.base.incomeLost).toBeGreaterThan(0);
  expect(r.scenarios.base.path[24]).toBeLessThan(r.baseline.path[24]);
});
