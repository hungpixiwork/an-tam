// "Phân bổ nguồn lực cuộc sống": 3 vòng Tài chính / Thời gian / Kỹ năng (0..100, null = chưa có dữ liệu).

import type { TimeAllocation } from '../types/domain';

/** Giờ ngủ tối thiểu mỗi tuần được xem là đủ (7 giờ/đêm). */
export const HEALTHY_SLEEP_HOURS = 49;
/** Giờ mỗi tuần dành cho học tập + nguồn thu phụ được xem là "đầu tư cho tương lai" đủ tốt (2 giờ/ngày). */
export const GROWTH_HOURS_TARGET = 14;
const WEEK_HOURS = 168;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Điểm thời gian (0..100):
 * 30 điểm — tỷ lệ giờ trong tuần đã có kế hoạch;
 * 30 điểm — ngủ đủ (≥ 49 giờ/tuần);
 * 40 điểm — giờ học tập + làm thêm so với mốc 14 giờ/tuần.
 */
export function timeScore(allocations: TimeAllocation[]): number | null {
  const planned = allocations.filter((a) => a.category !== 'unallocated');
  if (!planned.some((a) => a.hours > 0)) return null;
  const hours = (c: TimeAllocation['category']) => allocations.filter((a) => a.category === c).reduce((s, a) => s + a.hours, 0);
  const coverage = planned.reduce((s, a) => s + a.hours, 0) / WEEK_HOURS;
  const sleep = hours('sleep') / HEALTHY_SLEEP_HOURS;
  const growth = (hours('learning') + hours('side_income')) / GROWTH_HOURS_TARGET;
  return Math.round(30 * clamp01(coverage) + 30 * clamp01(sleep) + 40 * clamp01(growth));
}

/**
 * Điểm kỹ năng (0..100): số giờ học/làm việc giá trị thực tế trung bình mỗi tuần (các tuần gần nhất)
 * so với số giờ người dùng tự đặt mỗi tuần. null khi chưa đặt số giờ mục tiêu.
 */
export function skillScore(weeklyActualHours: number[], targetHoursPerWeek: number): number | null {
  if (!(targetHoursPerWeek > 0)) return null;
  const avg = weeklyActualHours.length ? weeklyActualHours.reduce((s, h) => s + h, 0) / weeklyActualHours.length : 0;
  return Math.round(100 * clamp01(avg / targetHoursPerWeek));
}

export interface ResourceRings {
  finance: number | null;
  time: number | null;
  skill: number | null;
}

export function resourceRings(input: {
  peaceScore: number | null;
  allocations: TimeAllocation[];
  weeklyActualHours: number[];
  targetHoursPerWeek: number;
}): ResourceRings {
  return {
    finance: input.peaceScore,
    time: timeScore(input.allocations),
    skill: skillScore(input.weeklyActualHours, input.targetHoursPerWeek),
  };
}
