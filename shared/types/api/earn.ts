// Tăng thu nhập & kỹ năng — B2 vốn con người theo mức phơi nhiễm AI.

import type { Sector } from '../domain';

export type ExposureLevel = 'low' | 'medium' | 'high';

export interface HumanCapitalInput {
  /** Thu nhập năm hiện tại (VND). */
  annualIncome: number;
  age: number;
  retirementAge: number;
  /** Mã ISCO-08 (1–4 chữ số). */
  iscoCode?: string;
  sector?: Sector;
  skillHoursPerWeek?: number;
}

export interface HumanCapitalResult {
  /** Vốn con người (VND, số nguyên) — ƯỚC TÍNH. */
  hc: number;
  exposureLevel: ExposureLevel;
  /** Mức phơi nhiễm AI 0..100. */
  exposurePct: number;
  /** Giá trị nghề nghiệp 0..100. */
  careerScore: number;
  explain: string[];
  /** Tốc độ tăng thu nhập / năm đã dùng. */
  g?: number;
  /** Mức bất định của nghề / năm đã dùng. */
  pi?: number;
  /** Số năm còn đi làm. */
  years?: number;
}

/* ───────── Trang Tăng thu nhập & kỹ năng (GET /api/earn/dashboard) ───────── */

export type SkillTag = 'data' | 'ai_automation' | 'nocode' | 'other';
export type SkillStage = 'foundation' | 'practice' | 'portfolio';
export type SkillStatus = 'planned' | 'learning' | 'done';

export interface SkillItem {
  id: string;
  name: string;
  tag: SkillTag;
  stage: SkillStage;
  status: SkillStatus;
  monthsMin: number;
  monthsMax: number;
  hoursPerWeek: number;
  /** 0..100 */
  progress: number;
}

export type SkillInput = Omit<SkillItem, 'id'>;

export type OpportunityKind = 'freelance' | 'job' | 'course';
export type OpportunityFit = 'high' | 'medium' | 'low';

export interface Opportunity {
  id: string;
  kind: OpportunityKind;
  title: string;
  tag: SkillTag;
  incomeMin: number;
  incomeMax: number;
  demand: 'high' | 'rising' | 'normal';
  remote: boolean;
  /** Mức phù hợp với kỹ năng người dùng đang có / đang học. */
  fit: OpportunityFit;
}

/** Nhóm nguồn thu từ giao dịch: lương (salary, bonus) · làm thêm (freelance, business) · đầu tư · khác. */
export type IncomeSourceKey = 'salary' | 'side' | 'invest' | 'other';

export interface IncomeSource { key: IncomeSourceKey; amount: number }

export interface RoadmapItem extends SkillItem {
  /** Thu nhập thêm kỳ vọng / tháng — từ cơ hội làm thêm cùng nhóm kỹ năng. */
  incomeMin: number;
  incomeMax: number;
  /** Tên cơ hội làm nguồn ước tính. */
  source: string | null;
}

export type LearningDayStatus = 'done' | 'today' | 'planned' | 'missed' | 'free';

export interface LearningDay {
  /** 'YYYY-MM-DD' */
  date: string;
  status: LearningDayStatus;
  /** Buổi học đầu tiên trong ngày (lịch loại 'skill'). */
  eventId: string | null;
  title: string | null;
  hours: number;
  tag: SkillTag | null;
}

export type CareerBand = 'great' | 'good' | 'fair' | 'weak';
export type CareerActionKey = 'reduce_risk' | 'boost_income' | 'personal_brand' | 'start_learning';

export interface EarnDashboard {
  /** Tháng lấy số liệu nguồn thu 'YYYY-MM'. */
  month: string;
  income: { total: number; sources: IncomeSource[] };
  /** Cơ hội tăng thu nhập (làm thêm) — xếp theo mức phù hợp. */
  opportunities: Opportunity[];
  /** Việc làm & làm thêm phù hợp. */
  jobs: Opportunity[];
  roadmap: RoadmapItem[];
  week: { days: LearningDay[]; plannedHours: number; doneHours: number };
  career: HumanCapitalResult & { band: CareerBand; actions: CareerActionKey[] };
}
