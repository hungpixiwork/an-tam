import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import type { PortfolioAnalysis } from '@shared/engine/analysis';
import type { PortfolioRisk, WhatIfPresetKey, WhatIfResult } from '@shared/types/api';
import type { AssetCategory, Holding, Sector, Volatility } from '@shared/types/domain';
import { api } from '../api';
import { qk, useInvalidateFinance } from './keys';

export interface HoldingInput {
  name: string;
  category: AssetCategory;
  value: number;
  volatility?: Volatility;
  sector?: Sector;
  isEmployerStock?: boolean;
  inPortfolio?: boolean;
}

export interface WhatIfRequest { preset: WhatIfPresetKey; amount: number; holdingMonths: number }

/* ───────── 07 · Danh mục & rủi ro tập trung ───────── */
export const usePortfolio = () => useQuery({ queryKey: qk.portfolio, queryFn: () => api.get<PortfolioAnalysis>('/portfolio') });
export const useHoldings = () => useQuery({ queryKey: qk.holdings, queryFn: () => api.get<Holding[]>('/holdings') });
export const usePortfolioRisk = () => useQuery({ queryKey: [...qk.portfolio, 'risk'], queryFn: () => api.get<PortfolioRisk>('/portfolio/risk') });

/** Kết quả "Thử trước khi đầu tư" — tự tính lại khi danh mục đổi (cùng khóa `portfolio`). */
export const useWhatIf = (input: WhatIfRequest | null) =>
  useQuery({
    queryKey: [...qk.portfolio, 'what-if', input],
    queryFn: () => api.post<WhatIfResult>('/portfolio/what-if', { ...input }),
    enabled: !!input && input.amount > 0,
    placeholderData: keepPreviousData,
  });

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
