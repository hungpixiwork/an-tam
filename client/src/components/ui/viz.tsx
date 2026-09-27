import type { ReactNode } from 'react';
import { TONE_EXT, TONE_HEX, cx, type ExtTone } from './core';

/* ───────── Thanh xếp chồng ───────── */

export interface StackedSegment {
  label: ReactNode;
  value: number;
  /** Màu hex; ưu tiên hơn `tone`. */
  color?: string;
  tone?: ExtTone;
  key?: string;
}

export interface StackedBarProps {
  segments: StackedSegment[];
  showLegend?: boolean;
  /** Định dạng giá trị trong chú giải (ví dụ formatVnd). */
  formatValue?: (v: number) => ReactNode;
  /** Ẩn % trong chú giải. */
  hidePercent?: boolean;
  height?: number;
  ariaLabel?: string;
  className?: string;
  legendClassName?: string;
}

const FALLBACK_TONES: ExtTone[] = ['green', 'blue', 'amber', 'violet', 'rose', 'sky', 'orange', 'teal', 'gray'];

/** Làm tròn % sao cho tổng đúng 100 (phương pháp phần dư lớn nhất). */
export function roundedShares(values: number[]): number[] {
  const total = values.reduce((s, v) => s + Math.max(0, v), 0);
  if (total <= 0) return values.map(() => 0);
  const raw = values.map((v) => (Math.max(0, v) / total) * 100);
  const floors = raw.map(Math.floor);
  let rest = 100 - floors.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => [v - floors[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (rest <= 0) break;
    floors[i] += 1;
    rest -= 1;
  }
  return floors;
}

/** Thanh ngang nhiều đoạn + chú giải (giá trị + %) — mockup "Tài sản hiện tại", "Nguồn thu nhập". */
export function StackedBar({ segments, showLegend = true, formatValue = (v) => v.toLocaleString('vi-VN'), hidePercent, height = 12, ariaLabel, className, legendClassName }: StackedBarProps) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const shares = roundedShares(segments.map((s) => s.value));
  const colorOf = (s: StackedSegment, i: number) => s.color ?? TONE_HEX[s.tone ?? FALLBACK_TONES[i % FALLBACK_TONES.length]];
  const summary = segments.map((s, i) => `${typeof s.label === 'string' ? s.label : ''} ${shares[i]}%`).join(', ');

  return (
    <div className={cx('min-w-0', className)}>
      <div className="flex w-full gap-0.5 overflow-hidden rounded-full bg-[#E6ECF2]" style={{ height }} role="img" aria-label={ariaLabel ? `${ariaLabel}: ${summary}` : summary}>
        {total > 0 &&
          segments.map((s, i) =>
            s.value > 0 ? <div key={s.key ?? i} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(s.value / total) * 100}%`, background: colorOf(s, i) }} /> : null,
          )}
      </div>
      {showLegend && (
        <ul className={cx('mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-[repeat(auto-fit,minmax(110px,1fr))]', legendClassName)}>
          {segments.map((s, i) => (
            <li key={s.key ?? i} className="min-w-0">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(s, i) }} aria-hidden />
                <span className="truncate">{s.label}</span>
              </p>
              <p className="mt-0.5 pl-[18px] text-[12.5px] text-ink-soft tabular-nums">
                {formatValue(s.value)}
                {!hidePercent && <span className="block">({shares[i]}%)</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────── Cột mini ───────── */

export interface MiniBarsProps {
  /** Giá trị từng cột (null = không có dữ liệu → cột xám thấp). */
  values: (number | null)[];
  /** Màu cột dương / âm. */
  positive?: string;
  negative?: string;
  height?: number;
  barWidth?: number;
  ariaLabel: string;
  className?: string;
}

/** Biểu đồ cột mini (mockup Tổng quan "Dòng tiền tháng này"): cột xanh khi ≥ 0, đỏ khi âm, chung đường 0. */
export function MiniBars({ values, positive = TONE_HEX.green, negative = TONE_HEX.red, height = 52, barWidth = 6, ariaLabel, className }: MiniBarsProps) {
  const nums = values.map((v) => v ?? 0);
  const max = Math.max(0, ...nums);
  const min = Math.min(0, ...nums);
  const span = max - min || 1;
  const zero = (max / span) * height;
  return (
    <div role="img" aria-label={ariaLabel} className={cx('relative flex shrink-0 items-stretch gap-[3px]', className)} style={{ height }}>
      {values.map((v, i) => {
        const h = v === null ? 2 : Math.max(3, (Math.abs(v) / span) * height);
        const up = (v ?? 0) >= 0;
        return (
          <div key={i} className="relative" style={{ width: barWidth }}>
            <span
              className="absolute left-0 w-full rounded-[2px]"
              style={{ height: h, background: v === null ? '#CBD5E1' : up ? positive : negative, ...(up ? { bottom: height - zero } : { top: zero }) }}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ───────── Đồng hồ nửa vòng ───────── */

export interface GaugeThreshold { at: number; tone: ExtTone }

export interface GaugeProps {
  value: number;
  max?: number;
  /** Nhãn mức phía trên số ("Cao"). */
  label?: ReactNode;
  /** Tone theo ngưỡng: áp dụng ngưỡng lớn nhất có `at` ≤ value. Mặc định cho điểm rủi ro (cao = xấu). */
  thresholds?: GaugeThreshold[];
  /** Ép tone, bỏ qua thresholds. */
  tone?: ExtTone;
  size?: number;
  stroke?: number;
  ariaLabel?: string;
  className?: string;
}

const RISK_THRESHOLDS: GaugeThreshold[] = [
  { at: 0, tone: 'green' },
  { at: 40, tone: 'orange' },
  { at: 65, tone: 'red' },
];

export function gaugeTone(value: number, thresholds: GaugeThreshold[] = RISK_THRESHOLDS): ExtTone {
  return [...thresholds].sort((a, b) => a.at - b.at).reduce<ExtTone>((tone, t) => (value >= t.at ? t.tone : tone), thresholds[0]?.tone ?? 'gray');
}

/** Đồng hồ nửa vòng (mockup Danh mục "Cao 70/100"). */
export function Gauge({ value, max = 100, label, thresholds, tone, size = 190, stroke = 16, ariaLabel, className }: GaugeProps) {
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const t = tone ?? gaugeTone((value / (max || 1)) * 100, thresholds);
  const color = TONE_HEX[t];
  const r = (size - stroke) / 2;
  const cy0 = size / 2;
  const h = size / 2 + stroke / 2;
  const arc = `M ${stroke / 2} ${cy0} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy0}`;
  return (
    <div className={cx('relative mx-auto', className)} style={{ width: size, height: h + 8 }} role="img" aria-label={ariaLabel ?? `${typeof label === 'string' ? `${label}: ` : ''}${value}/${max}`}>
      <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} aria-hidden>
        <path d={arc} fill="none" stroke={color} strokeOpacity={0.15} strokeWidth={stroke} strokeLinecap="round" />
        {frac > 0 && <path d={arc} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" pathLength={100} strokeDasharray={`${frac * 100} 100`} className="transition-[stroke-dasharray] duration-700" />}
      </svg>
      <div className="absolute inset-x-0 bottom-1 flex flex-col items-center text-center">
        {label && <span className={cx('text-[15px] font-bold', TONE_EXT[t].text)}>{label}</span>}
        <span className="font-extrabold text-ink tabular-nums">
          <span className="text-[30px] leading-none">{value}</span>
          <span className="text-[15px] font-semibold text-ink-soft">/{max}</span>
        </span>
      </div>
    </div>
  );
}
