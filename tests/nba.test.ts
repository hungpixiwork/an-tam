import { describe, expect, it } from 'vitest';
import { nextBestActions } from '../shared/engine/nba';
import { demoState, TODAY } from './fixtures';

describe('Next Best Action Engine', () => {
  it('negative cashflow -> first priority', () => {
    const state = demoState();
    state.ledger = [{ month: TODAY, income: 10000000, expense: 15000000 }];
    const actions = nextBestActions(state);
    expect(actions[0].key).toBe('negative_cashflow');
  });

  it('emergency low -> second priority (when cashflow ok)', () => {
    const state = demoState();
    state.ledger = [{ month: TODAY, income: 15000000, expense: 10000000 }];
    state.snapshots = [{ month: TODAY, total: 20000000, emergency: 1000000, invested: 0, cashflow: 5000000 }];
    state.profile.monthlyExpense = 10000000;
    state.profile.emergencyTargetMonths = 3;
    const actions = nextBestActions(state);
    expect(actions[0].key).toBe('emergency_low');
  });

  it('goal gap -> triggered when major goal delayed > 6 months', () => {
    const state = demoState();
    state.goals = [
      {
        id: 'g1', kind: 'home', title: 'Mua nhà', targetAmount: 2000000000, currentAmount: 1900000000,
        targetMonth: '2027-09', monthlyContribution: 1000000, priority: 1
      }
    ];
    const actions = nextBestActions(state);
    expect(actions.some(a => a.key === 'goal_gap')).toBe(true);
  });

  it('income growth -> triggered when income profile exists but low learning hours', () => {
    const state = demoState();
    const actions = nextBestActions(state, { 
      incomeProfile: { currentIncome: 10, targetIncome: 20, targetMonths: 12, occupation: 'IT', hoursPerWeek: 40, focusSkill: 'React' },
      learningHours: 1 
    });
    expect(actions.some(a => a.key === 'income_growth')).toBe(true);
  });

  it('all ok -> returns inactivity/gentle suggestion', () => {
    const state = demoState();
    state.ledger = [{ month: TODAY, income: 20000000, expense: 10000000 }];
    state.snapshots = [{ month: TODAY, total: 100000000, emergency: 60000000, invested: 40000000, cashflow: 10000000 }];
    state.profile.monthlyExpense = 10000000;
    state.profile.emergencyTargetMonths = 3; 
    state.goals = []; 
    state.holdings = [{ id: 'h1', name: 'Cash', category: 'cash', value: 100000000, role: 'safe', volatility: 'low', riskGroup: 'safe', isMain: true }];
    const actions = nextBestActions(state);
    expect(actions[0].key).toBe('inactivity');
  });

  it('max 3 actions returned', () => {
    const state = demoState();
    state.ledger = [{ month: TODAY, income: 10000000, expense: 15000000 }]; 
    state.profile.monthlyExpense = 10000000;
    state.profile.emergencyTargetMonths = 3;
    state.snapshots = [{ month: TODAY, total: 20000000, emergency: 1000000, invested: 0, cashflow: -5000000 }]; 
    state.goals = [ 
      {
        id: 'g1', kind: 'home', title: 'Mua nhà', targetAmount: 2000000000, currentAmount: 1900000000,
        targetMonth: '2027-09', monthlyContribution: 1000000, priority: 1
      }
    ];
    const actions = nextBestActions(state, {
      incomeProfile: { currentIncome: 10, targetIncome: 20, targetMonths: 12, occupation: 'IT', hoursPerWeek: 40, focusSkill: 'React' },
      learningHours: 0 
    });
    
    expect(actions.length).toBe(3);
    expect(actions[0].key).toBe('negative_cashflow');
    expect(actions[1].key).toBe('emergency_low');
    expect(actions[2].key).toBe('goal_gap');
  });
});
