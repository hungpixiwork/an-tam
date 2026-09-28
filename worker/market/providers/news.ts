// Tiêu đề tin từ RSS công khai (CafeF chứng khoán, VnExpress Kinh doanh). Chỉ lưu tiêu đề + link + thời gian.

import type { NewsItem } from '../../../shared/types/market';
import { getText } from '../http';

export const FEEDS: { source: string; url: string }[] = [
  { source: 'cafef', url: 'https://cafef.vn/thi-truong-chung-khoan.rss' },
  { source: 'vnexpress', url: 'https://vnexpress.net/rss/kinh-doanh.rss' },
];

const strip = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

/** Băm ngắn (FNV-1a) làm id ổn định theo url. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16);
}

export function parseRss(xml: string, source: string, limit = 15): NewsItem[] {
  const items: NewsItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const tag = (name: string) => strip(m[1].match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? '');
    const title = tag('title');
    const url = tag('link');
    const pub = new Date(tag('pubDate'));
    if (!title || !/^https?:\/\//.test(url)) continue;
    items.push({ id: hash(url), symbol: null, title, url, publishedAt: Number.isNaN(pub.getTime()) ? new Date().toISOString() : pub.toISOString(), source, sentiment: null });
    if (items.length >= limit) break;
  }
  return items;
}

export async function fetchNews(): Promise<{ items: NewsItem[]; errors: string[] }> {
  const settled = await Promise.allSettled(FEEDS.map(async (f) => parseRss(await getText(f.url, { headers: { Accept: 'application/rss+xml, application/xml' } }), f.source)));
  const items: NewsItem[] = [];
  const errors: string[] = [];
  settled.forEach((s, i) => (s.status === 'fulfilled' ? items.push(...s.value) : errors.push(`${FEEDS[i].source}: ${String(s.reason)}`)));
  return { items, errors };
}
