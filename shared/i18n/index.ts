export type Locale = 'vi' | 'en' | 'zh';
export type Currency = 'VND' | 'CNY' | 'USD';

import viMessages from './vi/index';
import enMessages from './en/index';
import zhMessages from './zh/index';

export function getMessages(locale: Locale): Record<string, string> {
  switch (locale) {
    case 'vi': return viMessages;
    case 'en': return enMessages;
    case 'zh': return zhMessages;
    default: return viMessages;
  }
}

export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const msgs = getMessages(locale);
  let str = msgs[key];
  if (str === undefined) return key; // fallback
  
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`{${k}}`, 'g'), String(v));
    }
  }
  return str;
}
