import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Me } from '@shared/types/api';
import { api } from '../api';
import { qk } from './keys';

export interface Settings {
  dataEncrypted: boolean; advancedAnalysis: boolean; notifyGoalDelay: boolean;
  notifyPortfolioRisk: boolean; notifyWeeklyEmail: boolean; notifyCommunityLessons: boolean;
  locale: 'vi' | 'en' | 'zh';
  currency: 'VND' | 'CNY' | 'USD';
}

/* ───────── 10 · Cài đặt ───────── */
export const useSettings = (enabled = true) => useQuery({ queryKey: qk.settings, queryFn: () => api.get<Settings>('/settings'), enabled });

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
