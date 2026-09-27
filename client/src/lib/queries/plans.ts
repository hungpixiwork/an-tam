import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlanProposal } from '@shared/engine/plan';
import { api } from '../api';
import { qk } from './keys';

export interface PlanTask { id: string; title: string; tag: string; done: boolean }
export interface PlansData { proposal: PlanProposal; applied: { id: string; appliedAt: string; tasks: PlanTask[] } | null }

/* ───────── 07 · Kế hoạch an toàn ───────── */
export const usePlans = () => useQuery({ queryKey: qk.plans, queryFn: () => api.get<PlansData>('/plans') });

export function useApplyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<PlansData['applied']>('/plans/apply'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.plans });
      qc.invalidateQueries({ queryKey: ['ai'] });
    },
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => api.patch<null>(`/plans/tasks/${id}`, { done }),
    onMutate: async ({ id, done }) => {
      qc.setQueryData<PlansData>(qk.plans, (old) =>
        old?.applied ? { ...old, applied: { ...old.applied, tasks: old.applied.tasks.map((t) => (t.id === id ? { ...t, done } : t)) } } : old,
      );
    },
    onError: () => qc.invalidateQueries({ queryKey: qk.plans }),
  });
}
