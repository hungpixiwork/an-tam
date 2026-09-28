// SSI iBoard: VN-Index + số mã tăng / giảm (nguồn duy nhất có độ rộng), và lịch sử giá ngày (dự phòng cho cổ phiếu).

import type { Bar, Breadth } from '../../../shared/types/market';
import type { BreadthProvider, HistoryProvider, MarketProvider } from '../types';
import { getJson, perKey, vnClock } from '../http';

const HEADERS = { Referer: 'https://iboard.ssi.com.vn/', Origin: 'https://iboard.ssi.com.vn' };

interface SsiIndex {
  indexValue: number; prevIndexValue: number; changePercent: number; time: number; advances: number; declines: number;
}

// Cùng một lần làm mới gọi cả quote lẫn breadth → dùng lại kết quả trong 30 giây.
let memo: { at: number; p: Promise<SsiIndex> } | null = null;
function vnindex(): Promise<SsiIndex> {
  if (memo && Date.now() - memo.at < 30_000) return memo.p;
  const p = getJson<{ code: string; data: SsiIndex }>('https://iboard-query.ssi.com.vn/exchange-index/VNINDEX?hasHistory=false', { headers: HEADERS }).then((j) => {
    if (j.code !== 'SUCCESS' || !j.data) throw new Error('SSI: không có dữ liệu VNINDEX');
    return j.data;
  });
  memo = { at: Date.now(), p };
  p.catch(() => (memo = null));
  return p;
}

export const ssiIndex: MarketProvider & BreadthProvider = {
  id: 'ssi',
  kinds: ['index'],
  async fetch(keys) {
    if (!keys.includes('VNINDEX')) return [];
    const d = await vnindex();
    return [{ symbol: 'VNINDEX', kind: 'index', price: d.indexValue, prevClose: d.prevIndexValue, changePct: d.changePercent, asOf: new Date(d.time).toISOString(), source: 'ssi' }];
  },
  async breadth(): Promise<Breadth | null> {
    const d = await vnindex();
    if (d.advances == null || d.declines == null) return null; // trước giờ mở cửa SSI chưa có số mã tăng / giảm
    const asOf = new Date(d.time).toISOString();
    return { day: vnClock(asOf).day, indexValue: d.indexValue, indexChangePct: d.changePercent ?? null, advancers: d.advances, decliners: d.declines, asOf, source: 'ssi' };
  },
};

interface Chart { t: number[]; c: number[] }

/** Nến ngày từ SSI; cổ phiếu tính bằng nghìn đồng → × 1.000, chỉ số giữ nguyên điểm. */
async function ssiChart(symbol: string, days: number): Promise<Bar[]> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 86_400;
  const j = await getJson<{ code: string; data: Chart }>(
    `https://iboard-api.ssi.com.vn/statistics/charts/history?resolution=1D&symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}`,
    { headers: HEADERS },
  );
  if (j.code !== 'SUCCESS' || !j.data?.t?.length) throw new Error(`SSI chart: không có dữ liệu ${symbol}`);
  const mult = symbol === 'VNINDEX' ? 1 : 1000;
  return j.data.t.map((t, i) => ({ symbol, day: vnClock(new Date(t * 1000)).day, close: Math.round(j.data.c[i] * mult * 100) / 100 }));
}

export const ssiHistory: HistoryProvider = { id: 'ssi', history: ssiChart };

export const ssiStock: MarketProvider = {
  id: 'ssi',
  kinds: ['stock'],
  fetch: (keys) =>
    perKey(keys, async (symbol) => {
      const bars = await ssiChart(symbol, 10);
      const last = bars[bars.length - 1];
      const prev = bars[bars.length - 2];
      return {
        symbol, kind: 'stock' as const, price: last.close, prevClose: prev?.close ?? null,
        changePct: prev ? ((last.close - prev.close) / prev.close) * 100 : null,
        asOf: new Date(`${last.day}T08:00:00Z`).toISOString(), source: 'ssi',
      };
    }),
};
