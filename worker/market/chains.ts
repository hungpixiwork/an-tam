// Cấu hình nguồn — đổi / thêm nguồn chỉ cần sửa 1 dòng ở đây; giấy phép + dòng ghi nguồn ở DATA_SOURCES.
// Chuỗi dự phòng: mỗi nhóm dữ liệu thử nguồn chính rồi nguồn phụ, chỉ hỏi nguồn sau cho các mã nguồn trước chưa lấy được.

import type { Bar, Breadth, Quote, QuoteKind } from '../../shared/types/market';
import type { BreadthProvider, DataSource, HistoryProvider, MarketProvider } from './types';
import { goldApi, pnj, sjc } from './providers/gold';
import { ssiHistory, ssiIndex, ssiStock } from './providers/ssi';
import { vndirectHistory, vndirectIndex, vndirectStock } from './providers/vndirect';
import { fmarket } from './providers/fund';
import { CRYPTO_SYMBOLS, coingecko, erApi, vietcombank } from './providers/fx';

export const CHAINS: Record<QuoteKind, MarketProvider[]> = {
  gold_vn: [sjc, pnj],
  gold_world: [goldApi],
  index: [ssiIndex, vndirectIndex],
  stock: [vndirectStock, ssiStock],
  fund: [fmarket],
  fx: [vietcombank, erApi],
  crypto: [coingecko],
};

const HISTORY_CHAINS: Partial<Record<QuoteKind, HistoryProvider[]>> = {
  stock: [ssiHistory, vndirectHistory],
  index: [vndirectHistory, ssiHistory],
};

const BREADTH_CHAIN: BreadthProvider[] = [ssiIndex];

/** Khoảng giá hợp lý theo nhóm — chặn số sai đơn vị / nguồn trả rác. */
const BOUNDS: Record<QuoteKind, [number, number]> = {
  gold_vn: [10_000_000, 1_000_000_000],
  gold_world: [1, 100_000], // vàng ~4.000, bạc ~60 USD/ounce
  index: [100, 10_000],
  stock: [100, 10_000_000],
  fund: [1_000, 10_000_000],
  fx: [1, 1_000_000],
  crypto: [1, 1e12],
};

/** Nơi DUY NHẤT ghi nguồn dữ liệu, giấy phép và dòng ghi nguồn (trả qua GET /api/market/sources, không lặp ở từng giá / câu cảnh báo). */
export const DATA_SOURCES: DataSource[] = [
  { id: 'sjc', name: 'SJC', license: 'unofficial', attribution: 'Giá vàng tham khảo từ trang công khai của SJC' },
  { id: 'pnj', name: 'PNJ', license: 'unofficial', attribution: 'Giá vàng tham khảo từ trang công khai của PNJ' },
  { id: 'gold-api', name: 'gold-api.com', license: 'official-free', attribution: 'Giá vàng, bạc thế giới: gold-api.com' },
  { id: 'ssi', name: 'SSI iBoard', license: 'unofficial', attribution: 'VN-Index và số mã tăng / giảm tham khảo từ bảng giá công khai SSI iBoard' },
  { id: 'vndirect', name: 'VNDirect', license: 'unofficial', attribution: 'Giá cổ phiếu tham khảo từ dữ liệu công khai của VNDirect' },
  // Điều khoản fmarket cấm thu thập tự động — cần xin phép trước khi dùng thương mại
  { id: 'fmarket', name: 'Fmarket', license: 'unofficial', attribution: 'Giá chứng chỉ quỹ tham khảo từ Fmarket' },
  { id: 'vietcombank', name: 'Vietcombank', license: 'unofficial', attribution: 'Tỷ giá tham khảo từ Vietcombank' },
  { id: 'er-api', name: 'ExchangeRate-API', license: 'official-free', attribution: 'Rates By Exchange Rate API' },
  { id: 'coingecko', name: 'CoinGecko', license: 'official-free', attribution: 'Data provided by CoinGecko' },
  { id: 'cafef', name: 'CafeF', license: 'official-free', attribution: 'Tiêu đề tin từ RSS CafeF' },
  { id: 'vnexpress', name: 'VnExpress', license: 'official-free', attribution: 'Tiêu đề tin từ RSS VnExpress' },
];

export function validQuote(q: Quote): boolean {
  const [lo, hi] = BOUNDS[q.kind];
  const okNum = (v: number | null | undefined) => v == null || Number.isFinite(v);
  return Number.isFinite(q.price) && q.price >= lo && q.price <= hi && okNum(q.prevClose) && okNum(q.changePct)
    && !Number.isNaN(new Date(q.asOf).getTime());
}

const FIXED_KIND: Record<string, QuoteKind> = { SJC: 'gold_vn', XAU: 'gold_world', XAG: 'gold_world', VNINDEX: 'index', USD: 'fx', CNY: 'fx', EUR: 'fx', JPY: 'fx', AUD: 'fx', GBP: 'fx' };

/** Nhóm dữ liệu của một mã: mã cố định → theo bảng; còn lại theo loại tài sản (quỹ / cổ phiếu). */
export function kindOf(symbol: string, category?: string | null): QuoteKind {
  if (FIXED_KIND[symbol]) return FIXED_KIND[symbol];
  if (CRYPTO_SYMBOLS.includes(symbol)) return 'crypto';
  return category === 'fund' ? 'fund' : 'stock';
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function fetchChain(kind: QuoteKind, keys: string[]): Promise<{ quotes: Quote[]; missing: string[]; errors: string[] }> {
  const quotes: Quote[] = [];
  const errors: string[] = [];
  let remaining = [...keys];
  for (const p of CHAINS[kind]) {
    if (!remaining.length) break;
    try {
      const got = (await p.fetch(remaining)).filter((q) => remaining.includes(q.symbol) && validQuote(q));
      quotes.push(...got);
      const done = new Set(got.map((q) => q.symbol));
      if (done.size < remaining.length) errors.push(`${p.id}: thiếu ${remaining.filter((k) => !done.has(k)).join(',')}`);
      remaining = remaining.filter((k) => !done.has(k));
    } catch (e) {
      errors.push(`${p.id}: ${errText(e)}`);
    }
  }
  return { quotes, missing: remaining, errors };
}

export async function fetchHistoryChain(kind: QuoteKind, symbol: string, days: number): Promise<Bar[]> {
  for (const p of HISTORY_CHAINS[kind] ?? []) {
    try {
      const bars = (await p.history(symbol, days)).filter((b) => Number.isFinite(b.close) && b.close > 0);
      if (bars.length) return bars;
    } catch (e) {
      console.warn(`[market] lịch sử ${symbol} từ ${p.id} lỗi: ${errText(e)}`);
    }
  }
  return [];
}

export async function fetchBreadth(): Promise<Breadth | null> {
  for (const p of BREADTH_CHAIN) {
    try {
      const b = await p.breadth();
      if (b) return b;
    } catch (e) {
      console.warn(`[market] độ rộng thị trường từ ${p.id} lỗi: ${errText(e)}`);
    }
  }
  return null;
}
