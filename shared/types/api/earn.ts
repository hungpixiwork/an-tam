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
