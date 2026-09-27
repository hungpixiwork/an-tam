import { useMutation, useQuery } from '@tanstack/react-query';
import type { AllocationApplyResult, AllocationData } from '@shared/types/api';
import { api } from '../api';
import { useInvalidateFinance } from './keys';

/* ───────── Chia tiền để dành + danh mục đề xuất (khóa 'allocation' nằm trong FINANCE_KEYS) ───────── */
export const useAllocation = () => useQuery({ queryKey: ['allocation'], queryFn: () => api.get<AllocationData>('/allocation') });

/** "Áp dụng kế hoạch": đặt số để dành hằng tháng của từng mục tiêu = số đề xuất. Mỗi lần bấm = 1 Idempotency-Key mới. */
export function useApplyAllocation() {
  const refresh = useInvalidateFinance();
  return useMutation({
    mutationFn: () => api.post<AllocationApplyResult>('/allocation/apply', {}, { 'Idempotency-Key': `web-${crypto.randomUUID()}` }),
    onSuccess: refresh,
  });
}
