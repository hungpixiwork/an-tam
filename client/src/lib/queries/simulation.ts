import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SimulationReport } from '@shared/engine/analysis';
import type { SimulationParams } from '@shared/types/domain';
import { api } from '../api';
import { qk } from './keys';

export interface Preset { id: string; slug: string; name: string; icon: string; params: SimulationParams }
export interface RunSummary { id: string; label: string; createdAt: string }
export type SimulationRun = SimulationReport & { createdAt: string };

/* ───────── 03 / 04 · Mô phỏng ───────── */
export const usePresets = () => useQuery({ queryKey: qk.presets, queryFn: () => api.get<Preset[]>('/simulations/presets'), staleTime: Infinity });
export const useRuns = () => useQuery({ queryKey: qk.runs, queryFn: () => api.get<RunSummary[]>('/simulations/runs') });
export const useRun = (id: string) => useQuery({ queryKey: qk.run(id), queryFn: () => api.get<SimulationRun>(`/simulations/runs/${id}`), staleTime: Infinity });

/** Xem trước tác động (không lưu). Gọi lại mỗi khi params đổi — nên debounce ở màn. */
export const useSimulationPreview = (params: SimulationParams) =>
  useQuery({
    queryKey: ['preview', params],
    queryFn: () => api.post<SimulationReport>('/simulations/preview', params),
    placeholderData: (prev) => prev,
  });

export function useRunSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: SimulationParams) => api.post<{ runId: string }>('/simulations/run', params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.runs });
      qc.invalidateQueries({ queryKey: ['ai'] });
    },
  });
}
