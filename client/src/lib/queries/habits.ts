import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HabitScenario, HabitsProfile } from '@shared/engine/analysis';
import { api } from '../api';
import { qk } from './keys';

export interface HabitsData { scenarios: HabitScenario[]; answers: Record<string, string>; profile: HabitsProfile }

/* ───────── 05 · Thói quen ───────── */
export const useHabits = () => useQuery({ queryKey: qk.habits, queryFn: () => api.get<HabitsData>('/habits') });

export function useAnswerHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { scenarioId: string; choice: string }) => api.post<HabitsData>('/habits/answers', v),
    onSuccess: (data) => qc.setQueryData(qk.habits, data),
  });
}

export function useSetSelfScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (score: number) => api.put<HabitsData>('/habits/self-score', { score }),
    onSuccess: (data) => qc.setQueryData(qk.habits, data),
  });
}
