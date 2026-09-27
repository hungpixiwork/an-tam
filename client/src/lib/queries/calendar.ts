import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AutoScheduleResult, AutomationRule, AutomationRuleKey, CalendarEventInput, CalendarMonth, CalendarSyncResult, CalendarWeek,
} from '@shared/types/api';
import { api } from '../api';

/* ───────── 05 · Lịch AI ───────── */
const CALENDAR_KEYS = [['overview'], ['calendar'], ['integrations']];

const useRefreshCalendar = () => {
  const qc = useQueryClient();
  return () => CALENDAR_KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
};

/** Mỗi lần bấm duyệt / từ chối = 1 khóa mới; bấm trùng trong lúc chờ bị chặn bởi trạng thái pending của mutation. */
const idemKey = () => ({ 'Idempotency-Key': `web-${crypto.randomUUID()}` });

/** Dữ liệu 1 tuần (sự kiện + đề xuất AI + trạng thái đồng bộ). `week` = ngày bất kỳ trong tuần. */
export const useCalendarWeek = (week: string) =>
  useQuery({ queryKey: ['calendar', 'week', week], queryFn: () => api.get<CalendarWeek>(`/calendar?week=${week}`), placeholderData: keepPreviousData });

export const useCalendarMonth = (month: string, enabled: boolean) =>
  useQuery({ queryKey: ['calendar', 'month', month], queryFn: () => api.get<CalendarMonth>(`/calendar/month?month=${month}`), enabled, placeholderData: keepPreviousData });

/** Cập nhật sự kiện lịch (vd. đánh dấu xong). */
export function useUpdateCalendarEvent() {
  const refresh = useRefreshCalendar();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<CalendarEventInput> & { id: string; done?: boolean }) => api.patch<null>(`/calendar/events/${id}`, patch),
    onSuccess: refresh,
  });
}

export function useDeleteCalendarEvent() {
  const refresh = useRefreshCalendar();
  return useMutation({ mutationFn: (id: string) => api.del<null>(`/calendar/events/${id}`), onSuccess: refresh });
}

export function useAutoSchedule() {
  const refresh = useRefreshCalendar();
  return useMutation({ mutationFn: (week: string) => api.post<AutoScheduleResult>(`/calendar/auto-schedule?week=${week}`), onSuccess: refresh });
}

export function useSyncCalendar() {
  const refresh = useRefreshCalendar();
  return useMutation({ mutationFn: (week: string) => api.post<CalendarSyncResult>(`/calendar/sync?week=${week}`), onSuccess: refresh, onError: refresh });
}

export function useApproveProposal() {
  const refresh = useRefreshCalendar();
  return useMutation({ mutationFn: (id: string) => api.post<{ eventIds: string[]; pushed: number }>(`/calendar/proposals/${id}/approve`, undefined, idemKey()), onSettled: refresh });
}

export function useRejectProposal() {
  const refresh = useRefreshCalendar();
  return useMutation({ mutationFn: (id: string) => api.post<null>(`/calendar/proposals/${id}/reject`, undefined, idemKey()), onSettled: refresh });
}

export function useEditProposal() {
  const refresh = useRefreshCalendar();
  return useMutation({
    mutationFn: ({ id, events }: { id: string; events: { startsAt: string; endsAt: string }[] }) => api.patch<null>(`/calendar/proposals/${id}`, { events }),
    onSuccess: refresh,
  });
}

/* ───────── Quy tắc tự động ───────── */
export const useAutomationRules = () => useQuery({ queryKey: ['calendar', 'rules'], queryFn: () => api.get<AutomationRule[]>('/automation-rules') });

export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, enabled }: { key: AutomationRuleKey; enabled: boolean }) => api.put<AutomationRule>(`/automation-rules/${key}`, { enabled }),
    onMutate: ({ key, enabled }) => {
      qc.setQueryData<AutomationRule[]>(['calendar', 'rules'], (old) => old?.map((r) => (r.key === key ? { ...r, enabled } : r)));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['calendar', 'rules'] }),
  });
}
