import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EarnDashboard } from '@shared/types/api';
import type { Transaction } from '@shared/types/domain';
import { api } from '../api';
import { FINANCE_KEYS } from './keys';

/* ───────── 04 · Tăng thu nhập & kỹ năng ───────── */
export const qk_earn = { dashboard: ['earn-dashboard'] as const };

export const useEarnDashboard = () => useQuery({ queryKey: qk_earn.dashboard, queryFn: () => api.get<EarnDashboard>('/earn/dashboard') });

const useRefreshEarn = (withFinance = false) => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk_earn.dashboard });
    qc.invalidateQueries({ queryKey: ['overview'] });
    if (withFinance) FINANCE_KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
  };
};

/** "Thêm nguồn thu" = ghi một giao dịch thu vào sổ thu chi. */
export function useAddIncome() {
  const refresh = useRefreshEarn(true);
  return useMutation({
    mutationFn: (t: Pick<Transaction, 'amount' | 'category' | 'note' | 'occurredOn'>) => api.post<{ id: string }>('/transactions', { ...t, kind: 'income' }),
    onSuccess: refresh,
  });
}

/** Đánh dấu buổi học trong lịch là đã xong / chưa xong. */
export function useMarkLearning() {
  const refresh = useRefreshEarn();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => api.patch<null>(`/calendar/events/${id}`, { done }),
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}
