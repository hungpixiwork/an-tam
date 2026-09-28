import { describe, expect, it } from 'vitest';
import { deskRisk, type DeskRiskInput } from '../shared/engine/deskRisk';

const base: DeskRiskInput = {
  symbol: 'FPT', name: 'Cổ phiếu FPT', verdict: { trend: 'giam', risk: 'cao' },
  holdingVnd: 300_000_000, totalAssetsVnd: 1_000_000_000, monthlyExpense: 20_000_000, liquidVnd: 500_000_000,
  holdingIsLiquid: true, emergencyMonths: 6, goals: [], sameSectorAsJob: false, month: '2026-09', day: '2026-09-28',
};

describe('deskRisk', () => {
  it('giảm / rủi ro cao: tỷ trọng lớn → cân nhắc giảm, tỷ trọng nhỏ → bình tĩnh; không khuyên mua', () => {
    const big = deskRisk(base);
    expect(big.stance).toBe('can_nhac_giam');
    expect(big.impactVnd).toBe(-60_000_000);
    expect(big.suggestedActions.map((a) => a.type)).toEqual(['reminder.create', 'alert_rule.create']);
    const small = deskRisk({ ...base, holdingVnd: 20_000_000 });
    expect(small.stance).toBe('binh_tinh');
    expect(small.suggestedActions).toEqual([]);
    expect(big.text + small.text).not.toMatch(/\bmua\b/i);
  });
});
