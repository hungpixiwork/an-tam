import type { Goal, Holding, PeaceScoreResult, SpendingTag, Transaction } from './domain';

export interface OverviewResponse {
  ready: boolean;
  greeting: { title: string; headline: string; sub: string };
  peace: { score: number; level: 'stable' | 'watch' | 'action'; delta: number | null };
  safeMonths: { months: number; targetMonths: number; ready: boolean };
  cashflow6m: {
    net: number;
    income: number;
    expense: number;
    source: 'none' | 'estimate' | 'ledger';
    months: { month: string; net: number | null; income: number; expense: number }[];
  };
  savingsRateVsPeers: { rate: number | null; peerRate: number | null };
  todaySuggestions: Array<{
    id: string;
    group: 'safety' | 'saving' | 'growth';
    title: string;
    body: string;
    urgent?: boolean;
    action?: Record<string, unknown>;
  }>;
  netWorthBreakdown: {
    total: number;
    cash: number;
    invest: number;
    debt: number;
    employerStockPct: number;
  };
}

export interface LedgerDashboardResponse {
  month: string;
  totals: { income: number; expense: number; net: number };
  budget: { limit: number; spent: number; remaining: number } | null;
  recent: Transaction[];
  byCategory: { category: string; amount: number; pct: number }[];
}

export interface ProposeActionRequest {
  type:
    | 'calendar.create_events'
    | 'budget.set'
    | 'goal.update_progress'
    | 'reminder.create'
    | 'sheets.update_budget'
    | 'notion.weekly_report'
    | 'gmail.send';
  payload: Record<string, unknown>;
  note?: string;
}

export interface ProposeActionResponse {
  id: string;
  status: 'pending';
  expiresAt: string;
}
