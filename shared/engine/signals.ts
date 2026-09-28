// Hồ sơ tài chính gộp (Nền 1): thu, chi, để dành, tiền dùng được ngay và mức tin cậy của số liệu.
// Hàm thuần — đầu vào là UserState (đã gộp sổ thu chi qua effectiveProfile) + tổng hóa đơn định kỳ + có liên kết ngân hàng.
//
// Quy ước:
// - Chỉ dùng các tháng ĐÃ TRỌN (trước tháng hiện tại) trong 12 tháng gần nhất.
// - Độ đều thu nhập = hệ số biến thiên (độ lệch chuẩn / trung bình) của thu các tháng có ghi thu (≤ 6 tháng):
//     ≤ 15% → 'on_dinh', ≤ 35% → 'dao_dong', > 35% → 'bap_benh'. Dưới 2 tháng dữ liệu → 'dao_dong' (chưa đủ để kết luận).
// - Chiều hướng chi: trung bình 3 tháng gần nhất so với 3 tháng trước đó (cần ≥ 4 tháng): lệch > 5% → tăng / giảm.
// - Chi cố định = hóa đơn định kỳ + tiền trả nợ hằng tháng. Hóa đơn đã nằm trong sổ chi, tiền trả nợ thì không
//   (sổ không có danh mục trả nợ) → chi linh hoạt = chi trung bình − hóa đơn; tổng chi sống = cố định + linh hoạt.
// - Mức tin cậy theo số tháng sổ thật: 0–1 → 'thap', 2–3 → 'vua', ≥ 4 → 'cao'.

import type { UserState } from '../types/domain';
import type { ConfidenceLevel, ExpenseTrend, FinancialSignals, IncomeStability, SignalSource } from '../types/api/signals';
import { addMonths } from './month';
import { liquidAssets, monthsCovered } from './lifeChoice';

export const STABILITY_CV = { onDinh: 0.15, daoDong: 0.35 } as const;
export const TREND_THRESHOLD = 0.05;
export const CONFIDENCE_MONTHS = { vua: 2, cao: 4 } as const;
/** Ghi thêm tới mốc này thì số liệu được coi là chắc. */
export const CONFIDENT_MONTHS = CONFIDENCE_MONTHS.cao;

export interface SignalsExtras {
  /** Tổng hóa đơn định kỳ mỗi tháng (recurring_bills). */
  bills?: number;
  bankLinked?: boolean;
  /** Nguồn của thu / chi (LoadedState.sources). */
  sources?: { incomeSource: SignalSource; expenseSource: SignalSource; ledgerMonths: number };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export function confidenceLevel(monthsOfData: number): ConfidenceLevel {
  return monthsOfData >= CONFIDENCE_MONTHS.cao ? 'cao' : monthsOfData >= CONFIDENCE_MONTHS.vua ? 'vua' : 'thap';
}

export function incomeStability(incomes: number[]): IncomeStability {
  if (incomes.length < 2) return 'dao_dong';
  const m = avg(incomes);
  if (m <= 0) return 'bap_benh';
  const cv = Math.sqrt(avg(incomes.map((x) => (x - m) ** 2))) / m;
  return cv <= STABILITY_CV.onDinh ? 'on_dinh' : cv <= STABILITY_CV.daoDong ? 'dao_dong' : 'bap_benh';
}

export function financialSignals(state: UserState & { sources?: SignalsExtras['sources'] }, extras: SignalsExtras = {}): FinancialSignals {
  const from = addMonths(state.today, -12);
  // Tháng đã trọn, mới nhất trước
  const complete = state.ledger.filter((m) => m.month >= from && m.month < state.today).sort((a, b) => (a.month < b.month ? 1 : -1));
  const withData = complete.filter((m) => m.income > 0 || m.expense > 0);
  const incomes = complete.filter((m) => m.income > 0).map((m) => m.income);
  const expenses = complete.filter((m) => m.expense > 0).map((m) => m.expense);

  const income3 = incomes.length ? Math.round(avg(incomes.slice(0, 3))) : state.profile.monthlyIncome;
  const income6 = incomes.length ? Math.round(avg(incomes.slice(0, 6))) : state.profile.monthlyIncome;
  const expense3 = expenses.length ? Math.round(avg(expenses.slice(0, 3))) : state.profile.monthlyExpense;

  let trend: ExpenseTrend = 'deu';
  if (expenses.length >= 4) {
    const recent = avg(expenses.slice(0, 3));
    const prev = avg(expenses.slice(3, 6));
    const change = prev > 0 ? (recent - prev) / prev : 0;
    trend = change > TREND_THRESHOLD ? 'tang' : change < -TREND_THRESHOLD ? 'giam' : 'deu';
  }

  const bills = Math.max(0, Math.round(extras.bills ?? 0));
  const debt = (state.liabilities ?? []).reduce((s, l) => s + Math.max(0, l.monthlyPayment), 0);
  const fixed = bills + debt;
  const flexible = Math.max(0, expense3 - bills);

  const savingMonthly = income3 - expense3 - debt;
  const liquid = liquidAssets(state);
  const monthsOfData = withData.length;
  const level = confidenceLevel(monthsOfData);
  const sources = extras.sources ?? state.sources ?? { incomeSource: 'none', expenseSource: 'none', ledgerMonths: 0 };
  const bankLinked = extras.bankLinked ?? false;

  const reasons: string[] = [];
  if (monthsOfData === 0) reasons.push('chưa có tháng sổ thu chi nào ghi trọn');
  else reasons.push(`${level === 'cao' ? 'có' : 'mới có'} ${monthsOfData} tháng sổ thu chi thật`);
  if (sources.incomeSource === 'baseline') reasons.push('thu nhập đang lấy theo số bạn tự nhập');
  if (sources.expenseSource === 'baseline') reasons.push('chi tiêu đang lấy theo số bạn tự nhập');
  reasons.push(bankLinked ? 'đã liên kết ngân hàng, giao dịch tự vào sổ' : 'chưa liên kết ngân hàng');

  return {
    income: { avg3: income3, avg6: income6, stability: incomeStability(incomes.slice(0, 6)), monthsOfData },
    expense: { avg3: expense3, fixed, flexible, trend },
    saving: { monthly: savingMonthly, rate: income3 > 0 ? Math.round((savingMonthly / income3) * 1000) / 1000 : 0 },
    liquid: { amount: liquid, monthsCovered: Math.round(monthsCovered(state, liquid) * 10) / 10 },
    confidence: { level, reasons },
    sources: { incomeSource: sources.incomeSource, expenseSource: sources.expenseSource, ledgerMonths: sources.ledgerMonths },
    bankLinked,
  };
}
