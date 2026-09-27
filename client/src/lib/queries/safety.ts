import { useMutation, useQuery } from '@tanstack/react-query';
import type { SafetyData, SafetyPlan, SafetyTargetInput } from '@shared/types/api';
import { api } from '../api';
import { qk, useInvalidateFinance } from './keys';

/* ───────── 03 · Quỹ an toàn & mục tiêu ───────── */
export const useSafety = () => useQuery({ queryKey: qk.safety, queryFn: () => api.get<SafetyData>('/safety') });

/** "Lên kế hoạch": áp dụng kế hoạch 6 / 12 tháng vào mục tiêu quỹ dự phòng. */
export function useApplySafetyTarget() {
  const refresh = useInvalidateFinance();
  return useMutation({ mutationFn: (input: SafetyTargetInput) => api.put<SafetyPlan>('/safety/target', input), onSuccess: refresh });
}
