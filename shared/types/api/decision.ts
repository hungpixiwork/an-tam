import type { Sector } from '../domain';
import type { LifeChoiceVerdict, TextKey } from './lifeChoices';

/** Khung phân tích: cùng một cú sốc, nhẹ hơn (bull) / theo tham số (base) / nặng hơn (bear). */
export type DecisionMode = 'bull' | 'base' | 'bear';
/** Mẫu cú sốc có sẵn — chỉ là bộ tham số khởi đầu, engine tính theo `params`. */
export type DecisionShock = 'industry' | 'job_loss' | 'market';

/** Tham số cú sốc kép: nghề nghiệp (thu nhập) + tài sản (danh mục) cùng lúc. Phần trăm là số dương 0..100. */
export interface DecisionShockParams {
  /** Ngành bị ảnh hưởng — khoản đầu tư cùng ngành giảm theo `sectorDropPct`. */
  sector: Sector;
  /** Xác suất bị gián đoạn thu nhập. */
  disruptionProbPct: number;
  /** Số tháng mất lương nếu bị gián đoạn (3..24). */
  monthsNoIncome: number;
  /** Thưởng năm bị cắt. */
  bonusCutPct: number;
  /** Cổ phiếu thưởng (ESOP) năm bị cắt. */
  esopCutPct: number;
  /** Cổ phiếu của chính công ty đang làm giảm. */
  employerStockDropPct: number;
  /** Các khoản đầu tư khác cùng ngành giảm. */
  sectorDropPct: number;
  /** Phần còn lại của thị trường giảm (nhân theo độ nhạy từng loại tài sản). */
  marketDropPct: number;
}

/** Request mới cho /api/simulations/preview và /run; request SimulationParams cũ vẫn hợp lệ. */
export interface DecisionSimulationInput {
  choiceId: string;
  optionId?: string;
  mode: DecisionMode;
  shock: DecisionShock;
  params: DecisionShockParams;
}

export interface DecisionScenario {
  mode: DecisionMode;
  /** Số dư tiền dùng được theo tháng 0..24. */
  path: number[];
  /** Số tháng an toàn ở thời điểm eo hẹp nhất (số dư thấp nhất / chi tiêu tháng). */
  monthsSafe: number;
  /** Tháng có số dư thấp nhất (1..24). */
  lowestMonth: number;
  lowestBalance: number;
  /** Tháng đầu tiên hết tiền; null = không hết trong 24 tháng. */
  shortfallMonth: number | null;
  /** Mức độ an toàn 0..100 tại thời điểm eo hẹp nhất. */
  safetyScore: number;
  /** Tổng thu nhập mất đi trong 24 tháng (lương + thưởng + cổ phiếu thưởng). */
  incomeLost: number;
  /** Giá trị tài sản mất đi ngay khi sốc. */
  assetLoss: number;
}

export interface DecisionRange { min: number; max: number }

export interface DecisionGoalTile {
  key: 'goal' | 'reserve' | 'choice' | 'cashflow';
  title: string;
  /** Trước → sau: tháng 'YYYY-MM' (goal/choice), số tháng (reserve) hoặc VND/tháng (cashflow). */
  before: string | number | null;
  after: string | number | null;
  /** Mức thay đổi: số tháng (khoảng) hoặc % (cashflow). */
  delta: DecisionRange | number | null;
}

export interface DecisionStep {
  key: 'reduce_concentration' | 'raise_reserve' | 'side_income' | 'delay_start' | 'keep_plan';
  params: Record<string, number>;
}

export interface DecisionSimulationResult {
  choiceId: string;
  choiceTitle: string;
  optionId: string;
  optionTitle: string;
  mode: DecisionMode;
  shock: DecisionShock;
  params: DecisionShockParams;
  /** Đường không có cú sốc (kế hoạch ban đầu). */
  baseline: DecisionScenario;
  scenarios: Record<DecisionMode, DecisionScenario>;
  selected: DecisionScenario;
  /** 4 ô "Tác động ước tính". */
  impact: {
    monthsSafe: { before: number; after: number };
    reserve: { targetMonths: number; extraMonths: number; extraAmount: number };
    /** Mục tiêu lớn chính (mua nhà nếu có) lùi bao lâu. */
    goalDelay: (DecisionRange & { goalTitle: string; before: string | null; after: string | null }) | null;
    safety: { before: number; after: number };
  };
  goals: DecisionGoalTile[];
  /** Tác động lên lựa chọn cuộc đời: điểm khả thi trước/sau + 3 điều chỉnh gợi ý. */
  choiceImpact: {
    feasibilityBefore: number;
    feasibilityAfter: number;
    verdictAfter: LifeChoiceVerdict;
    delayStart: DecisionRange;
    notes: TextKey[];
  };
  steps: DecisionStep[];
  /** Tỷ trọng tài sản cùng ngành với công việc (cổ phiếu công ty + cùng ngành) trong tiền dùng được. */
  concentration: { amount: number; share: number };
  basis: string;
}
