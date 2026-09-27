import { describe, expect, it } from 'vitest';
import { concentrationIndex, employerStockWeight, hhi, sectorExposure, whatIfAllocate } from '../shared/engine/concentration';
import { humanCapital } from '../shared/engine/humanCapital';
import type { Holding } from '../shared/types/domain';
import { demoState } from './fixtures';

const M = 1_000_000;
const h = (id: string, value: number, extra: Partial<Holding> = {}): Holding => ({
  id, name: id, category: 'stock', value, role: 'x', volatility: 'high', riskGroup: 'g', isMain: false, ...extra,
});

describe('concentration (B4)', () => {
  it('hhi / concentrationIndex', () => {
    expect(hhi([])).toBe(0);
    expect(hhi([1])).toBe(1);
    expect(hhi([1, 1])).toBeCloseTo(0.5);
    expect(concentrationIndex([])).toBe(0);
    expect(concentrationIndex([5])).toBe(100);
    expect(concentrationIndex([1, 1, 1, 1])).toBe(0);
    expect(concentrationIndex([9, 1])).toBeGreaterThan(concentrationIndex([6, 4]));
  });

  it('employerStockWeight', () => {
    expect(employerStockWeight([])).toBe(0);
    expect(employerStockWeight([h('a', 35 * M, { isEmployerStock: true }), h('b', 65 * M)])).toBeCloseTo(0.35);
  });

  it('C_s ∈ [0,1]; cổ phiếu thưởng tăng C_s ngành nghề đúng bằng tỷ trọng của nó', () => {
    const base = [h('a', 100 * M, { sector: 'other' }), h('b', 100 * M, { sector: 'finance' })];
    const ctx = { humanCapital: 200 * M, occupationSector: 'technology' as const };
    const before = sectorExposure({ holdings: base, ...ctx });
    const after = sectorExposure({ holdings: [{ ...base[0], isEmployerStock: true }, base[1]], ...ctx });
    for (const e of [...before, ...after]) expect(e.share).toBeGreaterThanOrEqual(0), expect(e.share).toBeLessThanOrEqual(1);
    const tech = (xs: typeof before) => xs.find((x) => x.sector === 'technology')!.share;
    expect(tech(before)).toBeCloseTo(0.5);
    expect(tech(after) - tech(before)).toBeCloseTo(100 / 400);
    expect(after[0]).toMatchObject({ sector: 'technology', level: 'high' });
  });

  it('thêm tài sản khác ngành làm giảm C_s ngành mình', () => {
    const ctx = { annualIncome: 20 * M, occupationSector: 'technology' as const };
    const s1 = sectorExposure({ holdings: [h('a', 100 * M, { sector: 'technology' })], ...ctx })[0].share;
    const s2 = sectorExposure({ holdings: [h('a', 100 * M, { sector: 'technology' }), h('b', 100 * M, { sector: 'healthcare' })], ...ctx }).find((x) => x.sector === 'technology')!.share;
    expect(s2).toBeLessThan(s1);
  });

  it('whatIfAllocate: bỏ thêm tiền vào cổ phiếu công nghệ → phụ thuộc ngành tăng, runway giảm; tất định', () => {
    const state = demoState();
    const input = { assetType: 'stock' as const, sector: 'technology' as const, amount: 200 * M, holdingMonths: 12, occupationSector: 'technology' as const, annualIncome: 300 * M };
    const r = whatIfAllocate(state, input);
    expect(r.after.sectorShare).toBeGreaterThan(r.before.sectorShare);
    expect(r.after.runwayMonths).toBeLessThanOrEqual(r.before.runwayMonths);
    expect(r.projected.worstCase).toBeLessThanOrEqual(r.projected.expected);
    expect(r.explain.length).toBeGreaterThan(0);
    expect(whatIfAllocate(state, input)).toEqual(r);
  });
});

describe('humanCapital (B2)', () => {
  const base = { annualIncome: 300 * M, age: 30, retirementAge: 60, iscoCode: '2512', sector: 'technology' as const };

  it('T ≤ 0 → HC = 0', () => {
    expect(humanCapital({ ...base, age: 60 }).hc).toBe(0);
    expect(humanCapital({ ...base, age: 65 }).hc).toBe(0);
  });

  it('π tăng (phơi nhiễm cao hơn) → HC giảm', () => {
    const low = humanCapital({ ...base, iscoCode: '7' }); // thợ thủ công: mức 0
    const high = humanCapital({ ...base, iscoCode: '4110' }); // nhân viên văn phòng: mức 4
    expect(low.exposureLevel).toBe('low');
    expect(high.exposureLevel).toBe('high');
    expect(high.hc).toBeLessThan(low.hc);
  });

  it('học kỹ năng ≥ 3 giờ/tuần tăng HC; kết quả tất định, số nguyên', () => {
    const r = humanCapital(base);
    const skilled = humanCapital({ ...base, skillHoursPerWeek: 5 });
    expect(skilled.hc).toBeGreaterThan(r.hc);
    expect(Number.isInteger(r.hc)).toBe(true);
    expect(r.careerScore).toBeGreaterThanOrEqual(0);
    expect(r.careerScore).toBeLessThanOrEqual(100);
    expect(humanCapital(base)).toEqual(r);
    expect(r.explain.join(' ')).toMatch(/ước tính/i);
  });
});
