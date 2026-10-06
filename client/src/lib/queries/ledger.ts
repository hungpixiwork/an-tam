import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Bill, PayoutAccountData, SplitResult } from '../../../../shared/types/api';
import type { Transaction } from '../../../../shared/types/domain';
import { api } from '../api';
import { qk, useInvalidateFinance } from './keys';

import { ledgerRepository } from '../repository/ledgerRepository';

export type TransactionInput = Omit<Transaction, 'id'>;

/* ───────── Sổ thu chi ───────── */
export const useTransactions = (month: string) =>
  useQuery({ queryKey: qk.transactions(month), queryFn: () => ledgerRepository.getTransactions(month), placeholderData: (prev) => prev });

export function useSaveTransaction() {
  const refresh = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, ...t }: TransactionInput & { id?: string }) => (id ? ledgerRepository.updateTransaction(id, t) : ledgerRepository.createTransaction(t)),
    onSuccess: refresh,
  });
}

export function useDeleteTransaction() {
  const refresh = useInvalidateFinance();
  return useMutation({ mutationFn: (id: string) => ledgerRepository.deleteTransaction(id), onSuccess: refresh });
}

/* ───────── Trang Sổ thu chi: dashboard, ngân sách, hóa đơn, chia tiền ───────── */
export const useLedgerDashboard = (month?: string) =>
  useQuery({ queryKey: month ? [...qk.ledgerDashboard, month] : qk.ledgerDashboard, queryFn: () => ledgerRepository.getDashboard(month) });

export function useSaveBudget() {
  const refresh = useInvalidateFinance();
  return useMutation({ mutationFn: ({ month, limit }: { month: string; limit: number }) => ledgerRepository.saveBudget(month, limit), onSuccess: refresh });
}

export type BillInput = Pick<Bill, 'name' | 'amount' | 'category' | 'dayOfMonth' | 'autoRenew' | 'icon'>;

export function useSaveBill() {
  const refresh = useInvalidateFinance();
  return useMutation({ mutationFn: ({ id, ...b }: BillInput & { id?: string }) => ledgerRepository.saveBill({ ...b, id }), onSuccess: refresh });
}

export function useDeleteBill() {
  const refresh = useInvalidateFinance();
  return useMutation({ mutationFn: (id: string) => ledgerRepository.deleteBill(id), onSuccess: refresh });
}

export function usePayBill() {
  const refresh = useInvalidateFinance();
  return useMutation({ mutationFn: (id: string) => ledgerRepository.payBill(id), onSuccess: refresh });
}

export const usePayoutAccount = () => useQuery({ queryKey: qk.payoutAccount, queryFn: () => api.get<PayoutAccountData | null>('/settings/payout-account') });

export function useSavePayoutAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { bankBin: string; accountNo: string; accountName: string }) => api.put<PayoutAccountData>('/settings/payout-account', p),
    onSuccess: (data) => {
      qc.setQueryData(qk.payoutAccount, data);
      qc.invalidateQueries({ queryKey: qk.ledgerDashboard });
    },
  });
}

export const useSplitBill = () => useMutation({ mutationFn: (v: { title: string; total: number; people: string[] }) => api.post<SplitResult>('/ledger/split', v) });
