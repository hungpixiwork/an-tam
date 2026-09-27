// B2 — vốn con người theo mức phơi nhiễm AI (breakthroughs.md §B2).
//   HC = Σ_{t=1..T} I·(1+g)^t / (1+r+π)^t
// T = tuổi nghỉ hưu − tuổi; g theo ngành; r không rủi ro; π theo mức phơi nhiễm AI (ILO WP140: 0–4 → 1–5%).
// Chữ ký đã chốt ở Wave 0. TODO Wave 1 · C: bảng ~30 nghề ISCO-08 trong shared/data/ilo-exposure.ts,
// g theo nhóm nghề, "giờ học thành giá trị" chi tiết. Mọi con số là ƯỚC TÍNH — không phải lời hứa tăng lương.

import type { Sector } from '../types/domain';
import type { ExposureLevel, HumanCapitalInput, HumanCapitalResult } from '../types/api';

/** Lãi suất không rủi ro VND / năm (ƯỚC TÍNH, khớp giả định tiền mặt ở portfolio.ts). */
export const RISK_FREE = 0.045;
/** π theo mức phơi nhiễm ILO 0..4. */
export const EXPOSURE_PI = [0.01, 0.02, 0.03, 0.04, 0.05] as const;
/** Tốc độ tăng thu nhập theo ngành (ƯỚC TÍNH). */
export const SECTOR_GROWTH: Record<Sector, number> = {
  technology: 0.07,
  finance: 0.06,
  real_estate: 0.05,
  manufacturing: 0.045,
  consumer: 0.045,
  healthcare: 0.055,
  education_public: 0.04,
  other: 0.05,
};
/** Ngưỡng giờ học / tuần để tính là "đang nâng kỹ năng": g +1 điểm %, π giảm một mức. */
export const SKILL_HOURS_THRESHOLD = 3;

/** Mức phơi nhiễm ILO (0..4) theo nhóm nghề ISCO-08 cấp 1 — tạm thời cho tới khi có bảng chi tiết. */
const ISCO_MAJOR_LEVEL: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3': 2, '4': 4, '5': 1, '6': 0, '7': 0, '8': 1, '9': 1 };
const DEFAULT_LEVEL = 2;

export function exposureLevelFor(iscoCode?: string): number {
  const major = iscoCode?.trim()[0];
  return major !== undefined && major in ISCO_MAJOR_LEVEL ? ISCO_MAJOR_LEVEL[major] : DEFAULT_LEVEL;
}

const levelLabel = (level: number): ExposureLevel => (level <= 1 ? 'low' : level === 2 ? 'medium' : 'high');

/** Giá trị hiện tại của dòng thu nhập tăng g/năm, chiết khấu r+π, trong `years` năm. */
export function presentValueIncome(annualIncome: number, g: number, discount: number, years: number): number {
  let pv = 0;
  const q = (1 + g) / (1 + discount);
  let f = 1;
  for (let t = 1; t <= years; t++) {
    f *= q;
    pv += annualIncome * f;
  }
  return pv;
}

export function humanCapital(input: HumanCapitalInput): HumanCapitalResult {
  const income = Math.max(0, input.annualIncome);
  const years = Math.max(0, Math.floor(input.retirementAge - input.age));
  const baseLevel = exposureLevelFor(input.iscoCode);
  const upskilling = (input.skillHoursPerWeek ?? 0) >= SKILL_HOURS_THRESHOLD;
  const level = upskilling ? Math.max(0, baseLevel - 1) : baseLevel;
  const g = SECTOR_GROWTH[input.sector ?? 'other'] + (upskilling ? 0.01 : 0);
  const pi = EXPOSURE_PI[level];
  const hc = Math.round(presentValueIncome(income, g, RISK_FREE + pi, years));

  // Giá trị nghề 0..100: nền 60, trừ theo phơi nhiễm, cộng theo thời gian còn đi làm và giờ học (ƯỚC TÍNH)
  const skillBonus = Math.min(15, (input.skillHoursPerWeek ?? 0) * 1.5);
  const horizonBonus = Math.min(15, years / 2);
  const careerScore = years === 0 ? 0 : Math.round(Math.min(100, Math.max(0, 70 - level * 7 + horizonBonus + skillBonus)));

  const explain = [
    `Còn khoảng ${years} năm đi làm; thu nhập giả định tăng ${(g * 100).toFixed(1)}%/năm.`,
    `Mức phơi nhiễm AI ${baseLevel}/4 (ILO) → mức bất định ${(EXPOSURE_PI[baseLevel] * 100).toFixed(0)}%/năm. Phơi nhiễm không có nghĩa là mất việc.`,
  ];
  if (upskilling) explain.push(`Học kỹ năng ≥ ${SKILL_HOURS_THRESHOLD} giờ/tuần: mức bất định giảm một bậc (ước tính).`);
  explain.push('Đây là ước tính, không phải lời hứa tăng lương.');

  return { hc, exposureLevel: levelLabel(baseLevel), exposurePct: baseLevel * 25, careerScore, explain, g, pi, years };
}
