import type { Sector } from '../types/domain';

export const RISK_FREE_RATE = 0.045; // 4.5%/năm

export const CAREER_BETA: Record<Sector, number> = {
  technology: 1.25,
  finance: 1.15,
  real_estate: 1.3,
  manufacturing: 0.9,
  consumer: 0.85,
  healthcare: 0.6,
  education_public: 0.5,
  other: 1.0,
};

/**
 * Định giá Vốn Con Người (Human Capital) — Chiết khấu dòng tiền thu nhập tương lai đến tuổi nghỉ hưu.
 */
export function calculateHumanCapital(
  monthlyIncome: number,
  currentAge: number,
  retirementAge = 60,
  sector: Sector = 'technology',
  wageGrowth = 0.03,
): number {
  const years = Math.max(1, retirementAge - currentAge);
  const annualIncome = monthlyIncome * 12;
  const beta = CAREER_BETA[sector] || 1.0;
  const discountRate = RISK_FREE_RATE + (beta - 1) * 0.02;

  let presentValue = 0;
  for (let t = 1; t <= years; t++) {
    const futureIncome = annualIncome * Math.pow(1 + wageGrowth, t - 1);
    const discounted = futureIncome / Math.pow(1 + discountRate, t);
    presentValue += discounted;
  }

  return Math.round(presentValue);
}

/**
 * Tính toán Rủi ro trùng lặp nghề nghiệp (Career Overlap & Tech Exposure).
 */
export function calculateCareerOverlap(
  humanCapital: number,
  careerBeta: number,
  techAssetValue: number,
  grossFinancialAssets: number,
): { techExposureRatio: number; careerOverlapScore: number } {
  const totalWealth = humanCapital + grossFinancialAssets;
  const techExposureRatio = grossFinancialAssets > 0 ? techAssetValue / grossFinancialAssets : 0;
  
  // Mức độ rủi ro liên hoàn khi vừa làm ngành tech vừa nắm giữ nhiều tài sản tech
  const weightedTech = (humanCapital * (careerBeta / 1.5) + techAssetValue) / Math.max(1, totalWealth);
  const careerOverlapScore = Math.min(1, Math.max(0, weightedTech));

  return {
    techExposureRatio: Math.round(techExposureRatio * 10000) / 100,
    careerOverlapScore: Math.round(careerOverlapScore * 10000) / 100,
  };
}

/**
 * Tính số tháng sống an toàn của Quỹ dự phòng (Runway).
 */
export function calculateRunway(cash: number, essentialMonthlyExpense: number): number {
  if (essentialMonthlyExpense <= 0) return 999;
  return Math.round((cash / essentialMonthlyExpense) * 10) / 10;
}
