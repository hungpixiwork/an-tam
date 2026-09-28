import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SimulationReport } from '@shared/engine/analysis';
import type { Sector, SimulationParams, UserState } from '@shared/types/domain';
import type { LifeChoiceOption } from '@shared/types/api';
import type { DecisionChoiceContext, DecisionIncomeExtras } from '@shared/engine/decisionSimulation';
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

/** Dữ liệu để engine cú sốc kép chạy ngay trong trình duyệt. */
export interface DecisionContextResponse {
  state: UserState;
  choice: DecisionChoiceContext;
  option: Omit<LifeChoiceOption, 'selected'>;
  extras: DecisionIncomeExtras;
  sector: Sector;
  choices: { id: string; title: string }[];
  shocks: { shock: DecisionShock; params: DecisionShockParams }[];
}

/** choiceId bỏ trống = lựa chọn đang ghim. 404 = chưa có lựa chọn nào. */
export const useDecisionContext = (choiceId: string | undefined) =>
  useQuery({
    queryKey: ['decision-context', choiceId ?? 'pinned'],
    queryFn: () => api.get<DecisionContextResponse>(`/simulations/context${choiceId ? `?choiceId=${encodeURIComponent(choiceId)}` : ''}`),
    staleTime: 60_000,
    retry: (n, e) => !(e instanceof Error && 'status' in e && (e as { status: number }).status < 500) && n < 2,
  });

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
