// Đọc / ghi bảng thị trường trong D1 (market_prices, market_history, market_breadth, market_news).

import type { Bar, Breadth, NewsItem, Quote, QuoteKind } from '../../shared/types/market';
import { vnClock } from './http';

interface PriceRow {
  symbol: string; kind: QuoteKind; price: number; prev_close: number | null; change_pct: number | null;
  as_of: string; source: string; fetched_at: string;
}

export const toQuote = (r: PriceRow): Quote & { fetchedAt: string } => ({
  symbol: r.symbol, kind: r.kind, price: r.price, prevClose: r.prev_close, changePct: r.change_pct, asOf: r.as_of, source: r.source, fetchedAt: r.fetched_at,
});

export async function loadQuotes(db: D1Database, symbols?: string[]): Promise<(Quote & { fetchedAt: string })[]> {
  if (symbols && !symbols.length) return [];
  const sql = symbols ? `SELECT * FROM market_prices WHERE symbol IN (${symbols.map(() => '?').join(',')})` : 'SELECT * FROM market_prices';
  const { results } = await db.prepare(sql).bind(...(symbols ?? [])).all<PriceRow>();
  return results.map(toQuote);
}

/**
 * Ghi giá mới nhất + giá đóng cửa của ngày đó vào lịch sử.
 * Nguồn không có giá phiên trước (vàng, tỷ giá) → lấy giá đóng cửa ngày gần nhất trước đó trong lịch sử;
 * lịch sử chưa có → giữ prev_close cũ.
 */
export async function saveQuotes(db: D1Database, quotes: Quote[], now = new Date()): Promise<void> {
  if (!quotes.length) return;
  const fetchedAt = now.toISOString();
  const prevStmts = quotes.map((q) =>
    db.prepare('SELECT close FROM market_history WHERE symbol = ? AND day < ? ORDER BY day DESC LIMIT 1').bind(q.symbol, vnClock(q.asOf).day),
  );
  const prevs = await db.batch<{ close: number }>(prevStmts);
  const stmts: D1PreparedStatement[] = [];
  quotes.forEach((q, i) => {
    const histPrev = prevs[i].results[0]?.close ?? null;
    const prevClose = q.prevClose ?? histPrev;
    const changePct = q.changePct ?? (prevClose ? ((q.price - prevClose) / prevClose) * 100 : null);
    stmts.push(
      db.prepare(
        `INSERT INTO market_prices (symbol, kind, price, prev_close, change_pct, as_of, source, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(symbol) DO UPDATE SET kind = excluded.kind, price = excluded.price,
           prev_close = COALESCE(excluded.prev_close, market_prices.prev_close),
           change_pct = COALESCE(excluded.change_pct,
             CASE WHEN market_prices.prev_close > 0 THEN (excluded.price - market_prices.prev_close) * 100.0 / market_prices.prev_close END),
           as_of = excluded.as_of, source = excluded.source, fetched_at = excluded.fetched_at`,
      ).bind(q.symbol, q.kind, q.price, prevClose, changePct == null ? null : Math.round(changePct * 100) / 100, q.asOf, q.source, fetchedAt),
      db.prepare('INSERT INTO market_history (symbol, day, close) VALUES (?, ?, ?) ON CONFLICT(symbol, day) DO UPDATE SET close = excluded.close')
        .bind(q.symbol, vnClock(q.asOf).day, q.price),
    );
  });
  await db.batch(stmts);
}

export async function saveHistory(db: D1Database, bars: Bar[]): Promise<void> {
  if (!bars.length) return;
  await db.batch(
    bars.map((b) =>
      db.prepare('INSERT INTO market_history (symbol, day, close) VALUES (?, ?, ?) ON CONFLICT(symbol, day) DO UPDATE SET close = excluded.close').bind(b.symbol, b.day, b.close),
    ),
  );
}

export async function loadHistory(db: D1Database, symbol: string, days: number, today = vnClock().day): Promise<Bar[]> {
  const since = new Date(new Date(`${today}T00:00:00Z`).getTime() - days * 86_400_000).toISOString().slice(0, 10);
  const { results } = await db
    .prepare('SELECT symbol, day, close FROM market_history WHERE symbol = ? AND day >= ? AND day <= ? ORDER BY day')
    .bind(symbol, since, today)
    .all<Bar>();
  return results;
}

export async function historyCount(db: D1Database, symbols: string[]): Promise<Map<string, number>> {
  if (!symbols.length) return new Map();
  const { results } = await db
    .prepare(`SELECT symbol, COUNT(*) AS n FROM market_history WHERE symbol IN (${symbols.map(() => '?').join(',')}) GROUP BY symbol`)
    .bind(...symbols)
    .all<{ symbol: string; n: number }>();
  return new Map(results.map((r) => [r.symbol, r.n]));
}

export async function saveBreadth(db: D1Database, b: Breadth): Promise<void> {
  await db
    .prepare(
      `INSERT INTO market_breadth (day, index_value, index_change_pct, advancers, decliners, as_of, source) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(day) DO UPDATE SET index_value = excluded.index_value, index_change_pct = excluded.index_change_pct,
         advancers = excluded.advancers, decliners = excluded.decliners, as_of = excluded.as_of, source = excluded.source`,
    )
    .bind(b.day, b.indexValue, b.indexChangePct, b.advancers, b.decliners, b.asOf, b.source)
    .run();
}

export async function loadBreadth(db: D1Database): Promise<Breadth | null> {
  const r = await db.prepare('SELECT * FROM market_breadth ORDER BY day DESC LIMIT 1').first<{
    day: string; index_value: number | null; index_change_pct: number | null; advancers: number | null; decliners: number | null; as_of: string; source: string;
  }>();
  return r
    ? { day: r.day, indexValue: r.index_value, indexChangePct: r.index_change_pct, advancers: r.advancers, decliners: r.decliners, asOf: r.as_of, source: r.source }
    : null;
}

export async function saveNews(db: D1Database, items: NewsItem[], now = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  await db.batch([
    ...items.map((n) =>
      db.prepare('INSERT OR IGNORE INTO market_news (id, symbol, title, url, published_at, source, sentiment) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(n.id, n.symbol, n.title, n.url, n.publishedAt, n.source, n.sentiment),
    ),
    db.prepare('DELETE FROM market_news WHERE published_at < ?').bind(cutoff),
  ]);
}

export async function loadNews(db: D1Database, limit = 10): Promise<NewsItem[]> {
  const { results } = await db
    .prepare('SELECT id, symbol, title, url, published_at AS publishedAt, source, sentiment FROM market_news ORDER BY published_at DESC LIMIT ?')
    .bind(limit)
    .all<NewsItem>();
  return results;
}
