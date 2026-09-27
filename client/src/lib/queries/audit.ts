// Nhật ký AI (trang 9) — GET /api/audit (phân trang con trỏ), /api/audit/verify, /api/health, liên kết ngân hàng SePay.

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuditPage, AuditStatus, AuditVerify, BankLink, HealthStatus } from '@shared/types/api';
import { api } from '../api';

export type AuditRange = 7 | 30 | 90;
export interface AuditFilters { agent: string; status: AuditStatus | ''; days: AuditRange }

export function useAuditLog(f: AuditFilters) {
  return useInfiniteQuery({
    queryKey: ['audit', f],
    initialPageParam: '',
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ limit: '6', from: new Date(Date.now() - f.days * 86_400_000).toISOString() });
      if (f.agent) q.set('agent', f.agent);
      if (f.status) q.set('status', f.status);
      if (pageParam) q.set('cursor', pageParam);
      return api.get<AuditPage>(`/audit?${q}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export const useAuditVerify = () => useQuery({ queryKey: ['audit', 'verify'], queryFn: () => api.get<AuditVerify>('/audit/verify') });

export const useHealth = () => useQuery({ queryKey: ['health'], queryFn: () => api.get<HealthStatus>('/health'), refetchInterval: 60_000 });

const refreshAfterBank = (qc: ReturnType<typeof useQueryClient>) => ['integrations', 'audit'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

export function useLinkBank() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { bankCode: string; accountNumber: string }) => api.post<BankLink>('/integrations/sepay/link', v), onSuccess: () => refreshAfterBank(qc) });
}

export function useVerifyBank() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.post<BankLink>('/integrations/sepay/verify'), onSuccess: () => refreshAfterBank(qc), onError: () => refreshAfterBank(qc) });
}

export function useUnlinkBank() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.del<null>('/integrations/sepay'), onSuccess: () => refreshAfterBank(qc) });
}

/** Tải tệp JSON toàn bộ dữ liệu (GET /api/me/export trả JSON thô, không bọc envelope). */
export async function downloadMyData(): Promise<void> {
  const res = await fetch('/api/me/export', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Không tải được dữ liệu, vui lòng thử lại');
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: `an-tam-du-lieu-cua-toi-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
