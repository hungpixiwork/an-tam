// Màn "Bắt đầu".

import type { PeaceLevel } from '../../engine/peace';
import type { AlertSeverity } from '../../engine/alerts';
import type { Me, SetupStatus } from './common';
import type { MixShares, SavingsItem } from './allocation';

export interface OnboardingResult {
  me: Me;
  peace: { score: number; label: string; level: PeaceLevel };
  alerts: { severity: AlertSeverity; title: string }[];
  setup: SetupStatus;
  /** Tóm tắt chia tiền để dành + danh mục đề xuất cho bước kết quả. */
  allocation: {
    capacity: number;
    /** Tối đa 3 khoản đầu của kế hoạch chia tiền để dành. */
    savings: SavingsItem[];
    mix: MixShares;
    /** Mục tiêu lớn nhất (theo số tiền) và khả năng đạt khi làm theo kế hoạch. */
    topGoal: { title: string; probability: number } | null;
  };
}
