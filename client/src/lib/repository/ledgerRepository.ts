// Repository Layer cho Sổ Thu Chi (Ledger).
// Kết hợp Backend API (authoritative source) + Local Storage (local-first cache & offline fallback).

import type { Bill, BudgetInfo, LedgerDashboard, LedgerData } from '../../../../shared/types/api/ledger';
import type { MonthTotal, Transaction } from '../../../../shared/types/domain';
import { buildLedgerDashboard } from '../../../../shared/engine/ledgerDashboard';
import { totalsOf } from '../../../../shared/engine/budget';
import { TRANSACTION_CATEGORIES, type TransactionCategory } from '../../../../shared/engine/ledger';
import { addMonths, currentMonth } from '../../../../shared/engine/month';
import { api } from '../api';
import { ledgerStorage } from '../storage/ledgerStorage';
import type { BillInput, TransactionInput } from '../queries/ledger';

export interface LedgerRepository {
  getDashboard(month?: string): Promise<LedgerDashboard>;
  getTransactions(month: string): Promise<LedgerData>;
  createTransaction(input: TransactionInput): Promise<{ id: string }>;
  updateTransaction(id: string, input: TransactionInput): Promise<null>;
  deleteTransaction(id: string): Promise<null>;
  saveBudget(month: string, limit: number): Promise<BudgetInfo>;
  saveBill(bill: BillInput & { id?: string }): Promise<{ id: string } | null>;
  deleteBill(id: string): Promise<null>;
  payBill(id: string): Promise<null>;
}

export const ledgerRepository: LedgerRepository = {
  async getDashboard(month?: string): Promise<LedgerDashboard> {
    const targetMonth = month || currentMonth();
    try {
      const data = await api.get<LedgerDashboard>(`/ledger/dashboard${month ? `?month=${month}` : ''}`);
      // Đồng bộ snapshot vào LocalStorage
      if (data) {
        if (Array.isArray(data.recent) && data.recent.length > 0) {
          const currentStored = ledgerStorage.getAll();
          const mergedMap = new Map<string, Transaction>();
          currentStored.forEach((t: Transaction) => mergedMap.set(t.id, t));
          data.recent.forEach((t: Transaction) => mergedMap.set(t.id, t));
          ledgerStorage.replaceAll([...mergedMap.values()]);
        }
        if (data.budget && data.budget.limit !== null) {
          ledgerStorage.setBudget(targetMonth, data.budget.limit);
        }
        if (Array.isArray(data.bills)) {
          data.bills.forEach((b: Bill) => ledgerStorage.saveBill(b));
        }
      }
      return data;
    } catch (err: any) {
      // Offline fallback: Tính toán trực tiếp từ LocalStorage qua Centralized Engine
      console.info('[ledgerRepository] Dùng LocalStorage fallback cho dashboard:', err?.message);
      const allTx = ledgerStorage.getAll();
      const budgetLimit = ledgerStorage.getBudget(targetMonth);
      const bills = ledgerStorage.getBills();
      return buildLedgerDashboard(allTx, {
        month: targetMonth,
        budgetLimit,
        bills,
      });
    }
  },

  async getTransactions(month: string): Promise<LedgerData> {
    try {
      const data = await api.get<LedgerData>(`/transactions?month=${month}`);
      if (data?.items) {
        const currentStored = ledgerStorage.getAll();
        const otherMonths = currentStored.filter((t) => !t.occurredOn.startsWith(month));
        ledgerStorage.replaceAll([...data.items, ...otherMonths]);
      }
      return data;
    } catch (err: any) {
      console.info('[ledgerRepository] Dùng LocalStorage fallback cho transactions:', err?.message);
      const allTx = ledgerStorage.getAll();
      const items = allTx.filter((t) => t.occurredOn.startsWith(month));
      const totals = { income: 0, expense: 0 };
      const byKey = new Map<string, number>();

      for (const t of items) {
        totals[t.kind as 'income' | 'expense'] += t.amount;
        byKey.set(t.category, (byKey.get(t.category) ?? 0) + t.amount);
      }

      const byCategory = TRANSACTION_CATEGORIES.filter((cat: TransactionCategory) => byKey.has(cat.key))
        .map((cat: TransactionCategory) => {
          const amount = byKey.get(cat.key)!;
          const kindTotal = totals[cat.kind as 'income' | 'expense'] || 1;
          return { key: cat.key, kind: cat.kind, label: cat.label, icon: cat.icon, amount, pct: amount / kindTotal };
        })
        .sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount);

      const months: MonthTotal[] = Array.from({ length: 6 }, (_, i) => {
        const m = addMonths(month, i - 5);
        const mItems = allTx.filter((t) => t.occurredOn.startsWith(m));
        const t = totalsOf(mItems);
        return { month: m, income: t.income, expense: t.expense };
      });

      return {
        month,
        items,
        totals: { ...totals, net: totals.income - totals.expense },
        byCategory,
        months,
        used: { income: totals.income, expense: totals.expense, incomeSource: 'ledger', expenseSource: 'ledger', ledgerMonths: 1 },
      };
    }
  },

  async createTransaction(input: TransactionInput): Promise<{ id: string }> {
    // Lưu trước vào local storage để có dữ liệu ngay
    const local = ledgerStorage.create(input);
    try {
      const res = await api.post<{ id: string }>('/transactions', input);
      if (res?.id && res.id !== local.id) {
        ledgerStorage.remove(local.id);
        const updated = { ...local, id: res.id };
        const all = ledgerStorage.getAll();
        ledgerStorage.replaceAll([updated, ...all]);
        return res;
      }
      return { id: local.id };
    } catch (err) {
      console.warn('[ledgerRepository] API createTransaction thất bại, giữ lưu local:', err);
      return { id: local.id };
    }
  },

  async updateTransaction(id: string, input: TransactionInput): Promise<null> {
    ledgerStorage.update(id, input);
    try {
      return await api.patch<null>(`/transactions/${id}`, input);
    } catch (err) {
      console.warn('[ledgerRepository] API updateTransaction thất bại, giữ cập nhật local:', err);
      return null;
    }
  },

  async deleteTransaction(id: string): Promise<null> {
    ledgerStorage.remove(id);
    try {
      return await api.del<null>(`/transactions/${id}`);
    } catch (err) {
      console.warn('[ledgerRepository] API deleteTransaction thất bại, giữ xóa local:', err);
      return null;
    }
  },

  async saveBudget(month: string, limit: number): Promise<BudgetInfo> {
    ledgerStorage.setBudget(month, limit);
    try {
      return await api.put<BudgetInfo>(`/budgets/${month}`, { limit });
    } catch (err) {
      console.warn('[ledgerRepository] API saveBudget thất bại, giữ local:', err);
      const allTx = ledgerStorage.getAll();
      const cur = allTx.filter((t) => t.occurredOn.startsWith(month));
      const spent = totalsOf(cur).expense;
      return {
        month,
        limit,
        spent,
        pct: limit > 0 ? spent / limit : null,
        remaining: limit - spent,
        inherited: false,
      };
    }
  },

  async saveBill(bill: BillInput & { id?: string }): Promise<{ id: string } | null> {
    const local = ledgerStorage.saveBill(bill);
    try {
      if (bill.id) {
        await api.patch<null>(`/bills/${bill.id}`, bill);
        return null;
      }
      const res = await api.post<{ id: string }>('/bills', bill);
      return res;
    } catch (err) {
      console.warn('[ledgerRepository] API saveBill thất bại, giữ local:', err);
      return { id: local.id };
    }
  },

  async deleteBill(id: string): Promise<null> {
    ledgerStorage.deleteBill(id);
    try {
      return await api.del<null>(`/bills/${id}`);
    } catch (err) {
      console.warn('[ledgerRepository] API deleteBill thất bại, giữ local:', err);
      return null;
    }
  },

  async payBill(id: string): Promise<null> {
    ledgerStorage.payBill(id);
    try {
      return await api.post<null>(`/bills/${id}/paid`, {});
    } catch (err) {
      console.warn('[ledgerRepository] API payBill thất bại, giữ local:', err);
      return null;
    }
  },
};
