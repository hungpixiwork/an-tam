import type { Currency, Locale } from '../i18n';

// Định dạng số / tiền kiểu Việt Nam: dấu phẩy thập phân, đơn vị tỷ / triệu / nghìn.

const trimDecimals = (value: number, digits: number): string => {
  const fixed = value.toFixed(digits);
  return (fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed).replace('.', ',');
};

export interface VndOptions {
  /** Thêm dấu '+' khi dương. */
  sign?: boolean;
  /** Nhãn trục biểu đồ: luôn 1 chữ số thập phân cho tỷ ("1,0 tỷ"). */
  axis?: boolean;
}

export function formatVnd(amount: number, opts: VndOptions = {}): string {
  const abs = Math.abs(amount);
  const prefix = amount < 0 ? '-' : opts.sign && amount > 0 ? '+' : '';
  let body: string;
  if (abs >= 1e9) {
    body = `${opts.axis ? (abs / 1e9).toFixed(1).replace('.', ',') : trimDecimals(abs / 1e9, 2)} tỷ`;
  } else if (abs >= 1e6) {
    const m = abs / 1e6;
    body = `${m >= 100 ? Math.round(m) : trimDecimals(m, 1)} triệu`;
  } else if (abs >= 1e3) {
    body = `${Math.round(abs / 1e3)} nghìn`;
  } else {
    body = `${Math.round(abs)} đ`;
  }
  return prefix + body;
}

/** 0.061 → "6%"; digits cho phép "1,5%". */
export function formatPct(fraction: number, digits = 0, sign = false): string {
  const v = fraction * 100;
  const prefix = v < 0 ? '-' : sign && v > 0 ? '+' : '';
  return `${prefix}${trimDecimals(Math.abs(v), digits)}%`;
}

/** '2030-08' → "Tháng 8/2030". */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-');
  return `Tháng ${Number(m)}/${y}`;
}

/** Số tháng → "8 tháng" / "4 năm" / "4 năm 11 tháng". */
export function formatDuration(months: number): string {
  const m = Math.max(0, Math.round(months));
  const years = Math.floor(m / 12);
  const rest = m % 12;
  if (years === 0) return `${rest} tháng`;
  return rest === 0 ? `${years} năm` : `${years} năm ${rest} tháng`;
}

export function formatCurrency(amount: number, currency: Currency, opts?: { sign?: boolean }): string {
  const abs = Math.abs(amount);
  const prefix = amount < 0 ? '-' : opts?.sign && amount > 0 ? '+' : '';
  let body: string;
  if (currency === 'VND') {
    if (abs >= 1e9) {
      body = `${trimDecimals(abs / 1e9, 2)} tỷ`;
    } else if (abs >= 1e6) {
      const m = abs / 1e6;
      body = `${m >= 100 ? Math.round(m) : trimDecimals(m, 1)} triệu`;
    } else if (abs >= 1e3) {
      body = `${Math.round(abs / 1e3)} nghìn`;
    } else {
      body = `${Math.round(abs)} đ`;
    }
    return prefix + body;
  }
  
  if (currency === 'CNY') {
    if (abs >= 10000) {
      body = `${trimDecimals(abs / 10000, 2)}万`;
    } else {
      body = `¥${new Intl.NumberFormat('en-US').format(Math.round(abs))}`;
    }
    return prefix + body;
  }
  
  // USD
  body = `$${new Intl.NumberFormat('en-US').format(Math.round(abs))}`;
  return prefix + body;
}

export function formatMonthLocale(month: string, locale: Locale): string {
  const [y, m] = month.split('-');
  const date = new Date(Number(y), Number(m) - 1);
  if (locale === 'vi') return `Tháng ${Number(m)}/${y}`;
  if (locale === 'en') return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
  if (locale === 'zh') return `${y}年${Number(m)}月`;
  return month;
}

export function formatDurationLocale(months: number, locale: Locale): string {
  const m = Math.max(0, Math.round(months));
  const years = Math.floor(m / 12);
  const rest = m % 12;
  
  if (locale === 'vi') {
    if (years === 0) return `${rest} tháng`;
    return rest === 0 ? `${years} năm` : `${years} năm ${rest} tháng`;
  }
  if (locale === 'en') {
    const yStr = years === 1 ? 'year' : 'years';
    const mStr = rest === 1 ? 'month' : 'months';
    if (years === 0) return `${rest} ${mStr}`;
    return rest === 0 ? `${years} ${yStr}` : `${years} ${yStr} ${rest} ${mStr}`;
  }
  if (locale === 'zh') {
    if (years === 0) return `${rest}个月`;
    return rest === 0 ? `${years}年` : `${years}年${rest}个月`;
  }
  return `${months}m`;
}
