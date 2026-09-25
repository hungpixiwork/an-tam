import { describe, expect, test } from 'vitest';
import type { UserState } from '../shared/types/domain';
import {
  buildOverview, effectiveProfile, evaluateAlerts, goalsSummary, holdingDefaults, peaceScore, portfolioAnalysis, proposePlan, setupStatus,
  simulationReport, DEFAULT_PARAMS,
} from '../shared/engine';
import { TODAY } from './fixtures';

const BASE = { monthlyIncome: 30e6, monthlyExpense: 15e6, emergencyTargetMonths: 6, riskSelfScore: 5 };
const ZERO = { ...BASE, monthlyIncome: 0, monthlyExpense: 0 };

describe('effectiveProfile', () => {
  test('không có sổ → dùng số nền', () => {
    const e = effectiveProfile(BASE, [], TODAY);
    expect(e.profile.monthlyIncome).toBe(30e6);
    expect([e.incomeSource, e.expenseSource]).toEqual(['baseline', 'baseline']);
  });

  test('trung bình các tháng đã trọn, bỏ qua tháng hiện tại và tháng quá cũ', () => {
    const ledger = [
      { month: '2026-01', income: 99e6, expense: 99e6 }, // quá 3 tháng
      { month: '2026-07', income: 40e6, expense: 20e6 },
      { month: '2026-08', income: 50e6, expense: 10e6 },
      { month: TODAY, income: 1e6, expense: 1e6 },
    ];
    const e = effectiveProfile(BASE, ledger, TODAY);
    expect(e.profile.monthlyIncome).toBe(45e6);
    expect(e.profile.monthlyExpense).toBe(15e6);
    expect(e.incomeSource).toBe('ledger');
    expect(e.ledgerMonths).toBe(2);
  });

  test('chưa có số nền, mới ghi sổ tháng này → dùng số tháng này', () => {
    const e = effectiveProfile(ZERO, [{ month: TODAY, income: 0, expense: 3e6 }], TODAY);
    expect(e.profile.monthlyExpense).toBe(3e6);
    expect(e.expenseSource).toBe('current_month');
    expect(e.incomeSource).toBe('none');
  });
});

test('holdingDefaults theo loại tài sản', () => {
  expect(holdingDefaults('stock').volatility).toBe('high');
  expect(holdingDefaults('cash').volatility).toBe('low');
});

describe('tài khoản trống', () => {
  const empty: UserState = { today: TODAY, profile: ZERO, holdings: [], goals: [], snapshots: [], ledger: [] };
  const user = { fullName: 'Lan', salutation: 'chị' as const };

  test('mọi màn tính được, không NaN', () => {
    const outputs = [
      peaceScore(empty),
      buildOverview(empty, user),
      goalsSummary(empty),
      portfolioAnalysis(empty),
      proposePlan(empty),
      simulationReport(empty, { ...DEFAULT_PARAMS, marketDropPct: -20 }),
      evaluateAlerts(empty),
    ];
    const bad: string[] = [];
    const walk = (v: unknown, path: string) => {
      if (typeof v === 'number' && !Number.isFinite(v)) bad.push(path);
      else if (typeof v === 'string' && /NaN|Infinity|undefined/.test(v)) bad.push(`${path}: ${v}`);
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    outputs.forEach((o, i) => walk(o, `#${i}`));
    expect(bad).toEqual([]);
  });

  test('tổng tài sản = 0 và trạng thái nhập liệu trống', () => {
    expect(portfolioAnalysis(empty).total).toBe(0);
    expect(buildOverview(empty, user).kpis.netWorth.value).toBe(0);
    expect(setupStatus(empty)).toEqual({ profile: false, holdings: false, goals: false, transactions: false });
    expect(evaluateAlerts(empty)).toEqual([]);
  });
});
