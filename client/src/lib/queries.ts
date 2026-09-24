// Hook dữ liệu cho mọi màn (TanStack Query). Mỗi màn chỉ cần import hook của mình.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GoalsSummary, HabitScenario, HabitsProfile, PortfolioAnalysis, SimulationReport } from '@shared/engine/analysis';
import type { PlanProposal } from '@shared/engine/plan';
import type { NotificationItem, OverviewData, SearchResult } from '@shared/types/api';
import type { Goal, SimulationParams } from '@shared/types/domain';
import { api } from './api';

/* ───────── Kiểu dữ liệu riêng của client ───────── */

export interface Preset { id: string; slug: string; name: string; icon: string; params: SimulationParams }
export interface RunSummary { id: string; label: string; createdAt: string }
export type SimulationRun = SimulationReport & { createdAt: string };

export interface HabitsData { scenarios: HabitScenario[]; answers: Record<string, string>; profile: HabitsProfile }

export interface PlanTask { id: string; title: string; tag: string; done: boolean }
export interface PlansData { proposal: PlanProposal; applied: { id: string; appliedAt: string; tasks: PlanTask[] } | null }

export type AiEventType = 'alert' | 'simulation' | 'reminder' | 'analysis';
export interface AiEvent { id: string; type: AiEventType; title: string; body: string; createdAt: string }
export interface AiAlert { id: string; ruleKey: string; severity: 'danger' | 'warning' | 'action'; title: string; body: string; status: string; createdAt: string }
export interface AiData { events: AiEvent[]; alerts: AiAlert[] }

export interface Lesson {
  id: string; slug: string; kind: 'lesson' | 'story' | 'history'; title: string; excerpt: string;
  category: string; icon: string; readTime: string; isFeatured: boolean; bodyMd?: string;
}

export interface Settings {
  dataEncrypted: boolean; advancedAnalysis: boolean; notifyGoalDelay: boolean;
  notifyPortfolioRisk: boolean; notifyWeeklyEmail: boolean; notifyCommunityLessons: boolean;
}

export type GoalInput = Omit<Goal, 'id'>;

/* ───────── Khóa cache ───────── */

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
  notifications: ['notifications'] as const,
  search: (q: string) => ['search', q] as const,
};

/** Dữ liệu tài chính thay đổi → làm mới các màn phụ thuộc. */
const FINANCE_KEYS = [['overview'], ['goals'], ['portfolio'], ['plans'], ['ai'], ['notifications']];
const useInvalidateFinance = () => {
  const qc = useQueryClient();
  return () => FINANCE_KEYS.forEach((key) => qc.invalidateQueries({ queryKey: key }));
};

/* ───────── 01 · Tổng quan ───────── */
export const useOverview = (range = 12) => useQuery({ queryKey: qk.overview(range), queryFn: () => api.get<OverviewData>(`/overview?range=${range}`) });

/* ───────── 02 · Mục tiêu ───────── */
export const useGoals = () => useQuery({ queryKey: qk.goals, queryFn: () => api.get<GoalsSummary>('/goals/summary') });

export function useSaveGoal() {
  const refresh = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, ...goal }: Partial<GoalInput> & { id?: string }) =>
      id ? api.patch<null>(`/goals/${id}`, goal) : api.post<{ id: string }>('/goals', goal),
    onSuccess: refresh,
  });
}

export function useDeleteGoal() {
  const refresh = useInvalidateFinance();
  return useMutation({ mutationFn: (id: string) => api.del<null>(`/goals/${id}`), onSuccess: refresh });
}

/* ───────── 03 / 04 · Mô phỏng ───────── */
export const usePresets = () => useQuery({ queryKey: qk.presets, queryFn: () => api.get<Preset[]>('/simulations/presets'), staleTime: Infinity });
export const useRuns = () => useQuery({ queryKey: qk.runs, queryFn: () => api.get<RunSummary[]>('/simulations/runs') });
export const useRun = (id: string) => useQuery({ queryKey: qk.run(id), queryFn: () => api.get<SimulationRun>(`/simulations/runs/${id}`), staleTime: Infinity });

/** Xem trước tác động (không lưu). Gọi lại mỗi khi params đổi — nên debounce ở màn. */
export const useSimulationPreview = (params: SimulationParams) =>
  useQuery({
    queryKey: ['preview', params],
    queryFn: () => api.post<SimulationReport>('/simulations/preview', params as unknown as Record<string, unknown>),
    placeholderData: (prev) => prev,
  });

export function useRunSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: SimulationParams) => api.post<{ runId: string }>('/simulations/run', params as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.runs });
      qc.invalidateQueries({ queryKey: ['ai'] });
    },
  });
}

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

/* ───────── 06 · Danh mục ───────── */
export const usePortfolio = () => useQuery({ queryKey: qk.portfolio, queryFn: () => api.get<PortfolioAnalysis>('/portfolio') });

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

/* ───────── 09 · Cộng đồng ───────── */
export const useLessons = () => useQuery({ queryKey: qk.lessons, queryFn: () => api.get<Lesson[]>('/lessons'), staleTime: 5 * 60_000 });
export const useLesson = (slug: string | null) =>
  useQuery({ queryKey: qk.lesson(slug ?? ''), queryFn: () => api.get<Lesson>(`/lessons/${slug}`), enabled: !!slug });

/* ───────── 10 · Cài đặt ───────── */
export const useSettings = () => useQuery({ queryKey: qk.settings, queryFn: () => api.get<Settings>('/settings') });

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Settings>) => api.put<Settings>('/settings', patch),
    onMutate: (patch) => qc.setQueryData<Settings>(qk.settings, (old) => (old ? { ...old, ...patch } : old)),
    onSuccess: (data) => qc.setQueryData(qk.settings, data),
    onError: () => qc.invalidateQueries({ queryKey: qk.settings }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.del<null>('/me'), onSuccess: () => qc.clear() });
}

/* ───────── Topbar ───────── */
export const useNotifications = () =>
  useQuery({ queryKey: qk.notifications, queryFn: () => api.get<NotificationItem[]>('/notifications'), refetchInterval: 60_000 });

export const useSearch = (q: string) =>
  useQuery({ queryKey: qk.search(q), queryFn: () => api.get<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`), enabled: q.trim().length > 0 });
