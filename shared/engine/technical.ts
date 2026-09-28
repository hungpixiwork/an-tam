// Chỉ báo kỹ thuật đơn giản trên chuỗi giá đóng cửa (tăng dần theo ngày). Hàm thuần, thiếu dữ liệu → null.

/** Trung bình giá đóng cửa của `period` phiên gần nhất. */
export function sma(closes: number[], period: number): number | null {
  if (period <= 0 || closes.length < period) return null;
  let sum = 0;
  for (let i = closes.length - period; i < closes.length; i++) sum += closes[i];
  return sum / period;
}

/** RSI kiểu Wilder, 0..100. Cần ít nhất period + 1 giá. */
export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (loss === 0) return gain === 0 ? 50 : 100;
  return 100 - 100 / (1 + gain / loss);
}

/** Mức giảm của giá cuối so với đỉnh trong chuỗi, 0..1. */
export function drawdownFromPeak(closes: number[]): number | null {
  if (closes.length === 0) return null;
  const peak = Math.max(...closes);
  if (peak <= 0) return null;
  return Math.max(0, (peak - closes[closes.length - 1]) / peak);
}

/** Độ lệch chuẩn của lợi nhuận ngày (không năm hóa), 0..1. */
export function volatility(closes: number[]): number | null {
  if (closes.length < 3) return null;
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) if (closes[i - 1] > 0) rets.push(closes[i] / closes[i - 1] - 1);
  if (rets.length < 2) return null;
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance);
}
