import { useMutation, useQuery } from '@tanstack/react-query';
import type { PortfolioAnalysis } from '@shared/engine/analysis';
import type { AssetCategory, Holding, Volatility } from '@shared/types/domain';
import { api } from '../api';
import { qk, useInvalidateFinance } from './keys';

export interface HoldingInput { name: string; category: AssetCategory; value: number; volatility?: Volatility }

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
