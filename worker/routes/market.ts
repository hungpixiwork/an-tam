// Tầng dữ liệu thị trường phục vụ ra ngoài. Mount: /api/market

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import type { MarketData, MarketHistoryData, MarketQuoteRow, MarketSource } from '../../shared/types/api';
import { drawdownFromPeak, rsi, sma, volatility } from '../../shared/engine/technical';
import { ApiError, ok } from '../lib/http';
import { DATA_SOURCES } from '../market/chains';
import { FIXED_SYMBOLS, refreshMarket } from '../market/refresh';
import { runMarketAlertsForUser } from '../market/alerts';
import { loadBreadth, loadHistory, loadNews, loadQuotes } from '../market/store';

/** Mã luôn hiện trong bảng giá của người dùng. */
const BOARD_SYMBOLS = ['SJC', 'VNINDEX', 'USD', 'CNY'];
const DAY_MS = 86_400_000;

/** Giá coi là cũ: giá mẫu, hoặc quá 3 ngày (cổ phiếu / chỉ số / quỹ / vàng SJC — qua cuối tuần) / 1 ngày (vàng thế giới, tỷ giá, tiền số). */
function isStale(q: { kind: string; asOf: string; source: string }, now: number): boolean {
  if (q.source === 'mau') return true;
  const limit = q.kind === 'stock' || q.kind === 'index' || q.kind === 'fund' || q.kind === 'gold_vn' ? 3 * DAY_MS : DAY_MS;
  return now - new Date(q.asOf).getTime() > limit;
}

/** Mã người dùng đang giữ. */
async function heldSymbols(db: D1Database, userId: string): Promise<Set<string>> {
  const { results } = await db
    .prepare("SELECT DISTINCT UPPER(symbol) AS symbol FROM holdings WHERE user_id = ? AND symbol IS NOT NULL AND symbol <> ''")
    .bind(userId)
    .all<{ symbol: string }>();
  return new Set(results.map((r) => r.symbol));
}

const isDevOrigin = (origin?: string) => !origin || /localhost|127\.0\.0\.1/.test(origin);

export const market = new Hono<AppEnv>()
  .get('/', async (c) => {
    const db = c.env.DB;
    const held = await heldSymbols(db, c.get('userId'));
    const [quotes, breadth, news] = await Promise.all([loadQuotes(db, [...new Set([...BOARD_SYMBOLS, ...held])]), loadBreadth(db), loadNews(db, 10)]);
    const now = Date.now();
    const rows: MarketQuoteRow[] = quotes
      .map(({ fetchedAt: _f, ...q }) => ({ ...q, held: held.has(q.symbol), stale: isStale(q, now) }))
      .sort((a, b) => Number(b.held) - Number(a.held) || BOARD_SYMBOLS.indexOf(a.symbol) - BOARD_SYMBOLS.indexOf(b.symbol));
    const real = quotes.filter((q) => q.source !== 'mau').map((q) => q.fetchedAt).sort();
    return ok<MarketData>(c, { quotes: rows, breadth, news, updatedAt: real[real.length - 1] ?? null });
  })
  .get('/sources', (c) => ok<MarketSource[]>(c, DATA_SOURCES))
  .get('/history/:symbol', async (c) => {
    const symbol = c.req.param('symbol').toUpperCase();
    if (!/^[A-Z0-9]{1,12}$/.test(symbol)) throw new ApiError(400, 'invalid_input', 'Mã không hợp lệ');
    // Chỉ trả lịch sử của mã người dùng đang giữ hoặc mã nền — không làm cổng lấy dữ liệu thô tùy ý
    if (!FIXED_SYMBOLS.includes(symbol) && !(await heldSymbols(c.env.DB, c.get('userId'))).has(symbol)) throw new ApiError(404, 'not_found', 'Bạn chưa giữ mã này');
    const days = Math.min(365, Math.max(5, Number(c.req.query('days') ?? 60) || 60));
    const bars = await loadHistory(c.env.DB, symbol, days);
    const closes = bars.map((b) => b.close);
    return ok<MarketHistoryData>(c, {
      symbol,
      bars,
      technical: { sma20: sma(closes, 20), sma50: sma(closes, 50), rsi14: rsi(closes, 14), drawdown: drawdownFromPeak(closes), volatility: volatility(closes) },
    });
  })
  /** Chỉ dùng khi dev (APP_ORIGIN trống / localhost): lấy giá ngay, bỏ qua khung giờ, rồi chạy cảnh báo cho người đang đăng nhập. */
  .get('/refresh-dev', async (c) => {
    if (!isDevOrigin(c.env.APP_ORIGIN)) throw new ApiError(404, 'not_found', 'API không tồn tại');
    // ?fetch=0 → chỉ chạy lại cảnh báo trên giá đang có (kiểm tra luật)
    const result = c.req.query('fetch') === '0' ? { updated: [], failed: [] } : await refreshMarket(c.env, new Date(), { force: true });
    const alerts = await runMarketAlertsForUser(c.env, c.get('userId'));
    return ok(c, { ...result, fixed: FIXED_SYMBOLS, alerts: alerts.map((a) => ({ ruleKey: a.ruleKey, title: a.title, body: a.body })) });
  });
