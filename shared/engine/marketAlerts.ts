// Cảnh báo thị trường gắn với tài sản của chính người dùng. Hàm thuần: giá + độ rộng + tài sản + luật → cảnh báo.

import type { Holding } from '../types/domain';
import type { AlertRule, Bar, Breadth, Quote } from '../types/market';
import { formatVnd } from '../format';
import type { AlertSeverity } from './alerts';

export interface MarketAlert {
  /** Luôn bắt đầu bằng 'market:' — syncAlerts không tự đóng các khóa này. */
  ruleKey: string;
  severity: AlertSeverity;
  symbol: string;
  /** % thay đổi, ví dụ -3.1. */
  changePct: number;
  /** Số tiền tài sản của người dùng thay đổi theo (âm = giảm), VND. */
  affectedVnd: number;
  title: string;
  body: string;
}

export interface MarketAlertContext {
  /** Quỹ dự phòng đủ sống bao nhiêu tháng — có thì câu cảnh báo thêm "quỹ dự phòng vẫn đủ X tháng". */
  monthsSafe?: number;
  /** Tên mục tiêu có thể bị ảnh hưởng (ví dụ mục tiêu cần ngoại tệ). */
  goalsImpacted?: string[];
}

export interface MarketAlertInput {
  prices: Quote[];
  breadth: Breadth | null;
  holdings: Holding[];
  rules: AlertRule[];
  /** Giá đóng cửa theo ngày, tăng dần, KHÔNG gồm hôm nay — dùng cho luật "giảm trong tuần". */
  history?: Record<string, Bar[]>;
  /** Mục tiêu cần ngoại tệ (du học, định cư...). Bỏ trống / rỗng → không báo tỷ giá. */
  fxGoals?: string[];
  context?: MarketAlertContext;
}

export const GOLD_SYMBOLS = ['SJC'];
const GOLD_DAY_DROP = 2;
const GOLD_WEEK_DROP = 5;
const HELD_DROP = 7;
const FX_RISE = 1;
const MARKET_RED_INDEX = 1;
const MARKET_RED_INDEX_ONLY = 1.5;
const MARKET_RED_BREADTH = 1.5;

const NAME: Record<string, string> = { SJC: 'Vàng SJC', VNINDEX: 'VN-Index', USD: 'Tỷ giá USD', CNY: 'Tỷ giá CNY', BTC: 'Bitcoin' };

/** "-3.14" → "3,1%" (không dấu). */
const pct = (v: number) => `${Math.abs(v).toFixed(1).replace('.', ',')}%`;

function contextLine(ctx?: MarketAlertContext): string {
  let s = '';
  if (ctx?.monthsSafe !== undefined && ctx.monthsSafe > 0) s += ` Quỹ dự phòng vẫn đủ ${Math.floor(ctx.monthsSafe)} tháng.`;
  if (ctx?.goalsImpacted?.length) s += ` Mục tiêu có thể bị ảnh hưởng: ${ctx.goalsImpacted.join(', ')}.`;
  return s;
}

/** Tổng giá trị người dùng đang giữ của các mã trong danh sách (hoặc khớp điều kiện). */
const heldValue = (holdings: Holding[], match: (h: Holding) => boolean) => holdings.filter(match).reduce((s, h) => s + h.value, 0);
const isGold = (h: Holding) => (h.symbol ? GOLD_SYMBOLS.includes(h.symbol.toUpperCase()) : /vàng|gold/i.test(h.name));
const bySymbol = (sym: string) => (h: Holding) => h.symbol?.toUpperCase() === sym;

/** % thay đổi của giá hiện tại so với `back` ngày trước (lịch sử không gồm hôm nay, tăng dần). */
function changeOver(history: Bar[] | undefined, price: number, back: number): number | null {
  if (!history || history.length < back) return null;
  const ref = history[history.length - back].close;
  return ref > 0 ? ((price - ref) / ref) * 100 : null;
}

function lossLine(affected: number): string {
  return affected < 0 ? ` → tài sản của bạn giảm khoảng ${formatVnd(-affected)}` : '';
}

export function evaluateMarketAlerts(input: MarketAlertInput): MarketAlert[] {
  const { prices, breadth, holdings, rules, history, fxGoals, context } = input;
  const quotes = new Map(prices.map((q) => [q.symbol.toUpperCase(), q]));
  const out: MarketAlert[] = [];
  const calm = ' Không cần bán vội.';

  // 1) Vàng: đang giữ vàng và SJC giảm ≥ 2% trong ngày hoặc ≥ 5% trong 5 phiên.
  const gold = quotes.get('SJC');
  const goldValue = heldValue(holdings, isGold);
  if (gold && goldValue > 0) {
    const day = gold.changePct ?? null;
    const week = changeOver(history?.SJC, gold.price, 5);
    const hit = day !== null && day <= -GOLD_DAY_DROP ? { v: day, when: 'hôm nay' } : week !== null && week <= -GOLD_WEEK_DROP ? { v: week, when: 'trong tuần' } : null;
    if (hit) {
      const affected = Math.round((goldValue * hit.v) / 100);
      out.push({
        ruleKey: 'market:gold_drop', severity: 'warning', symbol: 'SJC', changePct: hit.v, affectedVnd: affected,
        title: `Vàng giảm ${pct(hit.v)} ${hit.when}`,
        body: `Vàng SJC giảm ${pct(hit.v)} ${hit.when}${lossLine(affected)}.${contextLine(context)}${calm}`,
      });
    }
  }

  // 2) Cả thị trường đỏ: VN-Index ≤ -1% và số mã giảm > 1,5 × số mã tăng (thiếu độ rộng → chỉ số ≤ -1,5%).
  const index = quotes.get('VNINDEX');
  const idxChange = index?.changePct ?? breadth?.indexChangePct ?? null;
  if (idxChange !== null) {
    const hasBreadth = breadth?.advancers != null && breadth?.decliners != null;
    const red = hasBreadth
      ? idxChange <= -MARKET_RED_INDEX && breadth!.decliners! > MARKET_RED_BREADTH * breadth!.advancers!
      : idxChange <= -MARKET_RED_INDEX_ONLY;
    if (red) {
      const stockValue = heldValue(holdings, (h) => h.category === 'stock' || h.category === 'fund');
      const affected = Math.round((stockValue * idxChange) / 100);
      const breadthText = hasBreadth ? ` (${breadth!.decliners} mã giảm, ${breadth!.advancers} mã tăng)` : '';
      out.push({
        ruleKey: 'market:market_red', severity: 'warning', symbol: 'VNINDEX', changePct: idxChange, affectedVnd: affected,
        title: `Thị trường chứng khoán giảm mạnh hôm nay`,
        body: `VN-Index giảm ${pct(idxChange)}${breadthText}.${stockValue > 0 ? ` Phần cổ phiếu và quỹ của bạn có thể giảm khoảng ${formatVnd(-affected)}.` : ''}${contextLine(context)}${calm}`,
      });
    }
  }

  // 3) Mã cổ phiếu / quỹ đang giữ giảm ≥ 7% trong ngày.
  const heldSymbols = new Set(holdings.filter((h) => h.symbol).map((h) => h.symbol!.toUpperCase()));
  for (const sym of heldSymbols) {
    const q = quotes.get(sym);
    if (!q || (q.kind !== 'stock' && q.kind !== 'fund') || q.changePct == null || q.changePct > -HELD_DROP) continue;
    const affected = Math.round((heldValue(holdings, bySymbol(sym)) * q.changePct) / 100);
    out.push({
      ruleKey: `market:drop:${sym}`, severity: 'danger', symbol: sym, changePct: q.changePct, affectedVnd: affected,
      title: `${sym} giảm ${pct(q.changePct)} hôm nay`,
      body: `${q.kind === 'fund' ? 'Chứng chỉ quỹ' : 'Cổ phiếu'} ${sym} bạn đang giữ giảm ${pct(q.changePct)}${lossLine(affected)}.${contextLine(context)} Nên xem lại tỷ trọng mã này trước khi quyết định.`,
    });
  }

  // 4) Tỷ giá USD / CNY tăng ≥ 1% khi có mục tiêu cần ngoại tệ.
  if (fxGoals && fxGoals.length) {
    for (const sym of ['USD', 'CNY']) {
      const q = quotes.get(sym);
      if (!q || q.changePct == null || q.changePct < FX_RISE) continue;
      out.push({
        ruleKey: `market:fx:${sym}`, severity: 'warning', symbol: sym, changePct: q.changePct, affectedVnd: 0,
        title: `${NAME[sym]} tăng ${pct(q.changePct)}`,
        body: `${NAME[sym]} tăng ${pct(q.changePct)}, chi phí cho mục tiêu ${fxGoals.join(', ')} tính bằng tiền Việt sẽ cao hơn.${contextLine(context)}`,
      });
    }
  }

  // 5) Luật người dùng tự đặt.
  for (const r of rules) {
    const sym = r.symbol.toUpperCase();
    const q = quotes.get(sym);
    if (!q || q.changePct == null) continue;
    const hit = r.direction === 'down' ? q.changePct <= -r.thresholdPct : q.changePct >= r.thresholdPct;
    // Luật mặc định đã báo cùng mã, cùng chiều → không báo trùng
    if (!hit || out.some((a) => a.symbol === sym && Math.sign(a.changePct) === Math.sign(q.changePct!))) continue;
    const affected = Math.round((heldValue(holdings, sym === 'SJC' ? isGold : bySymbol(sym)) * q.changePct) / 100);
    const verb = q.changePct < 0 ? 'giảm' : 'tăng';
    out.push({
      ruleKey: `market:rule:${r.id}`, severity: 'action', symbol: sym, changePct: q.changePct, affectedVnd: affected,
      title: `${NAME[sym] ?? sym} ${verb} ${pct(q.changePct)} (luật bạn đặt)`,
      body: `${NAME[sym] ?? sym} ${verb} ${pct(q.changePct)}, chạm ngưỡng ${pct(r.thresholdPct)} bạn đã đặt${affected !== 0 ? `; phần bạn đang giữ ${affected < 0 ? 'giảm' : 'tăng'} khoảng ${formatVnd(Math.abs(affected))}` : ''}.`,
    });
  }

  return out;
}
