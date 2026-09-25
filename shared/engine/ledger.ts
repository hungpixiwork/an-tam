// Sổ thu chi: danh mục giao dịch, tổng theo tháng và cách engine chọn thu nhập / chi tiêu tháng.

import type { AssetCategory, FinancialProfile, Holding, MonthTotal, TransactionKind, Volatility } from '../types/domain';
import { addMonths } from './month';

export interface TransactionCategory {
  key: string;
  kind: TransactionKind;
  label: string;
  /** Tên icon lucide (client tự ánh xạ). */
  icon: string;
}

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  { key: 'salary', kind: 'income', label: 'Lương', icon: 'briefcase' },
  { key: 'bonus', kind: 'income', label: 'Thưởng', icon: 'gift' },
  { key: 'business', kind: 'income', label: 'Kinh doanh', icon: 'store' },
  { key: 'invest_income', kind: 'income', label: 'Lãi đầu tư', icon: 'trending-up' },
  { key: 'other_income', kind: 'income', label: 'Thu khác', icon: 'plus-circle' },
  { key: 'food', kind: 'expense', label: 'Ăn uống', icon: 'utensils' },
  { key: 'housing', kind: 'expense', label: 'Nhà ở', icon: 'home' },
  { key: 'transport', kind: 'expense', label: 'Đi lại', icon: 'car' },
  { key: 'children', kind: 'expense', label: 'Con cái', icon: 'baby' },
  { key: 'health', kind: 'expense', label: 'Sức khỏe', icon: 'heart-pulse' },
  { key: 'shopping', kind: 'expense', label: 'Mua sắm', icon: 'shopping-bag' },
  { key: 'entertainment', kind: 'expense', label: 'Giải trí', icon: 'party-popper' },
  { key: 'other_expense', kind: 'expense', label: 'Chi khác', icon: 'more-horizontal' },
];

export const categoryOf = (key: string): TransactionCategory | undefined => TRANSACTION_CATEGORIES.find((c) => c.key === key);

/** Số tháng đã trọn gần nhất dùng để lấy trung bình thu / chi. */
export const LEDGER_AVERAGE_MONTHS = 3;

/** Nguồn của con số thu nhập / chi tiêu engine đang dùng. */
export type ProfileSource = 'ledger' | 'baseline' | 'current_month' | 'none';

export interface EffectiveProfile {
  profile: FinancialProfile;
  incomeSource: ProfileSource;
  expenseSource: ProfileSource;
  /** Số tháng đã trọn có dữ liệu trong sổ (0..LEDGER_AVERAGE_MONTHS). */
  ledgerMonths: number;
}

/**
 * Thu nhập / chi tiêu tháng engine dùng, theo thứ tự ưu tiên cho từng trường:
 * 1. trung bình các tháng đã trọn (≤ 3 tháng gần nhất) có ghi sổ,
 * 2. số nền người dùng tự nhập (màn Bắt đầu / Cài đặt),
 * 3. số đã ghi trong tháng hiện tại (để người chưa nhập số nền vẫn thấy AI phản ứng ngay).
 */
export function effectiveProfile(baseline: FinancialProfile, ledger: MonthTotal[], today: string): EffectiveProfile {
  const from = addMonths(today, -LEDGER_AVERAGE_MONTHS);
  const complete = ledger.filter((m) => m.month >= from && m.month < today);
  const current = ledger.find((m) => m.month === today);

  const pick = (field: 'income' | 'expense', base: number): [number, ProfileSource] => {
    const months = complete.filter((m) => m[field] > 0);
    if (months.length) return [Math.round(months.reduce((s, m) => s + m[field], 0) / months.length), 'ledger'];
    if (base > 0) return [base, 'baseline'];
    if (current && current[field] > 0) return [current[field], 'current_month'];
    return [0, 'none'];
  };

  const [monthlyIncome, incomeSource] = pick('income', baseline.monthlyIncome);
  const [monthlyExpense, expenseSource] = pick('expense', baseline.monthlyExpense);
  return { profile: { ...baseline, monthlyIncome, monthlyExpense }, incomeSource, expenseSource, ledgerMonths: complete.length };
}

/** Giả định mặc định theo loại tài sản — để người dùng chỉ cần nhập tên, loại và giá trị. */
export const HOLDING_DEFAULTS: Record<AssetCategory, { role: string; volatility: Volatility; riskGroup: string }> = {
  cash: { role: 'An toàn', volatility: 'low', riskGroup: 'Tiền mặt và tài sản an toàn' },
  fund: { role: 'Cân bằng', volatility: 'mid', riskGroup: 'Quỹ đầu tư' },
  stock: { role: 'Tăng trưởng', volatility: 'high', riskGroup: 'Cổ phiếu' },
  bond: { role: 'Ổn định', volatility: 'low', riskGroup: 'Lãi suất và trái phiếu' },
  other: { role: 'Dự phòng', volatility: 'mid', riskGroup: 'Vàng và tài sản khác' },
};

export const holdingDefaults = (category: AssetCategory): Pick<Holding, 'role' | 'volatility' | 'riskGroup'> => ({ ...HOLDING_DEFAULTS[category] });
