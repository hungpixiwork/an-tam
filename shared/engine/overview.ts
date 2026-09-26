import type { OverviewData, Kpi, SetupStatus } from '../types/api';
import type { Salutation, Snapshot, UserState } from '../types/domain';
import { formatMonth, formatPct } from '../format';
import { nearestMajorGoal } from './goals';
import { addMonths, monthsBetween } from './month';
import { greetingName, levelKey, templateNarrator, type Narrator } from './narrate';
import { emergencyAmount, freeCashflow, peaceScore, type PeaceLevel } from './peace';
import { allocation, investedValue, totalValue } from './portfolio';
import { DEFAULT_PARAMS, simulate } from './simulate';

/** Kỳ so sánh của các KPI tài sản. */
const COMPARE_MONTHS = 3;
/** Cú sốc dùng cho "Gợi ý hôm nay" — trùng preset "Năm khó khăn" ở phần thị trường. */
const TIP_SHOCK = { ...DEFAULT_PARAMS, marketDropPct: -20 };
const TIP_PRESET = 'nam-kho-khan';

const TIP_STATE: Record<PeaceLevel, string> = {
  stable: 'khá ổn',
  watch: 'ở mức chấp nhận được',
  action: 'chịu nhiều áp lực',
};

const kpi = (value: number, previous: number | null, compareLabel: string): Kpi => ({
  value,
  previous,
  deltaPct: previous && previous !== 0 ? (value - previous) / Math.abs(previous) : null,
  compareLabel,
});

const snapshotAt = (snapshots: Snapshot[], month: string) => snapshots.find((s) => s.month === month) ?? null;

export const setupStatus = (state: UserState): SetupStatus => ({
  profile: state.profile.monthlyIncome > 0 || state.profile.monthlyExpense > 0,
  holdings: state.holdings.length > 0,
  goals: state.goals.length > 0,
  transactions: state.ledger.length > 0,
});

export interface OverviewUser {
  fullName: string;
  salutation: Salutation;
}

export function buildOverview(
  state: UserState,
  user: OverviewUser,
  opts: { range?: number; openAlerts?: number; narrator?: Narrator } = {},
): OverviewData {
  const narrator = opts.narrator ?? templateNarrator;
  const range = opts.range ?? 12;
  const peace = peaceScore(state);

  const total = totalValue(state.holdings);
  const emergency = emergencyAmount(state);
  const invested = investedValue(state.holdings);
  const cashflow = freeCashflow(state);

  const past = snapshotAt(state.snapshots, addMonths(state.today, -COMPARE_MONTHS));
  const lastMonth = snapshotAt(state.snapshots, addMonths(state.today, -1));
  const compareLabel = `so với ${COMPARE_MONTHS} tháng trước`;
  const prevCashflow = lastMonth?.cashflow ?? null;

  // Chuỗi tài sản: các snapshot trong khoảng, điểm tháng hiện tại luôn là số liệu sống
  const start = addMonths(state.today, -(range - 1));
  const series = state.snapshots
    .filter((s) => s.month >= start && s.month < state.today)
    .map((s) => ({ month: s.month, total: s.total }));
  series.push({ month: state.today, total });

  const setup = setupStatus(state);
  
  // Gợi ý hôm nay: đa dạng hóa theo tình hình tài chính
  const major = nearestMajorGoal(state);
  let tip: OverviewData['tip'] = { text: narrator.narrate('tip.empty'), goalTitle: null, delayMonths: 0, presetSlug: TIP_PRESET };
  
  const latestLedger = state.ledger.at(-1);
  if (latestLedger && state.profile.monthlyExpense > 0 && latestLedger.expense > state.profile.monthlyExpense * 1.1) {
    const pct = formatPct((latestLedger.expense - state.profile.monthlyExpense) / state.profile.monthlyExpense);
    tip = { text: narrator.narrate('tip.spending', { s: user.salutation, pct }), goalTitle: null, delayMonths: 0, presetSlug: '' };
  } else if (major) {
    const monthsLeft = monthsBetween(state.today, major.targetMonth);
    if (monthsLeft > 0 && monthsLeft <= 6) {
      const progress = major.currentAmount / major.targetAmount;
      tip = { text: narrator.narrate('tip.goal_soon', { goal: major.title, months: monthsLeft, progress: formatPct(progress) }), goalTitle: major.title, delayMonths: 0, presetSlug: '' };
    } else {
      const impact = simulate(state, TIP_SHOCK).goals.find((g) => g.goalId === major.id);
      const delay = Math.max(0, impact?.delayMonths ?? 0);
      const vars = { state: TIP_STATE[peace.level], goal: major.title.toLowerCase(), months: delay };
      tip = {
        text: narrator.narrate(delay > 0 ? 'tip.delay' : 'tip.safe', vars),
        goalTitle: major.title,
        delayMonths: delay,
        presetSlug: TIP_PRESET,
      };
    }
  } else if (peace.level === 'stable' && setup.profile && setup.holdings) {
    tip = { text: narrator.narrate('tip.learn', { s: user.salutation }), goalTitle: null, delayMonths: 0, presetSlug: '' };
  }

  // Chưa có thu chi lẫn tài sản: điểm chưa có ý nghĩa, lời chào mời bắt đầu nhập
  const empty = !setup.profile && !setup.holdings;

  return {
    greeting: {
      title: greetingName(user.fullName, user.salutation),
      headline: narrator.narrate(empty ? 'greeting.empty' : levelKey('greeting', peace.level), { s: user.salutation }),
      sub: narrator.narrate(empty ? 'greeting.sub.empty' : levelKey('greeting.sub', peace.level), { s: user.salutation }),
    },
    peace: {
      score: peace.score,
      level: peace.level,
      label: empty ? 'Chưa đủ dữ liệu' : peace.label,
      description: narrator.narrate(empty ? 'peace.empty' : levelKey('peace', peace.level)),
      factors: peace.factors,
    },
    kpis: {
      netWorth: kpi(total, past?.total ?? null, compareLabel),
      emergency: kpi(emergency, past?.emergency ?? null, compareLabel),
      invested: kpi(invested, past?.invested ?? null, compareLabel),
      cashflow: {
        ...kpi(cashflow, prevCashflow, 'so với tháng trước'),
        trend: prevCashflow === null || prevCashflow === cashflow ? 'same' : cashflow > prevCashflow ? 'better' : 'worse',
      },
    },
    netWorthSeries: series.map((s) => ({ ...s, label: formatMonth(s.month).replace(/\/\d+$/, '') })),
    allocation: { total, slices: allocation(state.holdings) },
    tip,
    openAlerts: opts.openAlerts ?? 0,
    setup,
  };
}
