import { describe, it, expect } from 'vitest';
import { incomeGrowthPlan, financialConnection, valueHoursSummary, timeAllocationInsight } from '../shared/engine/earn';
import { demoState } from './fixtures';
import type { IncomeProfile, ValueHourEntry, TimeAllocation } from '../shared/types/domain';

describe('EARN Engine', () => {
  describe('incomeGrowthPlan', () => {
    it('calculates gap and available hours correctly', () => {
      const profile: IncomeProfile = {
        currentIncome: 20000000,
        targetIncome: 30000000,
        targetMonths: 6,
        occupation: 'Developer',
        hoursPerWeek: 10,
        focusSkill: 'React',
      };
      const plan = incomeGrowthPlan(profile);
      expect(plan.gap).toBe(10000000);
      expect(plan.totalAvailableHours).toBe(260); // 10 * 6 * 4.33 = 259.8 -> 260
      expect(plan.recommendations.length).toBeGreaterThan(0);
    });

    it('handles zero hours correctly', () => {
      const profile: IncomeProfile = {
        currentIncome: 20000000,
        targetIncome: 30000000,
        targetMonths: 6,
        occupation: 'Developer',
        hoursPerWeek: 0,
        focusSkill: 'React',
      };
      const plan = incomeGrowthPlan(profile);
      expect(plan.totalAvailableHours).toBe(0);
      expect(plan.recommendations[0]).toContain('Hiện chưa có thời gian phân bổ');
    });
  });

  describe('financialConnection', () => {
    it('calculates potential saving and accelerates goal', () => {
      const state = demoState();
      // Assume demoState profile has income 30M, expense 20M => savings rate 10/30 = 1/3
      state.profile.monthlyIncome = 30000000;
      state.profile.monthlyExpense = 20000000;
      
      const profile: IncomeProfile = {
        currentIncome: 30000000,
        targetIncome: 45000000,
        targetMonths: 12,
        occupation: 'Dev',
        hoursPerWeek: 10,
        focusSkill: 'AI',
      };

      const conn = financialConnection(profile, state);
      expect(conn.additionalMonthlyIncome).toBe(15000000);
      expect(conn.currentSavingsRate).toBeCloseTo(1 / 3);
      expect(conn.potentialMonthlySaving).toBe(5000000);
    });

    it('skips emergency goal for acceleration', () => {
      const state = demoState();
      state.goals = [
        { id: '1', kind: 'emergency', title: 'Quỹ dự phòng', targetAmount: 100, currentAmount: 50, targetMonth: '2027-01', monthlyContribution: 10, priority: 1 }
      ];
      state.profile.monthlyIncome = 30000000;
      state.profile.monthlyExpense = 20000000;
      
      const profile: IncomeProfile = {
        currentIncome: 30000000,
        targetIncome: 45000000,
        targetMonths: 12,
        occupation: 'Dev',
        hoursPerWeek: 10,
        focusSkill: 'AI',
      };

      const conn = financialConnection(profile, state);
      expect(conn.goalAcceleration).toBeNull();
    });
  });

  describe('valueHoursSummary', () => {
    it('summarizes planned vs actual correctly', () => {
      const entries: ValueHourEntry[] = [
        { activityId: '1', activityTitle: 'Học React', week: '2026-W38', planned: 5, actual: 4 },
        { activityId: '2', activityTitle: 'Làm dự án', week: '2026-W38', planned: 2, actual: 3 },
      ];
      const titles = new Map([['1', 'React Advanced']]);
      const summary = valueHoursSummary(entries, titles);
      expect(summary.totalPlanned).toBe(7);
      expect(summary.totalActual).toBe(7);
      expect(summary.activities[0].title).toBe('React Advanced');
      expect(summary.activities[1].title).toBe('Làm dự án');
      expect(summary.insight).toContain('Giữ vững phong độ');
    });
  });

  describe('timeAllocationInsight', () => {
    it('calculates unallocated hours and provides insight based on learning hours', () => {
      const allocations: TimeAllocation[] = [
        { category: 'work', hours: 40 },
        { category: 'sleep', hours: 56 },
        { category: 'learning', hours: 3 },
      ];
      const profile: IncomeProfile = {
        currentIncome: 20,
        targetIncome: 30,
        targetMonths: 6,
        occupation: '',
        hoursPerWeek: 10,
        focusSkill: '',
      };
      const insight = timeAllocationInsight(allocations, profile);
      expect(insight.unallocated).toBe(168 - 40 - 56 - 3);
      expect(insight.insight).toContain('hiện chưa nhận được nhiều thời gian');
    });
  });
});
