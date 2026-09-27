import type { CalendarEvent, LifeChoice, OverviewData, Kpi, SetupStatus } from '../types/api';
import type { FinancialProfile, IncomeProfile, Salutation, Snapshot, TimeAllocation, Transaction, UserState } from '../types/domain';
import { peerBenchmark } from '../data/peer-benchmarks';
import { lifeChoiceReadiness } from './lifeChoice';
import { resourceRings } from './resources';
import { todaySuggestions, type SuggestionGroup } from './suggestions';
import { formatMonth, formatPct } from '../format';
import { nearestMajorGoal } from './goals';
import { addMonths, monthsBetween } from './month';
import { greetingName, levelKey, templateNarrator, type Narrator } from './narrate';
import { emergencyAmount, emergencyMonths, freeCashflow, peaceScore, peaceScoreAsOf, type PeaceLevel } from './peace';
import { allocation, investedValue, totalValue } from './portfolio';
import { DEFAULT_PARAMS, simulate } from './simulate';
import { nextBestActions } from './nba';

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

/** Dữ liệu ngoài UserState mà màn Tổng quan cần (đều tùy chọn — thiếu thì khối tương ứng hiện trạng thái rỗng). */
export interface OverviewExtras {
  /** Số nền người dùng tự nhập — để ước tính điểm tháng trước. */
  baseline?: FinancialProfile;
  birthYear?: number | null;
  /** Giao dịch tháng này + tháng trước. */
  recent?: Transaction[];
  income?: IncomeProfile | null;
  dismissed?: SuggestionGroup[];
  allocations?: TimeAllocation[];
  /** Tổng giờ thực tế từng tuần gần nhất (hoạt động giá trị). */
  weeklyActualHours?: number[];
  todayDate?: string;
  events?: CalendarEvent[];
  lifeChoice?: LifeChoice | null;
}

/** Kỳ so sánh tài sản ròng ở khối "Tài sản hiện tại". */
export const NET_WORTH_COMPARE_MONTHS = 3;

/**
 * Tách tài sản ròng: tiền mặt / đầu tư (quỹ, cổ phiếu, trái phiếu) / tài sản khác / nợ.
 * So sánh 3 tháng trước: dùng snapshot tháng đó nếu có; nếu không, lùi lại bằng phần để dành
 * thực tế trong sổ thu chi của 3 tháng gần nhất (tài sản ròng trước ≈ hiện tại − số đã để dành).
 */
export function netWorthBreakdown(state: UserState): OverviewData['netWorthBreakdown'] {
  const sum = (pred: (c: string) => boolean) => state.holdings.filter((h) => pred(h.category)).reduce((s, h) => s + h.value, 0);
  const cash = sum((c) => c === 'cash');
  const invested = sum((c) => c === 'fund' || c === 'stock' || c === 'bond');
  const other = sum((c) => c === 'other');
  const debt = (state.liabilities ?? []).reduce((s, l) => s + l.balance, 0);
  const net = cash + invested + other - debt;

  let previous: number | null = null;
  const snap = snapshotAt(state.snapshots, addMonths(state.today, -NET_WORTH_COMPARE_MONTHS));
  if (snap && snap.total > 0) previous = snap.total - (snap.debt ?? 0);
  else {
    const from = addMonths(state.today, -(NET_WORTH_COMPARE_MONTHS - 1));
    const months = state.ledger.filter((m) => m.month >= from && m.month <= state.today);
    if (months.length) previous = net - months.reduce((s, m) => s + m.income - m.expense, 0);
  }
  const deltaPct = previous !== null && previous > 0 && net > 0 ? (net - previous) / previous : null;
  return { net, cash, invested, other, debt, deltaPct, compareMonths: NET_WORTH_COMPARE_MONTHS };
}

/** Dòng tiền tháng này + chuỗi 6 tháng (tháng không ghi sổ = null). */
export function monthCashflow(state: UserState): OverviewData['cashflow6m'] {
  const current = state.ledger.find((m) => m.month === state.today);
  const months = Array.from({ length: 6 }, (_, i) => {
    const month = addMonths(state.today, i - 5);
    const m = state.ledger.find((x) => x.month === month);
    return { month, net: m && (m.income > 0 || m.expense > 0) ? m.income - m.expense : null };
  });
  if (current && (current.income > 0 || current.expense > 0)) {
    return { month: state.today, income: current.income, expense: current.expense, net: current.income - current.expense, source: 'ledger', months };
  }
  const { monthlyIncome: income, monthlyExpense: expense } = state.profile;
  if (income > 0 || expense > 0) return { month: state.today, income, expense, net: income - expense, source: 'estimate', months };
  return { month: state.today, income: 0, expense: 0, net: 0, source: 'none', months };
}

export function buildOverview(
  state: UserState,
  user: OverviewUser,
  opts: { range?: number; openAlerts?: number; narrator?: Narrator; extras?: OverviewExtras } = {},
): OverviewData {
  const extras = opts.extras ?? {};
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

  const ready = setup.profile || setup.holdings;
  const pastScore = extras.baseline ? peaceScoreAsOf(state, extras.baseline, 1) : null;
  const cashflow6m = monthCashflow(state);
  const rate = cashflow6m.income > 0 ? cashflow6m.net / cashflow6m.income : null;
  const age = extras.birthYear ? Number(state.today.slice(0, 4)) - extras.birthYear : null;
  const peer = peerBenchmark(age);
  const choice = extras.lifeChoice ?? null;

  return {
    ready,
    peaceDelta: ready && pastScore !== null ? peace.score - pastScore : null,
    safeMonths: {
      months: Math.round(emergencyMonths(state) * 10) / 10,
      targetMonths: state.profile.emergencyTargetMonths || 6,
      amount: emergency,
      ready: state.profile.monthlyExpense > 0,
    },
    cashflow6m,
    savingsRateVsPeers: { rate, peerRate: peer?.savingsRate ?? null, ageGroup: peer?.label ?? null },
    todaySuggestions: todaySuggestions(state, { recent: extras.recent, income: extras.income, dismissed: extras.dismissed }),
    todayDate: extras.todayDate ?? `${state.today}-01`,
    todayEvents: extras.events ?? [],
    netWorthBreakdown: netWorthBreakdown(state),
    resourceRings: resourceRings({
      peaceScore: ready ? peace.score : null,
      allocations: extras.allocations ?? [],
      weeklyActualHours: extras.weeklyActualHours ?? [],
      targetHoursPerWeek: extras.income?.hoursPerWeek ?? 0,
    }),
    pinnedLifeChoice: choice ? { ...choice, readiness: lifeChoiceReadiness(state) } : null,
    nba: nextBestActions(state),
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
