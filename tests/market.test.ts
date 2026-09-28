import { describe, expect, it } from 'vitest';
import { evaluateMarketAlerts } from '../shared/engine/marketAlerts';
import { rsi, sma } from '../shared/engine/technical';
import type { Holding } from '../shared/types/domain';
import type { Quote } from '../shared/types/market';

const gold: Holding = {
  id: 'g', name: 'Vàng SJC', category: 'other', value: 141_400_000, role: 'An toàn', volatility: 'mid', riskGroup: 'gold', isMain: true, symbol: 'SJC', quantity: 1,
};
const sjc = (changePct: number): Quote => ({ symbol: 'SJC', kind: 'gold_vn', price: 137_000_000, changePct, asOf: '2026-09-28T02:15:00Z', source: 'sjc' });
const run = (prices: Quote[], breadth: Parameters<typeof evaluateMarketAlerts>[0]['breadth'] = null) =>
  evaluateMarketAlerts({ prices, breadth, holdings: [gold], rules: [] });

describe('evaluateMarketAlerts', () => {
  it('vàng giảm 3% → cảnh báo kèm số tiền tài sản giảm', () => {
    const [a] = run([sjc(-3)]);
    expect(a.ruleKey).toBe('market:gold_drop');
    expect(a.affectedVnd).toBe(-4_242_000);
    expect(a.body).toContain('giảm khoảng 4,2 triệu');
    expect(a.body).not.toContain('Nguồn');
  });

  it('vàng giảm 1% → không báo', () => {
    expect(run([sjc(-1)])).toEqual([]);
  });

  it('thị trường đỏ cần cả chỉ số giảm ≥ 1% và số mã giảm > 1,5 × số mã tăng', () => {
    const idx: Quote = { symbol: 'VNINDEX', kind: 'index', price: 1760, changePct: -1.2, asOf: '2026-09-28T07:00:00Z', source: 'ssi' };
    const breadth = (adv: number, dec: number) => ({ day: '2026-09-28', indexValue: 1760, indexChangePct: -1.2, advancers: adv, decliners: dec, asOf: idx.asOf, source: 'ssi' });
    expect(run([idx], breadth(80, 250)).map((a) => a.ruleKey)).toEqual(['market:market_red']);
    expect(run([idx], breadth(150, 200))).toEqual([]);
    expect(run([idx])).toEqual([]); // thiếu độ rộng → cần ≤ -1,5%
  });
});

describe('technical', () => {
  it('sma / rsi', () => {
    expect(sma([1, 2, 3, 4], 2)).toBe(3.5);
    const up = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(rsi(up)).toBe(100);
    expect(rsi(up.map((x) => 300 - x))).toBe(0);
  });
});
