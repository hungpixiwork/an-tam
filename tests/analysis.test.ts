import { expect, test } from 'vitest';
import { demoState } from './fixtures';
import { goalsSummary, habitsProfile, portfolioAnalysis, proposePlan, simulationReport } from '../shared/engine';

test('proposePlan cải thiện xác suất và điểm', () => {
  const p = proposePlan(demoState());
  expect(p.steps.map((s) => s.key)).toEqual(['emergency', 'rebalance', 'contribution']);
  expect(p.proposed.goalProbability).toBeGreaterThan(p.current.goalProbability);
  expect(p.proposed.peaceScore).toBeGreaterThanOrEqual(p.current.peaceScore);
  expect(p.chart).toHaveLength(12);
  console.log(JSON.stringify({ steps: p.steps, c: p.current, pr: p.proposed, last: p.chart.at(-1) }));
});

test('goalsSummary', () => {
  const s = goalsSummary(demoState());
  expect(s.goals).toHaveLength(4);
  expect(s.milestones.length).toBe(5);
  console.log(JSON.stringify(s.tip), JSON.stringify(s.milestones), s.goals.map((g) => [g.title, g.requiredMonthly]));
});

test('simulationReport', () => {
  const r = simulationReport(demoState(), { marketDropPct: -20, inflationPct: 6, incomePauseMonths: 6, interestRateDeltaPct: -1.5, surpriseCost: 120e6 });
  expect(r.label).toBe('Thị trường giảm 20% + thu nhập gián đoạn 6 tháng + lạm phát 6% + chi phí bất ngờ 120 triệu');
  expect(r.improvement.goalProbAfter).toBeGreaterThan(r.improvement.goalProbBefore);
  console.log(JSON.stringify({ h: r.home, i: r.improvement, b: r.before, a: r.after }));
});

test('habitsProfile & portfolioAnalysis', () => {
  const opts = [{ key: 'hold', label: 'Giữ', risk: 7 }, { key: 'reduce', label: 'Giảm', risk: 4 }];
  const h = habitsProfile(8, [{ id: 'a', prompt: '', context: '', icon: '', options: opts }, { id: 'b', prompt: '', context: '', icon: '', options: opts }], { a: 'hold', b: 'reduce' });
  expect(h.actualScore).toBe(6);
  const p = portfolioAnalysis(demoState());
  expect(p.riskGroups[0].name).toBe('Nhóm tăng trưởng công nghệ');
  console.log(JSON.stringify(p.riskGroups.map((g) => [g.name, g.pct.toFixed(2)])));
});
