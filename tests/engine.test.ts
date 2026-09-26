import { describe, expect, test } from 'vitest';
import { demoState, TODAY } from './fixtures';
import {
  addMonths, allocation, buildOverview, evaluateAlerts, goalProbability, monthsBetween, peaceScore, simulate, DEFAULT_PARAMS,
} from '../shared/engine';

const USER = { fullName: 'Nguyễn Văn Minh', salutation: 'anh' as const };

describe('month', () => {
  test('cộng / trừ tháng qua năm', () => {
    expect(addMonths('2026-09', 4)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(monthsBetween('2026-09', '2030-08')).toBe(47);
  });
});

describe('peaceScore', () => {
  test('dữ liệu demo cho 82 điểm "Ổn định"', () => {
    const result = peaceScore(demoState());
    expect(result.score).toBe(82);
    expect(result.label).toBe('Ổn định');
    expect(result.factors.reduce((s, f) => s + f.max, 0)).toBe(100);
  });

  test('quỹ dự phòng cạn làm giảm điểm', () => {
    const s = demoState();
    s.goals = s.goals.map((g) => (g.kind === 'emergency' ? { ...g, currentAmount: 0 } : g));
    expect(peaceScore(s).score).toBeLessThan(82);
  });
});

describe('goalProbability', () => {
  test('tất định và nằm trong (0, 1)', () => {
    const s = demoState();
    const home = s.goals[0];
    const p = goalProbability(home, s);
    expect(p).toBe(goalProbability(home, s));
    expect(p).toBeGreaterThan(0.7);
    expect(p).toBeLessThan(0.76);
  });

  test('để dành nhiều hơn → xác suất cao hơn', () => {
    const s = demoState();
    const home = s.goals[0];
    expect(goalProbability(home, s, { monthlyContribution: 20e6 })).toBeGreaterThan(goalProbability(home, s));
  });
});

describe('allocation', () => {
  test('tổng 1,24 tỷ, % cộng lại bằng 1', () => {
    const slices = allocation(demoState().holdings);
    expect(slices.reduce((s, x) => s + x.value, 0)).toBe(1_240_000_000);
    expect(slices.reduce((s, x) => s + x.pct, 0)).toBeCloseTo(1);
    expect(slices.map((x) => x.label)).toEqual(['Tiền mặt', 'Quỹ mở', 'Cổ phiếu', 'Trái phiếu', 'Khác']);
  });
});

describe('simulate', () => {
  test('không có cú sốc → không đổi', () => {
    const out = simulate(demoState(), DEFAULT_PARAMS);
    expect(out.after.netWorth).toBe(out.before.netWorth);
    expect(out.after.peaceScore).toBe(out.before.peaceScore);
    expect(out.goals.every((g) => g.delayMonths === 0)).toBe(true);
  });

  test('"Năm khó khăn" làm giảm tài sản, điểm và làm chậm mục tiêu mua nhà', () => {
    const out = simulate(demoState(), { marketDropPct: -20, inflationPct: 6, incomePauseMonths: 6, interestRateDeltaPct: -1.5, surpriseCost: 120e6 });
    expect(out.after.netWorth).toBeLessThan(out.before.netWorth);
    expect(out.after.peaceScore).toBeLessThan(out.before.peaceScore);
    expect(out.after.emergencyMonths).toBeLessThan(out.before.emergencyMonths);
    expect(out.goals.find((g) => g.kind === 'home')!.delayMonths).toBeGreaterThan(0);
    expect(out.projection).toHaveLength(11);
  });
});

describe('evaluateAlerts', () => {
  test('demo: cảnh báo tỷ trọng biến động và quỹ dự phòng', () => {
    const keys = evaluateAlerts(demoState()).map((a) => a.ruleKey);
    expect(keys).toEqual(['volatile_share', 'emergency_low']);
  });

  test('spending_over alert khi chi vượt 110%', () => {
    const s = demoState();
    s.ledger = [{ month: s.today, income: 30_000_000, expense: s.profile.monthlyExpense * 1.2 }];
    const alerts = evaluateAlerts(s);
    expect(alerts.some((a) => a.ruleKey === 'spending_over')).toBe(true);
  });

  test('savings_declining alert khi 3 tháng giảm', () => {
    const s = demoState();
    s.ledger = [
      { month: '2026-06', income: 30_000_000, expense: 10_000_000 },
      { month: '2026-07', income: 30_000_000, expense: 15_000_000 },
      { month: '2026-08', income: 30_000_000, expense: 20_000_000 },
    ];
    const alerts = evaluateAlerts(s);
    expect(alerts.some((a) => a.ruleKey === 'savings_declining')).toBe(true);
  });
});

describe('buildOverview', () => {
  const o = buildOverview(demoState(), USER);

  test('lời chào và trạng thái', () => {
    expect(o.greeting.title).toBe('Chào anh Minh,');
    expect(o.greeting.headline).toBe('hôm nay tài chính của anh đang ở {em:mức ổn định}.');
    expect(o.peace.score).toBe(82);
  });

  test('KPI khớp mockup', () => {
    expect(o.kpis.netWorth.value).toBe(1_240_000_000);
    expect(Math.round(o.kpis.netWorth.deltaPct! * 100)).toBe(6);
    expect(o.kpis.emergency.value).toBe(180_000_000);
    expect(Math.round(o.kpis.emergency.deltaPct! * 100)).toBe(12);
    expect(o.kpis.invested.value).toBe(740_000_000);
    expect(Math.round(o.kpis.invested.deltaPct! * 100)).toBe(8);
    expect(o.kpis.cashflow.value).toBe(18_000_000);
    expect(o.kpis.cashflow.trend).toBe('better');
  });

  test('chuỗi 12 tháng kết thúc ở tháng hiện tại', () => {
    expect(o.netWorthSeries).toHaveLength(12);
    expect(o.netWorthSeries.at(-1)).toMatchObject({ month: TODAY, total: 1_240_000_000 });
    expect(buildOverview(demoState(), USER, { range: 6 }).netWorthSeries).toHaveLength(6);
  });

  test('gợi ý hôm nay: mua nhà chậm 8 tháng khi thị trường giảm 20%', () => {
    expect(o.tip.delayMonths).toBe(8);
    expect(o.tip.text).toContain('mục tiêu mua nhà có thể bị chậm 8 tháng');
  });
});
