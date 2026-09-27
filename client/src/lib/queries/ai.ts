import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WeeklyDigest } from '@shared/engine/digest';
import { api } from '../api';
import { qk } from './keys';

export type AiEventType = 'alert' | 'simulation' | 'reminder' | 'analysis';
export interface AiEvent { id: string; type: AiEventType; title: string; body: string; createdAt: string }
export interface AiAlert { id: string; ruleKey: string; severity: 'danger' | 'warning' | 'action'; title: string; body: string; status: string; createdAt: string }
export interface AiData { events: AiEvent[]; alerts: AiAlert[] }

/* ───────── 08 · AI theo dõi ───────── */
export const useAi = (range: 'week' | 'month' = 'week') => useQuery({ queryKey: qk.ai(range), queryFn: () => api.get<AiData>(`/ai?range=${range}`) });

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<null>(`/ai/alerts/${id}`, { status: 'resolved' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai'] });
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

export const useWeeklyDigest = () =>
  useQuery({ queryKey: ['digest'], queryFn: () => api.get<WeeklyDigest>('/ai/digest') });
