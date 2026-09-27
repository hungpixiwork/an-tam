// Trạng thái tích hợp bên ngoài (Google Calendar…) — GET /api/integrations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IntegrationInfo } from '@shared/types/api';
import { api } from '../api';
import { useAuth } from '@/app/auth';
import { qk } from './keys';

export type IntegrationState = 'connected' | 'disconnected' | 'error' | 'pending';

export interface IntegrationStatus {
  google: IntegrationState;
  /** ISO time lần đồng bộ Google gần nhất (nếu có). */
  googleSyncedAt?: string | null;
  /** Máy chủ đã cấu hình Google OAuth chưa. */
  googleConfigured?: boolean;
}

export const useIntegrations = (enabled = true) =>
  useQuery({ queryKey: qk.integrations, queryFn: () => api.get<{ items: IntegrationInfo[] }>('/integrations'), enabled, staleTime: 60_000 });

export function useIntegrationStatus(): IntegrationStatus {
  const { me } = useAuth();
  const { data, isPending } = useIntegrations(!!me);
  const g = data?.items.find((i) => i.provider === 'google');
  if (!g) return { google: isPending && me ? 'pending' : 'disconnected', googleSyncedAt: null, googleConfigured: false };
  return { google: g.status, googleSyncedAt: g.lastSyncedAt, googleConfigured: g.configured };
}

/** Chuyển trình duyệt sang trang đồng ý của Google (OAuth PKCE do máy chủ tạo). */
export const connectGoogleUrl = (returnTo = '/lich-ai') => `/api/integrations/google/connect?returnTo=${encodeURIComponent(returnTo)}`;

export function useDisconnectGoogle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.del<null>('/integrations/google'),
    onSuccess: () => ['integrations', 'calendar', 'overview'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}
