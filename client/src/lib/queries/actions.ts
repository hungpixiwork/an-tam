import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DecisionStep, SuggestedAction } from '@shared/types/api/decision';
import type { AgentActionStatus, ActionPreview } from '@shared/types/api';
import { api } from '../api';

/* ───────── Hành động 1 chạm (POST /api/actions/apply) + hoàn tác ───────── */

const idemKey = () => ({ 'Idempotency-Key': `web-${crypto.randomUUID()}` });

/** Chỉ tải lại những gì hành động đó làm thay đổi (thay vì toàn bộ dữ liệu tài chính). */
const KEYS_BY_TYPE: Record<string, string[][]> = {
  'safety.set_target': [['safety'], ['goals'], ['profile'], ['allocation']],
  'goal.update_progress': [['safety'], ['goals'], ['allocation']],
  'budget.set': [['budgets'], ['ledger']],
  'holding.rebalance': [['holdings'], ['portfolio'], ['safety'], ['allocation']],
  'earn.set_target': [['earn-dashboard'], ['earn']],
  'reminder.create': [['calendar']],
  'calendar.create_events': [['calendar']],
  'alert_rule.create': [['alert-rules'], ['market']],
  'life_choice.update_plan': [['life-choices']],
};
const ALWAYS = [['overview'], ['notifications'], ['life-choice'], ['decision-context'], ['decision-next'], ['applied-steps']];

function useRefreshFor() {
  const qc = useQueryClient();
  return (type: string) => [...(KEYS_BY_TYPE[type] ?? []), ...ALWAYS].forEach((queryKey) => qc.invalidateQueries({ queryKey }));
}

export interface ApplyInput extends SuggestedAction { title: string; stepKey?: string; choiceId?: string }
export interface ApplyResult { id: string; status: AgentActionStatus; error: string | null; preview: ActionPreview; to: string | null; undoUntil: string }

export function useApplyAction() {
  const refresh = useRefreshFor();
  return useMutation({
    mutationFn: (v: ApplyInput) => api.post<ApplyResult>('/actions/apply', v, idemKey()),
    onSuccess: (_r, v) => refresh(v.type),
  });
}

export function useUndoAction() {
  const refresh = useRefreshFor();
  return useMutation({
    mutationFn: ({ id }: { id: string; type: string }) => api.post<{ id: string; undone: true }>(`/actions/${id}/undo`, undefined, idemKey()),
    onSuccess: (_r, v) => refresh(v.type),
  });
}

/** Bước gợi ý đã áp dụng (chưa hoàn tác) của một lựa chọn. */
export const useAppliedSteps = (choiceId: string | undefined) =>
  useQuery({
    queryKey: ['applied-steps', choiceId],
    queryFn: () => api.get<{ id: string; stepKey: string; type: string; executedAt: string }[]>(`/actions/applied?choiceId=${encodeURIComponent(choiceId ?? '')}`),
    enabled: !!choiceId,
    staleTime: 60_000,
  });

export interface DecisionNext { choiceId: string; choiceTitle: string; steps: DecisionStep[] }

/** Việc của quyết định lớn liên quan tới trang đang xem (dải trên đầu trang CRUD). */
export const useDecisionNext = (domain: 'safety' | 'ledger' | 'portfolio' | 'earn' | 'all') =>
  useQuery({ queryKey: ['decision-next', domain], queryFn: () => api.get<DecisionNext | null>(`/decision/next?domain=${domain}`), staleTime: 5 * 60_000 });
