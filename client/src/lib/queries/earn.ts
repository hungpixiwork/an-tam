import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

/* ───────── EARN · Tăng thu nhập ───────── */
export interface EarnProfile { currentIncome: number; targetIncome: number; targetMonths: number; occupation: string; hoursPerWeek: number; focusSkill: string }
export interface EarnActivity { id: string; title: string }
export interface EarnHourEntry { activityId: string; activityTitle: string; week: string; planned: number; actual: number }
export interface EarnTimeAlloc { category: string; hours: number }
export interface EarnSummary {
  plan: { currentIncome: number; targetIncome: number; gap: number; targetMonths: number; hoursPerWeek: number; totalAvailableHours: number; focusSkill: string; recommendations: string[] };
  connection: { additionalMonthlyIncome: number; currentSavingsRate: number; potentialMonthlySaving: number; goalAcceleration: { goalTitle: string; monthsSaved: number } | null; disclaimer: string };
  hours: { totalPlanned: number; totalActual: number; activities: { title: string; planned: number; actual: number }[]; insight: string };
  time: { allocations: EarnTimeAlloc[]; unallocated: number; insight: string | null };
}

export const qk_earn = {
  profile: ['earn-profile'] as const,
  activities: ['earn-activities'] as const,
  hours: (week: string) => ['earn-hours', week] as const,
  time: ['earn-time'] as const,
  summary: ['earn-summary'] as const,
};

export const useEarnProfile = () => useQuery({ queryKey: qk_earn.profile, queryFn: () => api.get<EarnProfile>('/earn') });
export function useSaveEarnProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: EarnProfile) => api.put<EarnProfile>('/earn', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['earn-profile'] }); qc.invalidateQueries({ queryKey: ['earn-summary'] }); },
  });
}
export const useEarnActivities = () => useQuery({ queryKey: qk_earn.activities, queryFn: () => api.get<EarnActivity[]>('/earn/activities') });
export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => api.post<{ id: string }>('/earn/activities', { title }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['earn-activities'] }); qc.invalidateQueries({ queryKey: ['earn-summary'] }); },
  });
}
export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<null>(`/earn/activities/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['earn-activities'] }); qc.invalidateQueries({ queryKey: ['earn-hours'] }); qc.invalidateQueries({ queryKey: ['earn-summary'] }); },
  });
}
export const useEarnHours = (week: string) => useQuery({ queryKey: qk_earn.hours(week), queryFn: () => api.get<EarnHourEntry[]>(`/earn/hours?week=${week}`) });
export function useSaveEarnHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { week: string; entries: { activityId: string; planned: number; actual: number }[] }) => api.put<null>('/earn/hours', v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['earn-hours'] }); qc.invalidateQueries({ queryKey: ['earn-summary'] }); },
  });
}
export const useEarnTime = () => useQuery({ queryKey: qk_earn.time, queryFn: () => api.get<EarnTimeAlloc[]>('/earn/time') });
export function useSaveEarnTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (allocs: EarnTimeAlloc[]) => api.put<null>('/earn/time', { allocations: allocs }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['earn-time'] }); qc.invalidateQueries({ queryKey: ['earn-summary'] }); },
  });
}
export const useEarnSummary = () => useQuery({ queryKey: qk_earn.summary, queryFn: () => api.get<EarnSummary>('/earn/summary') });
