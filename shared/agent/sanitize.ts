// Che dữ liệu nhạy cảm trong lệnh người dùng TRƯỚC khi lưu / gửi cho mô hình AI.
// Thứ tự: email → số điện thoại → số tài khoản / thẻ → số tiền → mọi con số còn lại.

const UNIT = String.raw`(?:tỷ|tỉ|triệu|tr|nghìn|ngàn|k|đồng|đ|₫|vnđ|vnd|usd|cny|\$|¥)`;
const EMAIL = /[\p{L}\d._%+-]+@[\p{L}\d.-]+\.[\p{L}]{2,}/gu;
const PHONE = /(?:\+?84|0)(?:[\s.-]?\d){8,10}(?!\d)/g;
const ACCOUNT = /\b\d(?:[\s-]?\d){9,18}\b/g;
const MONEY = new RegExp(String.raw`(?:[$¥₫]\s*)?\d(?:[\d.,]*\d)?\s*${UNIT}(?![\p{L}\d])|[$¥₫]\s*\d(?:[\d.,]*\d)?`, 'giu');
const NUMBER = /\d(?:[\d.,]*\d)?/g;

export const MASK = { email: '[email]', phone: '[số điện thoại]', account: '[số tài khoản]', money: '[số tiền]', number: '[số]' } as const;

/** Lệnh đã che: không còn chữ số, email, số điện thoại. Giữ nguyên chữ để phân loại ý định. */
export function sanitizePrompt(text: string): string {
  return text
    .replace(EMAIL, MASK.email)
    .replace(PHONE, MASK.phone)
    .replace(ACCOUNT, MASK.account)
    .replace(MONEY, MASK.money)
    .replace(NUMBER, MASK.number)
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 500);
}

/** Kiểm tra nhanh: chuỗi đã che còn lộ chữ số hoặc email không. */
export const isMasked = (text: string) => !/\d/.test(text) && !/@[\p{L}\d.-]+\.[\p{L}]{2,}/u.test(text);

/* ───────── Che số bằng ký hiệu giữ chỗ (đảo ngược được) ─────────
   Mô hình AI chỉ thấy "AMT_1", "DUR_1", "PCT_1"; số thật nằm trong bảng `map`, code tự đổi lại.
   Nhật ký vẫn dùng sanitizePrompt (che hẳn, không lưu bảng). */

export type PlaceholderKind = 'AMT' | 'DUR' | 'PCT';
export interface PlaceholderEntry {
  kind: PlaceholderKind;
  /** Chuỗi gốc trong câu (vd "300 triệu"). */
  raw: string;
  /** AMT: đồng (VND, số nguyên); DUR: số tháng; PCT: phần trăm. */
  value: number;
  /** Tiền ngoại tệ không quy đổi được → không dùng làm số tiền VND. */
  currency?: 'VND' | 'USD' | 'CNY';
}
export type PlaceholderMap = Record<string, PlaceholderEntry>;
export interface MaskedText { masked: string; map: PlaceholderMap }

const NB = String.raw`(?<![\p{L}\d_])`;
const NUM = String.raw`\d(?:[\d.,]*\d)?`;
const MONEY_P = new RegExp(String.raw`${NB}(${NUM})\s*(tỷ|tỉ|triệu|tr|nghìn|ngàn|k|đồng|đ|₫|vnđ|vnd|usd|cny|\$|¥)(?![\p{L}\d])|${NB}([$¥₫])\s*(${NUM})`, 'giu');
const PCT_P = new RegExp(String.raw`${NB}(${NUM})\s*(%|phần trăm|phan tram)`, 'giu');
const DUR_P = new RegExp(String.raw`${NB}(${NUM})\s*(tháng|thang|năm|nam|tuần|tuan|ngày|ngay)(?![\p{L}])`, 'giu');

/** "300.000.000" → 300000000; "1,5" → 1.5. */
export function parseLooseNumber(s: string): number {
  const t = s.replace(/\s/g, '');
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(t)) return Number(t.replace(/[.,]/g, ''));
  return Number(t.replace(',', '.'));
}

const MONEY_UNIT: Record<string, number> = { 'tỷ': 1e9, 'tỉ': 1e9, 'triệu': 1e6, tr: 1e6, 'nghìn': 1e3, 'ngàn': 1e3, k: 1e3 };

export function maskWithPlaceholders(text: string): MaskedText {
  const map: PlaceholderMap = {};
  const count: Record<PlaceholderKind, number> = { AMT: 0, DUR: 0, PCT: 0 };
  const put = (kind: PlaceholderKind, raw: string, value: number, currency?: PlaceholderEntry['currency']) => {
    if (!Number.isFinite(value)) return MASK.number;
    const key = `${kind}_${++count[kind]}`;
    map[key] = { kind, raw: raw.trim(), value, ...(currency ? { currency } : {}) };
    return key;
  };
  const masked = text
    .replace(EMAIL, MASK.email)
    .replace(MONEY_P, (m, n1: string | undefined, unit: string | undefined, sym: string | undefined, n2: string | undefined) => {
      const u = (unit ?? sym ?? '').toLowerCase();
      const n = parseLooseNumber(n1 ?? n2 ?? '');
      if (u === 'usd' || u === '$') return put('AMT', m, n, 'USD');
      if (u === 'cny' || u === '¥') return put('AMT', m, n, 'CNY');
      return put('AMT', m, Math.round(n * (MONEY_UNIT[u] ?? 1)), 'VND');
    })
    .replace(PCT_P, (m, n: string) => put('PCT', m, parseLooseNumber(n)))
    .replace(DUR_P, (m, n: string, unit: string) => {
      const v = parseLooseNumber(n);
      const u = unit.toLowerCase();
      const months = u === 'năm' || u === 'nam' ? v * 12 : u === 'tuần' || u === 'tuan' ? v / 4.345 : u === 'ngày' || u === 'ngay' ? v / 30 : v;
      return put('DUR', m, Math.max(1, Math.round(months)));
    })
    .replace(PHONE, MASK.phone)
    .replace(ACCOUNT, MASK.account)
    .replace(/(?<!(?:AMT|DUR|PCT)_\d*)\d(?:[\d.,]*\d)?/g, MASK.number)
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 500);
  return { masked, map };
}

/** Giá trị số của một ký hiệu ("AMT_1" → 300000000). Tiền ngoại tệ / ký hiệu lạ → undefined. */
export function restoreValue(ref: string | undefined | null, map: PlaceholderMap, kind?: PlaceholderKind): number | undefined {
  if (!ref) return undefined;
  const e = map[ref.toUpperCase()];
  if (!e || (kind && e.kind !== kind)) return undefined;
  if (e.kind === 'AMT' && e.currency && e.currency !== 'VND') return undefined;
  return e.value;
}

/** Đổi một bộ ký hiệu thành số: { costRef: 'AMT_1' } → { costRef: 300000000 }. */
export function restore<K extends string>(values: Partial<Record<K, string | undefined>>, map: PlaceholderMap): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  for (const [k, ref] of Object.entries(values) as [K, string | undefined][]) {
    const v = restoreValue(ref, map);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Thay ký hiệu trong câu bằng chuỗi số gốc (dùng cho câu trả lời đã diễn đạt lại). */
export const restoreText = (text: string, map: PlaceholderMap): string =>
  text.replace(/\b(?:AMT|DUR|PCT)_\d+\b/g, (k) => map[k]?.raw ?? k);
