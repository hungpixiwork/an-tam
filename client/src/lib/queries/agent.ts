import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AgentActionView, AgentInfo, AgentRunView, ApproveBatchResult } from '@shared/types/api';
import { api } from '../api';
import { FINANCE_KEYS } from './keys';
import type { DecisionRequest } from './simulation';

/* ───────── 08 · AI Workspace ───────── */

const idemKey = () => ({ 'Idempotency-Key': `web-${crypto.randomUUID()}` });
const AGENT_KEYS = [['agents'], ['agent-run'], ['agent-actions'], ['calendar'], ['budgets'], ['life-choices'], ['life-choice'], ['decision-preview'], ['decision-next'], ...FINANCE_KEYS];

const useRefreshAgents = () => {
  const qc = useQueryClient();
  return () => AGENT_KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
};

const busy = (r: AgentRunView | null | undefined) => !!r && (r.status === 'running' || r.actions.some((a) => a.status === 'approved' || a.status === 'executing'));

export const useAgents = () => useQuery({ queryKey: ['agents'], queryFn: () => api.get<AgentInfo[]>('/agents') });

/** Lượt chạy gần nhất (hoặc theo id) — tự poll 1,5 giây khi đang chạy / đang thực thi. */
export const useAgentRun = (id: string | null) =>
  useQuery({
    queryKey: ['agent-run', id ?? 'latest'],
    queryFn: () => api.get<AgentRunView | null>(id ? `/agent/runs/${id}` : '/agent/runs/latest'),
    refetchInterval: (q) => (busy(q.state.data) ? 1500 : false),
  });

export const usePendingActions = () => useQuery({ queryKey: ['agent-actions', 'pending'], queryFn: () => api.get<AgentActionView[]>('/agent/actions?status=pending') });

export interface StartRunResponse { runId: string; status: 'running' }

export function useStartRun() {
  const refresh = useRefreshAgents();
  return useMutation({ mutationFn: (prompt: string) => api.post<StartRunResponse>('/agent/runs', { prompt }), onSuccess: refresh });
}

/** Nút "Cập nhật lại kế hoạch" ở trang Mô phỏng: Agent chạy đúng mô phỏng này rồi đề xuất việc chờ duyệt. */
export function useStartDecisionRun() {
  const refresh = useRefreshAgents();
  return useMutation({
    mutationFn: ({ prompt, decision }: { prompt: string; decision: DecisionRequest }) => api.post<StartRunResponse>('/agent/runs', { prompt, decision }),
    onSuccess: refresh,
  });
}

export function useApproveBatch() {
  const refresh = useRefreshAgents();
  return useMutation({ mutationFn: (ids: string[]) => api.post<ApproveBatchResult>('/agent/actions/approve-batch', { ids }, idemKey()), onSettled: refresh });
}

/** Từ chối lần lượt các hành động đang chờ. */
export function useRejectActions() {
  const refresh = useRefreshAgents();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await api.post<null>(`/agent/actions/${id}/reject`, undefined, idemKey());
    },
    onSettled: refresh,
  });
}

export function useRequestChanges() {
  const refresh = useRefreshAgents();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => api.post<{ runId: string | null }>(`/agent/actions/${id}/request-changes`, { note }, idemKey()),
    onSettled: refresh,
  });
}
