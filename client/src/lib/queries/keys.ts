// Khóa cache TanStack Query dùng chung + helper làm mới dữ liệu tài chính.

import { useQueryClient } from '@tanstack/react-query';

export const qk = {
  me: ['me'] as const,
  overview: (range: number) => ['overview', range] as const,
  goals: ['goals'] as const,
  presets: ['presets'] as const,
  runs: ['runs'] as const,
  run: (id: string) => ['run', id] as const,
  habits: ['habits'] as const,
  portfolio: ['portfolio'] as const,
  plans: ['plans'] as const,
  ai: (range: string) => ['ai', range] as const,
  lessons: ['lessons'] as const,
  lesson: (slug: string) => ['lesson', slug] as const,
  settings: ['settings'] as const,
  profile: ['profile'] as const,
  holdings: ['holdings'] as const,
  transactions: (month: string) => ['transactions', month] as const,
  ledgerDashboard: ['ledger', 'dashboard'] as const,
  payoutAccount: ['payout-account'] as const,
  notifications: ['notifications'] as const,
  search: (q: string) => ['search', q] as const,
  integrations: ['integrations'] as const,
};

/** Dữ liệu tài chính thay đổi → làm mới các màn phụ thuộc. */
export const FINANCE_KEYS = [['overview'], ['goals'], ['portfolio'], ['plans'], ['ai'], ['notifications'], ['transactions'], ['ledger'], ['profile'], ['holdings'], ['preview']];

export const useInvalidateFinance = () => {
  const qc = useQueryClient();
  return () => FINANCE_KEYS.forEach((key) => qc.invalidateQueries({ queryKey: key }));
};
