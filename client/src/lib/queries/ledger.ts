import { useMutation, useQuery } from '@tanstack/react-query';
import type { LedgerData } from '@shared/types/api';
import type { Transaction } from '@shared/types/domain';
import { api } from '../api';
import { qk, useInvalidateFinance } from './keys';

export type TransactionInput = Omit<Transaction, 'id'>;

/* ───────── Sổ thu chi ───────── */
export const useTransactions = (month: string) =>
  useQuery({ queryKey: qk.transactions(month), queryFn: () => api.get<LedgerData>(`/transactions?month=${month}`), placeholderData: (prev) => prev });

export function useSaveTransaction() {
  const refresh = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, ...t }: TransactionInput & { id?: string }) => (id ? api.patch<null>(`/transactions/${id}`, t) : api.post<{ id: string }>('/transactions', t)),
    onSuccess: refresh,
  });
}

export function useDeleteTransaction() {
  const refresh = useInvalidateFinance();
  return useMutation({ mutationFn: (id: string) => api.del<null>(`/transactions/${id}`), onSuccess: refresh });
}
