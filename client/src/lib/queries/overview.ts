import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OverviewData } from '@shared/types/api';
import type { SuggestionGroup } from '@shared/engine/suggestions';
import { api } from '../api';
import { qk } from './keys';

/* ───────── 01 · Tổng quan ───────── */
export const useOverview = (range = 12) => useQuery({ queryKey: qk.overview(range), queryFn: () => api.get<OverviewData>(`/overview?range=${range}`) });

const useRefreshOverview = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['overview'] });
};

/** "Ẩn hôm nay" một nhóm đề xuất. */
export function useDismissSuggestion() {
  const refresh = useRefreshOverview();
  return useMutation({ mutationFn: (group: SuggestionGroup) => api.post<null>(`/overview/suggestions/${group}/dismiss`), onSuccess: refresh });
}

/** Hiện lại các đề xuất đã ẩn hôm nay. */
export function useRestoreSuggestions() {
  const refresh = useRefreshOverview();
  return useMutation({ mutationFn: () => api.del<null>('/overview/suggestions/dismissals'), onSuccess: refresh });
}
