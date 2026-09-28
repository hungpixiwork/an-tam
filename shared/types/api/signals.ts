// Hồ sơ tài chính gộp (Nền 1) — GET /api/signals. Tính từ sổ thu chi thật, hóa đơn định kỳ, khoản nợ, tài sản.

export type IncomeStability = 'on_dinh' | 'dao_dong' | 'bap_benh';
export type ExpenseTrend = 'tang' | 'giam' | 'deu';
export type ConfidenceLevel = 'thap' | 'vua' | 'cao';
export type SignalSource = 'ledger' | 'baseline' | 'current_month' | 'none';

export interface FinancialSignals {
  income: {
    /** Trung bình 3 / 6 tháng đã trọn có ghi thu (không có sổ → số engine đang dùng). */
    avg3: number;
    avg6: number;
    stability: IncomeStability;
    /** Số tháng đã trọn (trong 12 tháng gần nhất) có ghi sổ thu hoặc chi. */
    monthsOfData: number;
  };
  expense: {
    avg3: number;
    /** Chi cố định = hóa đơn định kỳ + tiền trả nợ hằng tháng. */
    fixed: number;
    /** Chi linh hoạt = chi trung bình − hóa đơn định kỳ (phần có thể cắt). */
    flexible: number;
    trend: ExpenseTrend;
  };
  /** Tiền để dành thật mỗi tháng = thu − chi − trả nợ; rate = monthly / thu. */
  saving: { monthly: number; rate: number };
  /** Tiền dùng được ngay (tiền mặt + danh mục đầu tư) và số tháng đủ sống. */
  liquid: { amount: number; monthsCovered: number };
  confidence: { level: ConfidenceLevel; reasons: string[] };
  sources: { incomeSource: SignalSource; expenseSource: SignalSource; ledgerMonths: number };
  bankLinked: boolean;
}
