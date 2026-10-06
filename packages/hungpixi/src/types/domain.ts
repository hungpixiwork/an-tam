export type Sector =
  | 'technology'
  | 'finance'
  | 'real_estate'
  | 'manufacturing'
  | 'consumer'
  | 'healthcare'
  | 'education_public'
  | 'other';

export type AssetType = 'cash' | 'fund' | 'stock' | 'bond' | 'other';
export type Volatility = 'low' | 'medium' | 'high';
export type DebtKind = 'credit_card' | 'consumer' | 'car' | 'home' | 'business' | 'other';
export type GoalKind = 'emergency' | 'home' | 'car' | 'education' | 'retirement' | 'custom';
export type SpendingTag = 'essential' | 'useful' | 'joy' | 'growth' | 'regret' | 'untagged';
export type TransactionKind = 'income' | 'expense';

export interface Holding {
  id: string;
  name: string;
  type: AssetType;
  sector: Sector;
  value: number;
  isEmployerStock?: boolean;
  inPortfolio?: boolean;
  volatility?: Volatility;
  updatedAt: string;
}

export interface Debt {
  id: string;
  name: string;
  kind: DebtKind;
  remaining: number;
  annualRate: number;
  monthlyPayment: number;
}

export interface Goal {
  id: string;
  title: string;
  kind: GoalKind;
  targetAmount: number;
  currentAmount: number;
  targetMonth: string;
  priority: number;
  monthlyContribution: number;
}

export interface Transaction {
  id: string;
  occurredOn: string;
  kind: TransactionKind;
  amount: number;
  category: string;
  note?: string;
  valueTag?: SpendingTag;
}

export interface FinancialProfile {
  monthlyIncome: number;
  monthlyExpense: number;
  essentialExpense: number;
  targetEmergencyMonths: number;
  occupationIsco: string;
  sector: Sector;
  careerBeta?: number;
}

export interface PeaceScoreFactors {
  emergency: { score: number; max: number; detail: string };
  goals: { score: number; max: number; detail: string };
  riskFit: { score: number; max: number; detail: string };
  cashflow: { score: number; max: number; detail: string };
}

export interface PeaceScoreResult {
  total: number;
  level: 'stable' | 'watch' | 'action';
  factors: PeaceScoreFactors;
}
