import { useQuery } from '@tanstack/react-query';
import type { NotificationItem, SearchResult } from '@shared/types/api';
import { api } from '../api';
import { qk } from './keys';

/* ───────── Topbar ───────── */
export const useNotifications = () =>
  useQuery({ queryKey: qk.notifications, queryFn: () => api.get<NotificationItem[]>('/notifications'), refetchInterval: 60_000 });

export const useSearch = (q: string) =>
  useQuery({ queryKey: qk.search(q), queryFn: () => api.get<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`), enabled: q.trim().length > 0 });
