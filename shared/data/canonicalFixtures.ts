// Fixtures tài chính chuẩn hóa theo mô hình Uyên (Sheet 02_Fixtures & 08_Test_Matrix).
// Dùng làm nguồn chuẩn Single Source of Truth cho Unit Tests, Demo và Engine.

import type { FinancialProfile, Holding, Goal, Liability, UserState } from '../types/domain';

export const EVALUATION_DATE = '2026-10-01';

/** Fixture A: Hồ sơ rỗng / Chưa nhập dữ liệu (Unknown != 0) */
export const FIXTURE_A: UserState = {
  today: EVALUATION_DATE,
  salutation: 'anh',
  profile: {
    monthlyIncome: 0,
    monthlyExpense: 0,
    essentialExpense: 0,
    emergencyTargetMonths: 6,
    birthYear: 1996,
    retirementAge: 65,
  },
  holdings: [],
  goals: [],
  liabilities: [],
  ledger: [],
  snapshots: [],
};

/** Fixture B: Chỉ có thu nhập nền (Không suy diễn 100% tiết kiệm) */
export const FIXTURE_B: UserState = {
  today: EVALUATION_DATE,
  salutation: 'chị',
  profile: {
    monthlyIncome: 28_500_000,
    monthlyExpense: 0,
    essentialExpense: 0,
    emergencyTargetMonths: 6,
    birthYear: 1996,
    retirementAge: 65,
  },
  holdings: [],
  goals: [],
  liabilities: [],
  ledger: [],
  snapshots: [],
};

/**
 * Fixture C: Hồ sơ đầy đủ (Complete canonical profile)
 * - Thu nhập TB: 28.5 triệu / tháng (Sổ thu chi 3 tháng: 28, 29, 28.5)
 * - Chi tiêu TB: 18.5 triệu / tháng (Sổ thu chi 3 tháng: 18, 19, 18.5)
 * - Chi tiêu thiết yếu: 14 triệu / tháng
 * - Quỹ dự phòng: 84 triệu (6 tháng chi tiêu thiết yếu: 84 / 14 = 6.0)
 * - Tiền mặt khả dụng đầu tư: 32 triệu
 * - Cổ phiếu công ty: 112 triệu (Ngành Công nghệ)
 * - Quỹ ETF toàn cầu: 128 triệu (Tỷ trọng Tech = 30.22%)
 * - Trái phiếu: 48 triệu
 * - Nợ tồn đọng: 60 triệu (Trả nợ định kỳ: 2 triệu / tháng)
 * - Mục tiêu mua nhà: Đã có 180 triệu, đích 500 triệu sau 36 tháng, để dành 6 triệu / tháng
 * - Vốn con người (HC): ~4,782.94 triệu (Chuyên viên tài chính ISCO 2413, G4, π = 5%, T = 35)
 */
export const FIXTURE_C_PROFILE: FinancialProfile = {
  monthlyIncome: 27_000_000, // baseline bị ghi đè bởi sổ thu chi (28.5tr)
  monthlyExpense: 17_000_000, // baseline bị ghi đè bởi sổ thu chi (18.5tr)
  essentialExpense: 14_000_000,
  emergencyTargetMonths: 6,
  birthYear: 1996, // Tuổi 30 năm 2026
  retirementAge: 65,
  careerBeta: 0.7,
  occupationIsco: '2413',
  industry: 'finance',
};

export const FIXTURE_C_HOLDINGS: Holding[] = [
  { id: 'h-cash-reserve', name: 'Quỹ an toàn', category: 'cash', value: 84_000_000, role: 'An toàn', volatility: 'low', riskGroup: 'Tiền mặt và tài sản an toàn', inPortfolio: false, isMain: true },
  { id: 'h-cash-invest', name: 'Tiền mặt đầu tư', category: 'cash', value: 32_000_000, role: 'Đầu tư', volatility: 'low', riskGroup: 'Tiền mặt và tài sản an toàn', inPortfolio: true, isMain: false },
  { id: 'h-employer-stock', name: 'Cổ phiếu công ty', category: 'stock', value: 112_000_000, role: 'Tăng trưởng', volatility: 'high', riskGroup: 'Cổ phiếu', sector: 'technology', isEmployerStock: true, inPortfolio: true, isMain: true },
  { id: 'h-etf', name: 'Quỹ ETF toàn cầu', category: 'fund', value: 128_000_000, role: 'Cân bằng', volatility: 'mid', riskGroup: 'Quỹ đầu tư', sector: 'other', inPortfolio: true, isMain: true },
  { id: 'h-bond', name: 'Trái phiếu', category: 'bond', value: 48_000_000, role: 'Ổn định', volatility: 'low', riskGroup: 'Lãi suất và trái phiếu', sector: 'finance', inPortfolio: true, isMain: false },
];

export const FIXTURE_C_GOALS: Goal[] = [
  {
    id: 'g-home',
    kind: 'home',
    title: 'Tích lũy mua nhà',
    targetAmount: 500_000_000,
    currentAmount: 180_000_000,
    targetMonth: '2029-10-01', // 36 tháng
    monthlyContribution: 6_000_000,
    priority: 1,
    icon: 'home',
  },
];

export const FIXTURE_C_LIABILITIES: Liability[] = [
  {
    id: 'l-consumer',
    name: 'Khoản vay trả góp',
    balance: 60_000_000,
    monthlyPayment: 2_000_000,
    requiredMonthly: 2_000_000,
    rateBp: 800, // 8%
    kind: 'consumer',
  },
];

export const FIXTURE_C_LEDGER = [
  { month: '2026-07', income: 28_000_000, expense: 18_000_000 },
  { month: '2026-08', income: 29_000_000, expense: 19_000_000 },
  { month: '2026-09', income: 28_500_000, expense: 18_500_000 },
];

export const FIXTURE_C: UserState = {
  today: EVALUATION_DATE,
  salutation: 'anh',
  profile: FIXTURE_C_PROFILE,
  holdings: FIXTURE_C_HOLDINGS,
  goals: FIXTURE_C_GOALS,
  liabilities: FIXTURE_C_LIABILITIES,
  ledger: FIXTURE_C_LEDGER,
  snapshots: [],
};
