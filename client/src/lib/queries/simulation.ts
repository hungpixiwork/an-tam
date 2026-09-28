import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SimulationReport } from '@shared/engine/analysis';
import type { SimulationParams } from '@shared/types/domain';
import type { DecisionShock, DecisionShockParams, DecisionSimulationInput, DecisionSimulationResult } from '@shared/types/api/decision';
import { api } from '../api';
import { qk } from './keys';

export interface Preset { id: string; slug: string; name: string; icon: string; params: SimulationParams }
export interface PresetsResponse { presets: Preset[]; shocks: { shock: DecisionShock; params: DecisionShockParams }[] }
export interface RunSummary { id: string; label: string; createdAt: string; choiceId: string | null; mode: string | null }
export type SimulationRun = (SimulationReport | DecisionSimulationResult) & { createdAt: string };
/** Yêu cầu mô phỏng cú sốc kép: choiceId bỏ trống = lựa chọn đang ghim; params bỏ trống = mẫu của `shock`. */
export type DecisionRequest = Omit<DecisionSimulationInput, 'choiceId' | 'params'> & { choiceId?: string; params?: DecisionShockParams };

export const isDecisionResult = (r: SimulationReport | DecisionSimulationResult): r is DecisionSimulationResult => 'scenarios' in r;

/* ───────── 03 / 04 · Mô phỏng ───────── */
export const usePresets = () => useQuery({ queryKey: qk.presets, queryFn: () => api.get<PresetsResponse>('/simulations/presets'), staleTime: Infinity });
export const useRuns = () => useQuery({ queryKey: qk.runs, queryFn: () => api.get<RunSummary[]>('/simulations/runs') });
export const useRun = (id: string) => useQuery({ queryKey: qk.run(id), queryFn: () => api.get<SimulationRun>(`/simulations/runs/${id}`), staleTime: Infinity });

/** Xem trước tác động kiểu cũ (5 thanh trượt) — không lưu. Nên debounce ở màn. */
export const useSimulationPreview = (params: SimulationParams) =>
  useQuery({
    queryKey: ['preview', params],
    queryFn: () => api.post<SimulationReport>('/simulations/preview', params),
    placeholderData: keepPreviousData,
  });

/** Xem trước mô phỏng cú sốc kép — giữ kết quả cũ trong lúc kéo thanh trượt. */
export const useDecisionPreview = (req: DecisionRequest | null) =>
  useQuery({
    queryKey: ['decision-preview', req],
    queryFn: () => api.post<DecisionSimulationResult>('/simulations/preview', req ?? undefined),
    enabled: !!req,
    placeholderData: keepPreviousData,
  });

export function useRunSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: SimulationParams | DecisionRequest) => api.post<{ runId: string }>('/simulations/run', params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.runs });
      qc.invalidateQueries({ queryKey: ['ai'] });
    },
  });
}
