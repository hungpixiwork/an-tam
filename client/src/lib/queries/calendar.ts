import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CalendarEventInput } from '@shared/types/api';
import { api } from '../api';

/* ───────── 05 · Lịch AI ───────── */
const CALENDAR_KEYS = [['overview'], ['calendar']];

const useRefreshCalendar = () => {
  const qc = useQueryClient();
  return () => CALENDAR_KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
};

/** Cập nhật sự kiện lịch (vd. đánh dấu xong). */
export function useUpdateCalendarEvent() {
  const refresh = useRefreshCalendar();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<CalendarEventInput> & { id: string; done?: boolean }) => api.patch<null>(`/calendar/events/${id}`, patch),
    onSuccess: refresh,
  });
}
