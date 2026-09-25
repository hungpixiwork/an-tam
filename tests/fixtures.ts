import type { UserState } from '../shared/types/domain';
import { DEMO_GOALS, DEMO_HOLDINGS, DEMO_PROFILE, demoGoalMonth, demoSnapshots } from './demo-data';

export const TODAY = '2026-09';

export function demoState(today = TODAY): UserState {
  return {
    today,
    profile: { ...DEMO_PROFILE },
    holdings: DEMO_HOLDINGS.map((h, i) => ({ ...h, id: `h${i + 1}` })),
    goals: DEMO_GOALS.map(({ targetYearOffset: _y, targetCalendarMonth: _m, ...g }, i) => ({
      ...g,
      id: `g${i + 1}`,
      targetMonth: demoGoalMonth(today, DEMO_GOALS[i]),
    })),
    snapshots: demoSnapshots(today),
    ledger: [],
  };
}
