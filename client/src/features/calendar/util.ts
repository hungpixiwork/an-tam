// Tiện ích ngày giờ + icon theo loại cho màn Lịch AI.

import { Briefcase, CircleDollarSign, GraduationCap, PersonStanding, Target, type LucideIcon } from 'lucide-react';
import type { CalendarCategory } from '@shared/types/api';

export const CATEGORIES: CalendarCategory[] = ['finance', 'skill', 'work', 'rest', 'personal'];

export const CATEGORY_ICON: Record<CalendarCategory, LucideIcon> = {
  finance: CircleDollarSign,
  skill: GraduationCap,
  work: Briefcase,
  rest: PersonStanding,
  personal: Target,
};

const INTL: Record<string, string> = { vi: 'vi-VN', en: 'en-US', zh: 'zh-CN' };
const fmt = (locale: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(INTL[locale] ?? 'vi-VN', { timeZone: 'UTC', ...opts });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const d = (day: string) => new Date(`${day}T00:00:00Z`);

export const addDays = (day: string, n: number) => new Date(d(day).getTime() + n * 86_400_000).toISOString().slice(0, 10);
export const weekStartOf = (day: string) => addDays(day, -((d(day).getUTCDay() + 6) % 7));
export const addMonthsTo = (day: string, n: number) => {
  const x = d(day);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + n, 1)).toISOString().slice(0, 10);
};

/** "Th 2" / "Mon" / "周一". */
export const weekdayShort = (day: string, locale: string) => cap(fmt(locale, { weekday: 'short' }).format(d(day))).replace(/^Thứ /, 'Th ');
/** "28/09". */
export const ddmm = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
/** "28 Thg 9" / "Sep 28". */
const dayMonth = (day: string, locale: string) => fmt(locale, { day: 'numeric', month: 'short' }).format(d(day)).replace(/thg/i, 'Thg');

/** "Th 2, 28 Thg 9 – CN, 4 Thg 10, 2026". */
export function rangeLabel(from: string, to: string, locale: string) {
  const a = `${weekdayShort(from, locale)}, ${dayMonth(from, locale)}`;
  if (from === to) return `${a}, ${from.slice(0, 4)}`;
  return `${a} – ${weekdayShort(to, locale)}, ${dayMonth(to, locale)}, ${to.slice(0, 4)}`;
}

/** "Tháng 9, 2026". */
export const monthLabel = (day: string, locale: string) => cap(fmt(locale, { month: 'long', year: 'numeric' }).format(d(day)));

/** "2 phút trước". */
export function relativeTime(iso: string, locale: string) {
  const diff = (Date.parse(iso) - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(INTL[locale] ?? 'vi-VN', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}
