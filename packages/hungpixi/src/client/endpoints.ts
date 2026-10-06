export const API_ENDPOINTS = {
  OVERVIEW: '/api/overview',
  SIGNALS: '/api/signals',
  LEDGER_DASHBOARD: '/api/ledger/dashboard',
  GOALS_SUMMARY: '/api/goals/summary',
  CALENDAR_WEEK: '/api/calendar',
  MARKET: '/api/market',
  MARKET_HISTORY: (symbol: string) => `/api/market/history/${symbol}`,
  LIFE_CHOICES_EVALUATE: '/api/life-choices/evaluate',
  SIMULATION_PREVIEW: '/api/simulations/preview',
  PORTFOLIO_WHAT_IF: '/api/portfolio/what-if',
  AGENT_ACTIONS: '/api/agent/actions',
  DESK_RUN: (symbol: string) => `/api/desk/${symbol}/run`,
} as const;
