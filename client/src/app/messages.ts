// Từ điển cho trình duyệt: tiếng Việt nạp sẵn, tiếng Anh / tiếng Trung tải khi cần (không nằm trong bundle khởi đầu).
// Máy chủ và test vẫn dùng shared/i18n/index.ts (nạp đủ 3 ngôn ngữ).

import type { Locale } from '@shared/i18n';
import vi from '@shared/i18n/vi/index';
import { interpolate } from '@shared/i18n/interpolate';

const cache: Partial<Record<Locale, Record<string, string>>> = { vi };

export const messagesReady = (locale: Locale): boolean => !!cache[locale];

export async function loadMessages(locale: Locale): Promise<Record<string, string>> {
  const hit = cache[locale];
  if (hit) return hit;
  const mod = locale === 'en' ? await import('@shared/i18n/en/index') : await import('@shared/i18n/zh/index');
  cache[locale] = mod.default;
  return mod.default;
}

/** Dịch đồng bộ; ngôn ngữ chưa tải xong thì tạm dùng tiếng Việt. */
export const translate = (locale: Locale, key: string, vars?: Record<string, string | number>): string =>
  interpolate(cache[locale] ?? vi, key, vars);
