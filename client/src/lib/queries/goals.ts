import { useMutation, useQuery } from '@tanstack/react-query';
import type { GoalsSummary } from '@shared/engine/analysis';
import type { Goal } from '@shared/types/domain';
import { api } from '../api';
import { qk, useInvalidateFinance } from './keys';

export type GoalInput = Omit<Goal, 'id'>;

/* ───────── 02 · Mục tiêu ───────── */
export const useGoals = () => useQuery({ queryKey: qk.goals, queryFn: () => api.get<GoalsSummary>('/goals/summary') });

export function useSaveGoal() {
  const refresh = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, ...goal }: Partial<GoalInput> & { id?: string }) =>
      id ? api.patch<null>(`/goals/${id}`, goal) : api.post<null>('/goals', goal),
    onSuccess: refresh,
  });
}

export function useDeleteGoal() {
  const refresh = useInvalidateFinance();
  return useMutation({ mutationFn: (id: string) => api.del<null>(`/goals/${id}`), onSuccess: refresh });
}
