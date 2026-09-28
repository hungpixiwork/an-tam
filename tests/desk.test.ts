import { describe, expect, it } from 'vitest';
import { deskRisk, type DeskRiskInput } from '../shared/engine/deskRisk';
import type { DeskAnalystReport } from '../shared/types/api/desk';
import { codeVerdict } from '../worker/desk/analysts';
import { hasTechnicalDesk } from '../worker/desk/pipeline';

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

describe('bàn phân tích vàng', () => {
  it('bỏ kỹ thuật cho mọi loại vàng và kết luận được khi không có chỉ số kỹ thuật', () => {
    expect(hasTechnicalDesk('SJC', null)).toBe(false);
    expect(hasTechnicalDesk('XAU', 'gold_world')).toBe(false);
    expect(hasTechnicalDesk('FPT', 'stock')).toBe(true);
    const analysts: DeskAnalystReport[] = [
      { key: 'news', label: 'Tin tức', score: 1, facts: [{ text: 'Tin tích cực', tone: 'good' }], note: '', available: true },
      { key: 'fundamentals', label: 'Cơ bản', score: 1, facts: [], note: '', available: true },
      { key: 'macro', label: 'Vĩ mô', score: 0, facts: [], note: '', available: true },
    ];
    const verdict = codeVerdict(analysts, null);
    expect(verdict.trend).toBe('tang');
    expect(verdict.risk).toBe('vua');
    expect(verdict.reasons).toContain('Tin tích cực');
  });
});
