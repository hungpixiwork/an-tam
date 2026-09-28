// Lựa chọn cuộc đời (B1) — Tổng quan (lựa chọn ghim) + màn Lựa chọn cuộc đời (/lua-chon).

import type { LifeChoiceReadiness } from '../../engine/lifeChoice';
import type { DecisionMode } from './decision';

export type LifeChoiceKind = 'study' | 'care' | 'startup' | 'switch' | 'sabbatical' | 'custom';

export interface LifeChoice {
  id: string;
  title: string;
  description: string;
  icon: string;
  cost: number;
  steps: string[];
  /** Số mốc đã xong (0..steps.length). */
  currentStep: number;
  pinned: boolean;
  status: 'active' | 'done' | 'archived';
  kind: LifeChoiceKind;
  /** Mục tiêu sau khi hoàn thành (chữ người dùng nhập). */
  outcome: string;
  /** Thu nhập kỳ vọng tăng bao nhiêu % sau khi hoàn thành (ước tính của người dùng). */
  incomeUpliftPct: number;
}

export interface LifeChoiceInput {
  title: string;
  description?: string;
  icon?: string;
  cost?: number;
  steps?: string[];
  currentStep?: number;
  pinned?: boolean;
  kind?: LifeChoiceKind;
  outcome?: string;
  incomeUpliftPct?: number;
  /** Tạo kèm phương án / điều kiện / việc cần làm từ mẫu. */
  template?: Exclude<LifeChoiceKind, 'custom'>;
}

export interface PinnedLifeChoice extends LifeChoice {
  readiness: LifeChoiceReadiness;
}

/** Thông số một phương án — đầu vào của engine. */
export interface LifeChoiceOptionInput {
  title: string;
  description?: string;
  /** Học phí / chi phí chính (VND). */
  cost: number;
  otherCost: number;
  durationMonths: number;
  /** Số tháng không có thu nhập (≤ durationMonths). */
  monthsWithoutIncome: number;
  /** Thu nhập thay đổi bao nhiêu mỗi tháng trong những tháng vẫn đi làm (vd làm bán thời gian: −3,5 triệu). */
  monthlyIncomeDelta: number;
  /** Phần chi linh hoạt định cắt trong thời gian thực hiện (0..1, mặc định 0,15). */
  cutPct?: number;
  /** Tháng dự định bắt đầu 'YYYY-MM' (bỏ trống = khi chuẩn bị xong). */
  startMonth?: string | null;
}

export interface LifeChoiceOption extends LifeChoiceOptionInput {
  id: string;
  selected: boolean;
}

export interface LifeChoicePrereq {
  id: string;
  title: string;
  done: boolean;
  /** Điều kiện hệ thống tự kiểm tra (không tick tay). */
  autoKey: string | null;
  /** Tham số hiển thị cho điều kiện tự kiểm tra (vd số tháng hiện có). */
  params?: Record<string, number>;
}

export type LifeChoiceTaskPriority = 'high' | 'mid' | 'low';
/** Nhóm của "Kế hoạch liên hoàn": tài chính / công việc / quỹ thời gian. */
export type LifeChoiceTaskCategory = 'finance' | 'career' | 'time';

export interface LifeChoiceTask {
  id: string;
  title: string;
  detail: string;
  priority: LifeChoiceTaskPriority;
  category: LifeChoiceTaskCategory;
  /** Việc Agent đề xuất làm trong hôm nay / tuần này. */
  today: boolean;
  done: boolean;
}

/** "Điều kiện để khả thi": 4 ô có tiến độ. */
export interface LifeChoiceCondition {
  key: 'fund' | 'side_income' | 'prepare' | 'safety';
  need: number;
  have: number;
  /** 0..1 */
  progress: number;
}

export interface TextKey {
  key: string;
  params?: Record<string, number | string>;
}

export type LifeChoiceVerdict = 'go' | 'conditional' | 'wait';

export interface LifeChoiceEvaluation {
  /** Điểm khả thi 0..100 = an toàn (40) + giữ mục tiêu (30) + giá trị nghề (20) + điều kiện (10). */
  feasibility: number;
  parts: { safety: number; goals: number; career: number; prereqs: number };
  /** Số tháng tiền mặt + khoản đầu tư đủ trả chi tiêu, trước và sau phương án. */
  monthsBefore: number;
  monthsAfter: number;
  monthsDelta: number;
  costs: { tuition: number; living: number; other: number; total: number };
  /** Tiền có thể dùng, phần thu nhập bù được, phần còn thiếu. */
  funding: { liquid: number; incomeCover: number; shortfall: number };
  /** Giá trị nghề: vốn con người thay đổi bao nhiêu % (ước tính). */
  careerChangePct: number;
  prereqsDone: number;
  prereqsTotal: number;
  opportunities: TextKey[];
  risks: TextKey[];
  verdict: LifeChoiceVerdict;
  unlock: TextKey;
  /** Kịch bản xấu (tất định): mất thu nhập 3 tháng + tài sản đầu tư giảm 20%, sau khi đã làm phương án. */
  worstCase?: { survives: boolean; monthsCovered: number };
  /** Câu nói rõ căn cứ của kết luận (số từ sổ thu chi thật hay còn ước lượng). */
  basis?: string;
}

export interface LifeChoiceOptionView extends LifeChoiceOption {
  evaluation: LifeChoiceEvaluation;
}

export interface LifeChoiceDetail extends LifeChoice {
  monthlyIncome: number;
  monthlyExpense: number;
  options: LifeChoiceOptionView[];
  prereqs: LifeChoicePrereq[];
  tasks: LifeChoiceTask[];
  /** Phương án điểm khả thi cao nhất. */
  recommendedOptionId: string | null;
}

export interface LifeChoiceTemplate {
  key: Exclude<LifeChoiceKind, 'custom'>;
  title: string;
  description: string;
  icon: string;
  cost: number;
  incomeUpliftPct: number;
  outcome: string;
  steps: string[];
  options: LifeChoiceOptionInput[];
  prereqs: { title: string; autoKey?: string }[];
  tasks: { title: string; detail: string; priority: LifeChoiceTaskPriority; category?: LifeChoiceTaskCategory }[];
}

export interface LifeChoiceCompare {
  options: (LifeChoiceOptionInput & { evaluation: LifeChoiceEvaluation })[];
  recommendedIndex: number;
}

/** Preview có thể lặp lại từ hồ sơ tài chính và giả định do người dùng nhập. */
export interface LifeChoicePreview {
  mode: DecisionMode;
  optionId: string;
  evaluation: LifeChoiceEvaluation;
  expectedMonthlyIncome: number;
  startAfterMonths: number | null;
  /** Tháng bắt đầu dự kiến 'YYYY-MM'. */
  startMonth: string | null;
  /** Số tháng cần chuẩn bị (đủ quỹ dự phòng + đủ tiền cho phương án). */
  prepareMonths: number | null;
  /** Mục tiêu mua nhà lùi bao nhiêu tháng vì phương án. */
  goalImpactMonths: number | null;
  goalTitle: string | null;
  conditions: LifeChoiceCondition[];
  assumptions: { costFactor: number; upliftFactor: number; preparationDelayMonths: number };
  basis: string;
}
