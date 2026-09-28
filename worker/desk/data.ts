// Đọc dữ liệu cho bàn đầu tư theo đúng thời điểm (point-in-time): chạy cho ngày D thì chỉ thấy dòng có ngày <= D.
// Nhờ vậy chạy lại trên ngày cũ (kiểm tra lại kết luận) không bị "nhìn trước tương lai".

import type { Bar, Breadth, NewsItem, QuoteKind } from '../../shared/types/market';

/** Cuối ngày D theo giờ Việt Nam, dạng ISO UTC (23:59:59.999 +07 = 16:59:59.999Z). */
export const vnDayEndIso = (day: string) => new Date(Date.parse(`${day}T23:59:59.999+07:00`)).toISOString();

const minusDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

/** Giá đóng cửa của `symbol` trong `days` ngày tính tới hết ngày `asOf` (tăng dần). */
export async function historyAsOf(db: D1Database, symbol: string, asOf: string, days = 370): Promise<Bar[]> {
  const { results } = await db
    .prepare('SELECT symbol, day, close FROM market_history WHERE symbol = ? AND day >= ? AND day <= ? ORDER BY day')
    .bind(symbol, minusDays(asOf, days), asOf)
    .all<Bar>();
  return results;
}

/** Độ rộng thị trường mới nhất có ngày <= asOf. */
export async function breadthAsOf(db: D1Database, asOf: string): Promise<Breadth | null> {
  const r = await db.prepare('SELECT * FROM market_breadth WHERE day <= ? ORDER BY day DESC LIMIT 1').bind(asOf).first<{
    day: string; index_value: number | null; index_change_pct: number | null; advancers: number | null; decliners: number | null; as_of: string; source: string;
  }>();
  return r
    ? { day: r.day, indexValue: r.index_value, indexChangePct: r.index_change_pct, advancers: r.advancers, decliners: r.decliners, asOf: r.as_of, source: r.source }
    : null;
}

/** Tiêu đề tin trong 7 ngày tới hết ngày asOf, mới trước. */
export async function newsAsOf(db: D1Database, asOf: string, limit = 40): Promise<Pick<NewsItem, 'id' | 'symbol' | 'title' | 'publishedAt'>[]> {
  const { results } = await db
    .prepare('SELECT id, symbol, title, published_at AS publishedAt FROM market_news WHERE published_at <= ? AND published_at >= ? ORDER BY published_at DESC LIMIT ?')
    .bind(vnDayEndIso(asOf), vnDayEndIso(minusDays(asOf, 7)), limit)
    .all<Pick<NewsItem, 'id' | 'symbol' | 'title' | 'publishedAt'>>();
  return results;
}

/** Loại mã (vàng / cổ phiếu / quỹ...) — chỉ là thuộc tính, không phải số liệu theo thời gian. */
export async function symbolKind(db: D1Database, symbol: string): Promise<QuoteKind | null> {
  const r = await db.prepare('SELECT kind FROM market_prices WHERE symbol = ?').bind(symbol).first<{ kind: QuoteKind }>();
  return r?.kind ?? null;
}

/** Câu bài học gần nhất của mã, từ các lần chạy trước ngày asOf. */
export async function lastLesson(db: D1Database, symbol: string, asOf: string): Promise<string | null> {
  const r = await db
    .prepare('SELECT lesson FROM desk_reports WHERE symbol = ? AND day < ? AND lesson IS NOT NULL ORDER BY day DESC LIMIT 1')
    .bind(symbol, asOf)
    .first<{ lesson: string }>();
  return r?.lesson ?? null;
}
