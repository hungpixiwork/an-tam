import type { Salutation, AssetCategory, Sector, GoalKind } from '../../../../shared/types/domain';

/** Cấu trúc dữ liệu cục bộ cho một tài khoản người dùng cô lập trên LocalStorage. */
export interface UserProfileData {
  version: 1;
  id: string;
  email: string;
  fullName: string;
  salutation: Salutation;
  createdAt: string;
  updatedAt: string;

  /** Thu chi cơ bản (ước lượng nền tảng). */
  finance: {
    monthlyIncome: number;
    monthlyExpense: number;
    essentialExpense: number;
    emergencyTargetMonths: number;
    targetSavingsRate?: number;
    iscoCode?: string; // ISCO-08 occupation code
    careerYears?: number;
    careerGrowthRate?: number;
    learningHoursWeekly?: number;
  };

  /** Danh mục tài sản & đầu tư. */
  holdings: Array<{
    id: string;
    name: string;
    category: AssetCategory;
    sector: Sector;
    value: number;
    isEmployerStock?: boolean;
    isInPortfolio?: boolean;
    costBasis?: number;
  }>;

  /** Khoản nợ phải trả. */
  debts: Array<{
    id: string;
    name: string;
    balance: number;
    interestRate: number;
    monthlyPayment: number;
  }>;

  /** Mục tiêu tài chính (quỹ an toàn, mua nhà, học tập...). */
  goals: Array<{
    id: string;
    title: string;
    category: GoalKind;
    targetAmount: number;
    currentAmount: number;
    deadlineMonths: number;
    priority: 'critical' | 'important' | 'standard';
  }>;

  /** Sổ thu chi (giao dịch gần nhất). */
  ledger: Array<{
    id: string;
    occurredOn: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    note: string;
  }>;

  /** Kịch bản lựa chọn cuộc đời đang theo dõi. */
  activeChoices: Array<{
    choiceKey: string;
    startedAt: string;
    customParams?: Record<string, number | string>;
  }>;

  /** Cài đặt thông báo & tuỳ chọn giao diện. */
  settings: {
    locale: 'vi' | 'en' | 'zh';
    currency: 'VND' | 'USD' | 'CNY';
    notifyGoalDelay: boolean;
    notifyPortfolioRisk: boolean;
    notifyWeeklyEmail: boolean;
    notifyCommunityLessons: boolean;
  };
}

/** Payload sao lưu dữ liệu toàn phần chuẩn JSON. */
export interface BackupPayload {
  schema: 'an-tam-backup-v1';
  exportedAt: string;
  appVersion: string;
  userData: UserProfileData;
}
