// Test Suite kiểm thử toàn bộ ma trận nghiệm thu (Acceptance Test Matrix) từ Uyên
// Đối chiếu 1-1 với Sheet 08_Test_Matrix (Issues #1 đến #7).

import { describe, it, expect } from 'vitest';
import {
  FIXTURE_A,
  FIXTURE_B,
  FIXTURE_C,
  FIXTURE_C_GOALS,
  FIXTURE_C_LEDGER,
} from '../shared/data/canonicalFixtures';
import {
  whatIfAllocate,
  computeTechExposure,
  computeCareerOverlap,
} from '../shared/engine/concentration';
import { effectiveProfile } from '../shared/engine/ledger';
import { emergencyMonths, peaceScore, postDebtSavingsCapacity, totalDebtService } from '../shared/engine/peace';
import { humanCapital, presentValueIncome, RISK_FREE } from '../shared/engine/humanCapital';
import { evaluateLifeChoice } from '../shared/engine/lifeChoice';
import { netWorthBreakdown } from '../shared/engine/overview';

describe('Uyên Acceptance Test Matrix (Sheet 08)', () => {
  const hcFixtureC = 4782.942856; // FA 35 years

  // -------------------------------------------------------------
  // ISSUE #1 & #5: Investment Decision & Reallocation
  // -------------------------------------------------------------
  describe('Issue #1 & #5 — Thử trước khi đầu tư & Rủi ro tập trung', () => {
    it('I1-01: Fixture C baseline metrics', () => {
      const invest = FIXTURE_C.holdings.filter((h) => h.inPortfolio);
      const investTotal = invest.reduce((s, h) => s + h.value, 0); // 320m
      expect(investTotal).toBe(320_000_000);

      const employerVal = FIXTURE_C.holdings.find((h) => h.isEmployerStock)?.value ?? 0;
      const employerShare = employerVal / investTotal;
      expect(employerShare).toBeCloseTo(0.35, 2); // 35.00%

      const techExp = computeTechExposure(invest, 'technology');
      // 112m + 128m * 0.3022 = 150.6816m
      expect(techExp).toBeCloseTo(150_681_600, 0);

      const techShare = techExp / investTotal;
      expect(techShare).toBeCloseTo(0.47088, 4); // 47.09%

      const grossAssets = 404_000_000;
      const hcSheet02 = 1000_000_000; // Fixture estimate parameter from Sheet 02 R20
      const overlap = computeCareerOverlap(hcSheet02, 0.7, techExp, grossAssets);
      expect(overlap).toBeCloseTo(0.6059, 3); // 60.59%
    });

    it('I1-02: Cash 32m -> ETF 32m (Tài sản bảo toàn, Tech share tăng nhẹ)', () => {
      const res = whatIfAllocate(FIXTURE_C, {
        assetType: 'fund',
        sector: 'other',
        amount: 32_000_000,
        holdingMonths: 36,
        sourceOfFunds: 'investable_cash',
        humanCapital: hcFixtureC * 1_000_000,
        careerBeta: 0.7,
        diversified: true,
      });

      expect(res.status).toBe('ok');
      expect(res.moneyConserved).toBe(true);
      expect(res.funding.fromPortfolioCash).toBe(32_000_000);
      expect(res.deltas.runwayMonths).toBe(0); // Quỹ dự phòng giữ nguyên 6 tháng
    });

    it('I1-03: Employer 40m -> ETF 40m (Giảm tỷ trọng cổ phiếu công ty & giảm chồng lấn)', () => {
      const res = whatIfAllocate(FIXTURE_C, {
        assetType: 'fund',
        sector: 'other',
        amount: 40_000_000,
        holdingMonths: 36,
        sourceOfFunds: 'sell_holding',
        sourceHoldingId: 'h-employer-stock',
        humanCapital: hcFixtureC * 1_000_000,
        careerBeta: 0.7,
        diversified: true,
      });

      expect(res.status).toBe('ok');
      expect(res.deltas.employerShare).toBeCloseTo(-0.125, 3); // Giảm 12.5%
      expect(res.deltas.careerOverlap).toBeLessThan(0); // Chồng lấn giảm
    });

    it('I1-04: Emergency 40m -> ETF 40m (Số tháng an toàn giảm rõ ràng)', () => {
      const res = whatIfAllocate(FIXTURE_C, {
        assetType: 'fund',
        sector: 'other',
        amount: 40_000_000,
        holdingMonths: 36,
        sourceOfFunds: 'emergency_reserve',
        humanCapital: hcFixtureC * 1_000_000,
        careerBeta: 0.7,
        diversified: true,
      });

      expect(res.status).toBe('ok');
      expect(res.after.runwayMonths).toBeCloseTo(3.1, 1); // 44 / 14 = 3.14 tháng
      expect(res.deltas.runwayMonths).toBeCloseTo(-2.9, 1);
    });

    it('I5-01: Employer 50m -> ETF 50m', () => {
      const res = whatIfAllocate(FIXTURE_C, {
        assetType: 'fund',
        sector: 'other',
        amount: 50_000_000,
        holdingMonths: 36,
        sourceOfFunds: 'sell_holding',
        sourceHoldingId: 'h-employer-stock',
        humanCapital: hcFixtureC * 1_000_000,
        careerBeta: 0.7,
        diversified: true,
      });

      expect(res.status).toBe('ok');
      expect(res.after.employerShare).toBeCloseTo(62_000_000 / 320_000_000, 3); // 19.38%
    });

    it('I5-02: Yêu cầu 50m từ tiền mặt khả dụng (chỉ có 32m) -> insufficient_funds với shortfall = 18m', () => {
      const res = whatIfAllocate(FIXTURE_C, {
        assetType: 'fund',
        sector: 'other',
        amount: 50_000_000,
        holdingMonths: 36,
        sourceOfFunds: 'investable_cash',
        humanCapital: hcFixtureC * 1_000_000,
      });

      expect(res.status).toBe('insufficient_funds');
      expect(res.shortfall).toBe(18_000_000);
      expect(res.funding.newMoney).toBe(0); // Không tạo tiền ảo
    });
  });

  // -------------------------------------------------------------
  // ISSUE #2: Canonical Data Fixtures & Invariants
  // -------------------------------------------------------------
  describe('Issue #2 — Canonical Fixtures A/B/C & Earmarks', () => {
    it('I2-01: Fixture A rỗng -> không sinh ra số liệu ảo', () => {
      const eff = effectiveProfile(FIXTURE_A.profile, FIXTURE_A.ledger, FIXTURE_A.today);
      expect(eff.incomeSource).toBe('none');
      expect(eff.expenseSource).toBe('none');
    });

    it('I2-02: Fixture B chỉ có thu nhập nền', () => {
      const eff = effectiveProfile(FIXTURE_B.profile, FIXTURE_B.ledger, FIXTURE_B.today);
      expect(eff.profile.monthlyIncome).toBe(28_500_000);
      expect(eff.profile.monthlyExpense).toBe(0);
      expect(eff.incomeSource).toBe('baseline');
      expect(eff.expenseSource).toBe('none');
    });

    it('I2-03: Fixture C đầy đủ -> Tài sản 404m, Nợ 60m, Tài sản ròng 344m', () => {
      const nw = netWorthBreakdown(FIXTURE_C);
      expect(nw.totalAssets).toBe(404_000_000);
      expect(nw.debt).toBe(60_000_000);
      expect(nw.net).toBe(344_000_000); // 404 - 60 = 344m
    });

    it('I2-04 & I2-05: Tiền mục tiêu (180m) và Quỹ dự phòng (84m) không bị cộng trùng vào tài sản ròng', () => {
      const nw = netWorthBreakdown(FIXTURE_C);
      // Tổng tài sản = 84 + 32 + 112 + 128 + 48 = 404m. Mục tiêu 180m nằm trong tài sản, không cộng thêm 180m nữa
      expect(nw.totalAssets).toBe(404_000_000);
    });
  });

  // -------------------------------------------------------------
  // ISSUE #3: Ledger & Source Priority
  // -------------------------------------------------------------
  describe('Issue #3 — Sổ thu chi & Ưu tiên nguồn', () => {
    it('I3-01: 3 tháng đã hoàn thành trong sổ -> Lấy trung bình 3 tháng (28.5m thu, 18.5m chi)', () => {
      const eff = effectiveProfile(FIXTURE_C.profile, FIXTURE_C_LEDGER, FIXTURE_C.today);
      expect(eff.profile.monthlyIncome).toBe(28_500_000);
      expect(eff.profile.monthlyExpense).toBe(18_500_000);
      expect(eff.incomeSource).toBe('ledger');
      expect(eff.expenseSource).toBe('ledger');
      expect(eff.ledgerMonths).toBe(3);
    });
  });

  // -------------------------------------------------------------
  // ISSUE #4: Safety, Debt Flow & Peace Score
  // -------------------------------------------------------------
  describe('Issue #4 — Quỹ an toàn, Dòng nợ & Điểm An Tâm', () => {
    it('I4-01: Số tháng an toàn chia cho Chi phí thiết yếu: 84m / 14m = 6.0 tháng', () => {
      const months = emergencyMonths(FIXTURE_C);
      expect(months).toBe(6.0);
    });

    it('I4-02: Dòng tiền sau nợ = 28.5 - 18.5 - 2 = 8.0 triệu / tháng (Tỷ lệ để dành 28.07%)', () => {
      const debt = totalDebtService(FIXTURE_C);
      expect(debt).toBe(2_000_000);

      const postDebtCap = postDebtSavingsCapacity(FIXTURE_C);
      expect(postDebtCap).toBe(8_000_000);

      const savingsRate = postDebtCap / 28_500_000;
      expect(savingsRate).toBeCloseTo(0.2807, 4);
    });

    it('I4-03: Điểm An Tâm Fixture C đạt ~63.51 điểm (Mức: Cần chú ý)', () => {
      // Dùng profile sau khi đã qua sổ thu chi
      const eff = effectiveProfile(FIXTURE_C.profile, FIXTURE_C_LEDGER, FIXTURE_C.today);
      const stateWithEff = { ...FIXTURE_C, profile: eff.profile };
      const peace = peaceScore(stateWithEff);
      console.log('PEACE FACTORS:', peace.factors, 'TOTAL SCORE:', peace.score);

      expect(peace.score).toBeGreaterThanOrEqual(60);
      expect(peace.score).toBeLessThanOrEqual(70);
      expect(peace.level).toBe('watch');
    });
  });

  // -------------------------------------------------------------
  // ISSUE #6: Human Capital, ISCO & ILO Exposure
  // -------------------------------------------------------------
  describe('Issue #6 — Vốn con người & Mức phơi nhiễm AI ILO', () => {
    it('I6-01: Chuyên viên tài chính (ISCO 2413) -> ILO Group 4, π = 5%', () => {
      const res = humanCapital({
        annualIncome: 342_000_000,
        age: 30,
        retirementAge: 65,
        iscoCode: '2413',
        sector: 'finance',
      });
      expect(res.pi).toBe(0.05);
    });

    it('I6-02: Kỹ sư phần mềm (ISCO 2512) -> ILO Group 3, π = 4%', () => {
      const res = humanCapital({
        annualIncome: 342_000_000,
        age: 30,
        retirementAge: 65,
        iscoCode: '2512',
        sector: 'technology',
      });
      expect(res.pi).toBe(0.04);
    });

    it('I6-03: FA T=35 tuổi (30 -> 65), thu nhập 342tr/năm -> HC ~ 4,783 triệu', () => {
      const pv = presentValueIncome(342_000_000, 0.03, RISK_FREE + 0.05, 35);
      expect(pv / 1_000_000).toBeCloseTo(4782.94, 1);
    });

    it('I6-04: FA T=10 tuổi (55 -> 65) -> HC ~ 2,481 triệu', () => {
      const pv = presentValueIncome(342_000_000, 0.03, RISK_FREE + 0.05, 10);
      expect(pv / 1_000_000).toBeCloseTo(2480.51, 1);
    });

    it('I6-05: Software Developer T=35 (π = 4%) -> HC ~ 5,368 triệu', () => {
      const pv = presentValueIncome(342_000_000, 0.03, RISK_FREE + 0.04, 35);
      expect(pv / 1_000_000).toBeCloseTo(5367.77, 1);
    });

    it('I6-11: Kịch bản nâng cao kỹ năng (π giảm 5% -> 4%) -> HC tăng ~12.23%', () => {
      const before = presentValueIncome(342_000_000, 0.03, RISK_FREE + 0.05, 35);
      const after = presentValueIncome(342_000_000, 0.03, RISK_FREE + 0.04, 35);
      const uplift = (after - before) / before;
      expect(uplift).toBeCloseTo(0.1223, 3);
    });

    it('I6-12: T = 0 (tuổi >= tuổi nghỉ hưu) -> HC = 0', () => {
      const res = humanCapital({
        annualIncome: 342_000_000,
        age: 65,
        retirementAge: 65,
        iscoCode: '2413',
      });
      expect(res.hc).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // ISSUE #7: Life Choice / Decision Simulation
  // -------------------------------------------------------------
  describe('Issue #7 — Lựa chọn cuộc đời & Cổng phê duyệt', () => {
    const studyOption = {
      title: 'Học thạc sĩ chuyển ngành',
      cost: 120_000_000,
      otherCost: 0,
      durationMonths: 18,
      monthsWithoutIncome: 18,
      monthlyIncomeDelta: -28_500_000,
    };

    it('I7-01: Canonical C baseline (Mục tiêu nhà 500m, xác suất < 50%) -> Không được trả về "go" (kham nổi)', () => {
      const ev = evaluateLifeChoice(FIXTURE_C, studyOption, {
        kind: 'study',
        incomeUpliftPct: 20,
        prereqsDone: 0,
        prereqsTotal: 2,
      });

      expect(ev.verdict).not.toBe('go');
    });

    it('I7-04: C-LIFE Vừa học vừa làm (Thu nhập còn 24m) -> Đạt "go" khi mục tiêu đảm bảo và dòng tiền không âm', () => {
      // Dựng C-LIFE: mục tiêu mua nhà 450m (xác suất đạt 71.9%)
      const cLifeGoals = FIXTURE_C_GOALS.map((g) => (g.kind === 'home' ? { ...g, targetAmount: 450_000_000 } : g));
      const stateCLife = { ...FIXTURE_C, goals: cLifeGoals };

      const workStudyOption = {
        title: 'Vừa học vừa làm',
        cost: 120_000_000,
        otherCost: 0,
        durationMonths: 18,
        monthsWithoutIncome: 0,
        monthlyIncomeDelta: -4_500_000, // thu nhập còn 24tr/tháng
      };

      const ev = evaluateLifeChoice(stateCLife, workStudyOption, {
        kind: 'study',
        incomeUpliftPct: 20,
        prereqsDone: 2,
        prereqsTotal: 2,
      });

      expect(ev.verdict).toBe('go');
    });
  });
});
