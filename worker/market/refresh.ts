// Làm mới giá thị trường (gọi mỗi giờ từ cron). Chỉ lấy mã có người đang giữ + vài mã nền (vàng, bạc, VN-Index, USD, CNY). Không bao giờ ném lỗi: nguồn lỗi → ghi log, giữ giá cũ.

import type { Env } from '../env';
import type { Quote, QuoteKind } from '../../shared/types/market';
import { fetchBreadth, fetchChain, fetchHistoryChain, kindOf } from './chains';
import { vnClock } from './http';
import { fetchNews } from './providers/news';
import { historyCount, saveBreadth, saveHistory, saveNews, saveQuotes } from './store';

/** Mã luôn theo dõi, kể cả khi chưa ai giữ. */
export const FIXED_SYMBOLS = ['SJC', 'XAU', 'XAG', 'VNINDEX', 'USD', 'CNY'];
/** Số ngày lịch sử lấy lần đầu (≈ 60 phiên) cho chỉ báo kỹ thuật. */
const BACKFILL_DAYS = 90;
const MIN_HISTORY = 20;
/** Giữ giá đóng cửa khoảng 1 năm. */
const KEEP_HISTORY_DAYS = 400;

export interface RefreshOptions {
  /** Bỏ qua khung giờ (dev / lần đầu gặp mã). */
  force?: boolean;
  /** Chỉ làm mới các mã này (ví dụ vừa thêm tài sản có mã mới). */
  only?: { symbol: string; category?: string | null }[];
  /** Có lấy tin tức không (mặc định có). */
  news?: boolean;
}

/** Giờ giao dịch HOSE: 9:00–15:15, thứ Hai–thứ Sáu (giờ Việt Nam). */
export function isTradingWindow(now: Date): boolean {
  const t = vnClock(now);
  const minutes = t.hour * 60 + t.minute;
  return t.weekday >= 1 && t.weekday <= 5 && minutes >= 9 * 60 && minutes <= 15 * 60 + 15;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Mỗi bước phụ lỗi riêng, không chặn bước sau. */
async function step(name: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.warn(`[market] bước ${name} lỗi: ${errText(e)}`);
  }
}

export async function refreshMarket(env: Env, now = new Date(), opts: RefreshOptions = {}): Promise<{ updated: string[]; failed: string[] }> {
  const db = env.DB;
  const updated: string[] = [];
  const failed: string[] = [];
  try {
    // 1) Danh sách mã: đang có người giữ + mã cố định
    const targets = new Map<string, QuoteKind>();
    if (opts.only) {
      for (const o of opts.only) targets.set(o.symbol.toUpperCase(), kindOf(o.symbol.toUpperCase(), o.category));
    } else {
      for (const s of FIXED_SYMBOLS) targets.set(s, kindOf(s));
      const { results } = await db
        .prepare("SELECT DISTINCT UPPER(symbol) AS symbol, category FROM holdings WHERE symbol IS NOT NULL AND symbol <> ''")
        .all<{ symbol: string; category: string }>();
      for (const r of results) if (!targets.has(r.symbol)) targets.set(r.symbol, kindOf(r.symbol, r.category));
    }

    // 2) Mã nào đến hạn lấy giá
    const { results: existing } = await db.prepare('SELECT symbol, source, fetched_at FROM market_prices').all<{ symbol: string; source: string; fetched_at: string }>();
    const known = new Map(existing.map((r) => [r.symbol, r]));
    const clock = vnClock(now);
    const trading = isTradingWindow(now);
    const due = (symbol: string, kind: QuoteKind): boolean => {
      const row = known.get(symbol);
      if (opts.force || !row || row.source === 'mau') return true; // lần đầu gặp mã / chỉ có giá mẫu
      if (kind === 'stock' || kind === 'index') return trading;
      if (kind === 'fund') return clock.hour >= 20 && vnClock(row.fetched_at).day !== clock.day; // NAV công bố buổi tối, 1 lần/ngày
      return true;
    };
    const byKind = new Map<QuoteKind, string[]>();
    for (const [symbol, kind] of targets) if (due(symbol, kind)) byKind.set(kind, [...(byKind.get(kind) ?? []), symbol]);

    // 3) Gọi các chuỗi nguồn song song
    const results = await Promise.all(
      [...byKind].map(async ([kind, keys]) => {
        const r = await fetchChain(kind, keys);
        if (r.errors.length) console.warn(`[market] ${kind}: ${r.errors.join(' | ')}`);
        failed.push(...r.missing);
        return r.quotes;
      }),
    );
    const quotes: Quote[] = results.flat();
    await saveQuotes(db, quotes, now);
    updated.push(...quotes.map((q) => q.symbol));

    // 4) Độ rộng thị trường (cùng lúc với VN-Index)
    if (byKind.get('index')?.includes('VNINDEX')) {
      await step('độ rộng', async () => {
        const b = await fetchBreadth();
        if (b) await saveBreadth(db, b);
      });
    }

    // 5) Lịch sử ~60 phiên cho cổ phiếu / chỉ số mới gặp
    await step('lịch sử', async () => {
      const histSymbols = quotes.filter((q) => q.kind === 'stock' || q.kind === 'index').map((q) => q.symbol);
      const counts = await historyCount(db, histSymbols);
      await Promise.all(
        histSymbols
          .filter((s) => (counts.get(s) ?? 0) < MIN_HISTORY)
          .map(async (s) => saveHistory(db, await fetchHistoryChain(targets.get(s)!, s, BACKFILL_DAYS))),
      );
    });

    // 6) Dọn lịch sử quá ~1 năm
    const cutoff = new Date(now.getTime() - KEEP_HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10);
    await step('dọn lịch sử', () => db.prepare('DELETE FROM market_history WHERE day < ?').bind(cutoff).run());

    // 7) Tiêu đề tin
    if (opts.news !== false && !opts.only) {
      await step('tin tức', async () => {
        const { items, errors } = await fetchNews();
        if (errors.length) console.warn(`[market] tin tức: ${errors.join(' | ')}`);
        if (items.length) await saveNews(db, items, now);
      });
    }
  } catch (e) {
    console.error(`[market] refreshMarket lỗi: ${errText(e)}`);
  }
  return { updated, failed };
}
