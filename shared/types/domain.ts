// Kiểu dữ liệu miền — dùng chung cho engine, worker và client.
// Tiền luôn là số nguyên VND. Tháng luôn là chuỗi 'YYYY-MM'.

export type AssetCategory = 'cash' | 'fund' | 'stock' | 'bond' | 'other';
export type Volatility = 'low' | 'mid' | 'high';
export type GoalKind = 'home' | 'education' | 'retirement' | 'emergency' | 'custom';
export type Salutation = 'anh' | 'chị' | 'bạn';
export type TransactionKind = 'income' | 'expense';
export type SpendingTag = 'essential' | 'useful' | 'joy' | 'growth' | 'regret';
export type TimeCategory = 'sleep' | 'work' | 'life' | 'learning' | 'side_income' | 'unallocated';

export interface FinancialProfile {
  monthlyIncome: number;
  monthlyExpense: number;
  emergencyTargetMonths: number;
  riskSelfScore: number;
}

export interface Holding {
  id: string;
  name: string;
  category: AssetCategory;
  value: number;
  role: string;
  volatility: Volatility;
  riskGroup: string;
  isMain: boolean;
}

export interface Goal {
  id: string;
  kind: GoalKind;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetMonth: string;
  monthlyContribution: number;
  priority: number;
}

export interface Snapshot {
  month: string;
  total: number;
  emergency: number;
  invested: number;
  cashflow: number;
}

/** Tổng thu / chi của 1 tháng trong sổ thu chi. */
export interface MonthTotal {
  month: string;
  income: number;
  expense: number;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  amount: number;
  category: string;
  note: string;
  /** 'YYYY-MM-DD' */
  occurredOn: string;
  /** Intentional spending tag (optional). */
  valueTag?: SpendingTag;
}

/** Toàn bộ dữ liệu engine cần để tính cho 1 người dùng. */
export interface UserState {
  /** Tháng hiện tại 'YYYY-MM' — truyền vào để engine thuần và test được. */
  today: string;
  salutation: Salutation;
  profile: FinancialProfile;
  holdings: Holding[];
  goals: Goal[];
  /** Sắp xếp tăng dần theo tháng. */
  snapshots: Snapshot[];
  /** Tổng sổ thu chi theo tháng (tối đa 12 tháng gần nhất), tăng dần. */
  ledger: MonthTotal[];
}

export interface SimulationParams {
  marketDropPct: number;        // -50..50
  inflationPct: number;         // 0..10
  incomePauseMonths: number;    // 0..12
  interestRateDeltaPct: number; // -3..3
  surpriseCost: number;         // VND, 0..500 triệu
  goalShiftMonths?: number;     // dời hạn mục tiêu mua nhà (âm = sớm hơn)
}

// ─── EARN layer ───

export interface IncomeProfile {
  currentIncome: number;
  targetIncome: number;
  targetMonths: number;
  occupation: string;
  hoursPerWeek: number;
  focusSkill: string;
}

export interface ValueActivity {
  id: string;
  title: string;
}

export interface ValueHourEntry {
  activityId: string;
  activityTitle: string;
  week: string;          // 'YYYY-Www'
  planned: number;       // hours
  actual: number;
}

export interface TimeAllocation {
  category: TimeCategory;
  hours: number;
}
