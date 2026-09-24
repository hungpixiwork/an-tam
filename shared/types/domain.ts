// Kiểu dữ liệu miền — dùng chung cho engine, worker và client.
// Tiền luôn là số nguyên VND. Tháng luôn là chuỗi 'YYYY-MM'.

export type AssetCategory = 'cash' | 'fund' | 'stock' | 'bond' | 'other';
export type Volatility = 'low' | 'mid' | 'high';
export type GoalKind = 'home' | 'education' | 'retirement' | 'emergency' | 'custom';
export type Salutation = 'anh' | 'chị' | 'bạn';

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

/** Toàn bộ dữ liệu engine cần để tính cho 1 người dùng. */
export interface UserState {
  /** Tháng hiện tại 'YYYY-MM' — truyền vào để engine thuần và test được. */
  today: string;
  profile: FinancialProfile;
  holdings: Holding[];
  goals: Goal[];
  /** Sắp xếp tăng dần theo tháng. */
  snapshots: Snapshot[];
}

export interface SimulationParams {
  marketDropPct: number;        // -50..50
  inflationPct: number;         // 0..10
  incomePauseMonths: number;    // 0..12
  interestRateDeltaPct: number; // -3..3
  surpriseCost: number;         // VND, 0..500 triệu
  goalShiftMonths?: number;     // dời hạn mục tiêu mua nhà (âm = sớm hơn)
}
