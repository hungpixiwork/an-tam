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
