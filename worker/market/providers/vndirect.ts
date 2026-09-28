// VNDirect: giá cổ phiếu (api-finfo, chính) và nến ngày dchart (lịch sử + dự phòng VN-Index).
// Giá cổ phiếu tính bằng nghìn đồng → × 1.000.

import type { Bar } from '../../../shared/types/market';
import type { HistoryProvider, MarketProvider } from '../types';
import { getJson, perKey, vnClock, vnDateToIso } from '../http';

interface FinfoRow { code: string; date: string; time: string; close: number; basicPrice: number; pctChange: number }

export const vndirectStock: MarketProvider = {
  id: 'vndirect',
  kinds: ['stock'],
  fetch: (keys) =>
    perKey(keys, async (symbol) => {
      const j = await getJson<{ data: FinfoRow[] }>(`https://api-finfo.vndirect.com.vn/v4/stock_prices?sort=date&q=code:${encodeURIComponent(symbol)}&size=1`);
      const r = j.data?.[0];
      if (!r || r.code !== symbol) return null;
      const [y, mo, d] = r.date.split('-').map(Number);
      const [h, mi, s] = (r.time ?? '15:00:00').split(':').map(Number);
      return {
        symbol, kind: 'stock' as const, price: Math.round(r.close * 1000), prevClose: Math.round(r.basicPrice * 1000),
        changePct: r.pctChange, asOf: vnDateToIso(y, mo, d, h, mi, s), source: 'vndirect',
      };
    }),
};

async function dchart(symbol: string, days: number): Promise<Bar[]> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 86_400;
  const j = await getJson<{ s?: string; t: number[]; c: number[] }>(
    `https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}`,
  );
  if (!j.t?.length) throw new Error(`dchart: không có dữ liệu ${symbol}`);
  const mult = symbol === 'VNINDEX' ? 1 : 1000;
  return j.t.map((t, i) => ({ symbol, day: vnClock(new Date(t * 1000)).day, close: Math.round(j.c[i] * mult * 100) / 100 }));
}

export const vndirectHistory: HistoryProvider = { id: 'vndirect', history: dchart };

/** Dự phòng VN-Index: chỉ có điểm và % thay đổi, không có số mã tăng / giảm. */
export const vndirectIndex: MarketProvider = {
  id: 'vndirect',
  kinds: ['index'],
  async fetch(keys) {
    if (!keys.includes('VNINDEX')) return [];
    const bars = await dchart('VNINDEX', 10);
    const last = bars[bars.length - 1];
    const prev = bars[bars.length - 2];
    return [{
      symbol: 'VNINDEX', kind: 'index', price: last.close, prevClose: prev?.close ?? null,
      changePct: prev ? ((last.close - prev.close) / prev.close) * 100 : null,
      asOf: new Date().toISOString(), source: 'vndirect',
    }];
  },
};
