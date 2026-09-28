// Tiện ích dùng chung cho trang Lựa chọn cuộc đời.

import type { LifeChoiceVerdict } from '@shared/types/api';
import { formatVndFull } from '@shared/format';
import type { ExtTone } from '@/components/ui';

const NUM_LOCALE: Record<string, string> = { vi: 'vi-VN', en: 'en-US', zh: 'zh-CN' };

/** 14.4 → "14,4" (vi). */
export const num = (n: number, locale: string) => n.toLocaleString(NUM_LOCALE[locale] ?? 'vi-VN', { maximumFractionDigits: 1 });

/** '2027-03' → "T3/2027" (vi) · "Mar 2027" (en) · "2027年3月" (zh). */
export function monthShort(month: string, locale: string): string {
  const [y, m] = month.split('-').map(Number);
  if (locale === 'en') return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(y, m - 1));
  if (locale === 'zh') return `${y}年${m}月`;
  return `T${m}/${y}`;
}

/** '2027-03' → "2027 Q1". */
export const quarterOf = (month: string) => `${month.slice(0, 4)} Q${Math.ceil(Number(month.slice(5)) / 3)}`;

export const VERDICT_TONE: Record<LifeChoiceVerdict, ExtTone> = { go: 'green', conditional: 'amber', wait: 'red' };
export const VERDICT_HEX: Record<LifeChoiceVerdict, string> = { go: '#F28C28', conditional: '#F5A524', wait: '#EF4444' };

/** Tham số dạng số tiền → chuỗi VND; số tháng → số có dấu phẩy. */
export function fmtParams(params: Record<string, number | string> | undefined, locale: string) {
  if (!params) return undefined;
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) out[k] = typeof v === 'number' ? (k === 'amount' ? formatVndFull(v) : num(v, locale)) : v;
  return out;
}
