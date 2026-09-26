// Hook dữ liệu cho mọi màn (TanStack Query). Mỗi màn chỉ cần import hook của mình.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GoalsSummary, HabitScenario, HabitsProfile, PortfolioAnalysis, SimulationReport } from '@shared/engine/analysis';
import type { PlanProposal } from '@shared/engine/plan';
import type { LedgerData, Me, NotificationItem, OnboardingResult, OverviewData, ProfileData, SearchResult } from '@shared/types/api';
import type { AssetCategory, Goal, Holding, SimulationParams, Transaction, Volatility } from '@shared/types/domain';
import { api } from './api';
import type { WeeklyDigest } from '@shared/engine/digest';

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
  recommendedFor?: string;
}

export interface Settings {
  dataEncrypted: boolean; advancedAnalysis: boolean; notifyGoalDelay: boolean;
  notifyPortfolioRisk: boolean; notifyWeeklyEmail: boolean; notifyCommunityLessons: boolean;
  locale: 'vi' | 'en' | 'zh';
  currency: 'VND' | 'CNY' | 'USD';
}

export type GoalInput = Omit<Goal, 'id'>;
export interface HoldingInput { name: string; category: AssetCategory; value: number; volatility?: Volatility }
export type TransactionInput = Omit<Transaction, 'id'>;
export interface ProfileInput { monthlyIncome: number; monthlyExpense: number; emergencyTargetMonths: number }
export interface OnboardingInput { profile?: ProfileInput; holdings: HoldingInput[]; goals: GoalInput[]; lifeStage?: string; }

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
  profile: ['profile'] as const,
  holdings: ['holdings'] as const,
  transactions: (month: string) => ['transactions', month] as const,
  notifications: ['notifications'] as const,
  search: (q: string) => ['search', q] as const,
};

/** Dữ liệu tài chính thay đổi → làm mới các màn phụ thuộc. */
const FINANCE_KEYS = [['overview'], ['goals'], ['portfolio'], ['plans'], ['ai'], ['notifications'], ['transactions'], ['profile'], ['holdings'], ['preview']];
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
      id ? api.patch<null>(`/goals/${id}`, goal) : api.post<null>('/goals', goal),
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
    queryFn: () => api.post<SimulationReport>('/simulations/preview', params),
    placeholderData: (prev) => prev,
  });

export function useRunSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: SimulationParams) => api.post<{ runId: string }>('/simulations/run', params),
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
export const useHoldings = () => useQuery({ queryKey: qk.holdings, queryFn: () => api.get<Holding[]>('/holdings') });

export function useSaveHolding() {
  const refresh = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, ...h }: Partial<HoldingInput> & { id?: string }) => (id ? api.patch<null>(`/holdings/${id}`, h) : api.post<null>('/holdings', h)),
    onSuccess: refresh,
  });
}

export function useDeleteHolding() {
  const refresh = useInvalidateFinance();
  return useMutation({ mutationFn: (id: string) => api.del<null>(`/holdings/${id}`), onSuccess: refresh });
}

/* ───────── Sổ thu chi ───────── */
export const useTransactions = (month: string) =>
  useQuery({ queryKey: qk.transactions(month), queryFn: () => api.get<LedgerData>(`/transactions?month=${month}`), placeholderData: (prev) => prev });

export function useSaveTransaction() {
  const refresh = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, ...t }: TransactionInput & { id?: string }) => (id ? api.patch<null>(`/transactions/${id}`, t) : api.post<{ id: string }>('/transactions', t)),
    onSuccess: refresh,
  });
}

export function useDeleteTransaction() {
  const refresh = useInvalidateFinance();
  return useMutation({ mutationFn: (id: string) => api.del<null>(`/transactions/${id}`), onSuccess: refresh });
}

/* ───────── Hồ sơ tài chính & bắt đầu ───────── */
export const useProfile = () => useQuery({ queryKey: qk.profile, queryFn: () => api.get<ProfileData>('/profile') });

export function useSaveProfile() {
  const refresh = useInvalidateFinance();
  return useMutation({ mutationFn: (p: Partial<ProfileInput>) => api.put<ProfileData>('/profile', p), onSuccess: refresh });
}

/** Gửi dữ liệu màn "Bắt đầu". Chưa cập nhật `me` ngay để màn còn hiện bước kết quả — gọi `finish` khi người dùng bấm tiếp. */
export function useOnboarding() {
  const qc = useQueryClient();
  return {
    submit: useMutation({ mutationFn: (input: OnboardingInput) => api.post<OnboardingResult>('/onboarding', input) }),
    finish: (me: Me) => {
      FINANCE_KEYS.forEach((key) => qc.removeQueries({ queryKey: key }));
      qc.setQueryData(qk.me, me);
    },
  };
}

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
export function useLessons(peaceLevel?: string) {
  return useQuery({
    queryKey: ['lessons', peaceLevel],
    queryFn: () => api.get<Lesson[]>(`/lessons${peaceLevel ? `?peace_level=${peaceLevel}` : ''}`),
    staleTime: 5 * 60_000
  });
}
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

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { fullName?: string; salutation?: Me['salutation'] }) => api.patch<Me>('/me', v),
    onSuccess: (me) => {
      qc.setQueryData(qk.me, me);
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

export const useChangePassword = () =>
  useMutation({ mutationFn: (v: { currentPassword: string; newPassword: string }) => api.post<null>('/me/password', v) });

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.del<null>('/me'), onSuccess: () => qc.clear() });
}

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

/* ───────── Topbar ───────── */
export const useNotifications = () =>
  useQuery({ queryKey: qk.notifications, queryFn: () => api.get<NotificationItem[]>('/notifications'), refetchInterval: 60_000 });

export const useSearch = (q: string) =>
  useQuery({ queryKey: qk.search(q), queryFn: () => api.get<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`), enabled: q.trim().length > 0 });

export const useWeeklyDigest = () =>
  useQuery({ queryKey: ['digest'], queryFn: () => api.get<WeeklyDigest>('/ai/digest') });
