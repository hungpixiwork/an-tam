import type { ReactNode } from 'react';
import { Info, type LucideIcon } from 'lucide-react';
import { Badge, IconTile, ProgressBar, TONE_HEX, cx, type ExtTone } from './core';
import { DeltaBadge, ScoreRing } from './data';

/* ───────── KPI ───────── */

export interface KpiCardProps {
  icon: LucideIcon;
  tone?: ExtTone;
  label: ReactNode;
  /** Giá trị đã định dạng sẵn (ví dụ "28.500.000đ", "80"). */
  value: ReactNode;
  /** Đơn vị nhỏ sau giá trị ("/100", "tháng"). */
  unit?: ReactNode;
  /** % thay đổi; `goodWhenUp=false` khi tăng là xấu (chi tiêu). */
  delta?: { value: number | null; goodWhenUp?: boolean };
  /** Badge tùy ý bên phải giá trị (ví dụ "Tốt"). */
  badge?: ReactNode;
  /** Thanh tiến độ 0..1 dưới giá trị. */
  progress?: { value: number; tone?: ExtTone; color?: string; label?: string };
  /** Dòng chú thích nhỏ cuối thẻ. */
  footnote?: ReactNode;
  /** Phần phụ bên phải hàng tiêu đề (ví dụ biểu đồ cột mini). */
  aside?: ReactNode;
  /** Ghi đè cỡ chữ giá trị (mặc định 26px). */
  valueClassName?: string;
  /** Tooltip của icon (i) cạnh nhãn. */
  info?: string;
  /** Dòng nhỏ ngay dưới giá trị ("So với tháng trước"). */
  sub?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function KpiCard({ icon, tone = 'green', label, value, unit, delta, badge, progress, footnote, aside, valueClassName, info, sub, children, className }: KpiCardProps) {
  return (
    <section className={cx('flex min-w-0 flex-col justify-between rounded-2xl border border-line bg-white p-3 sm:p-5 shadow-card', className)}>
      <div className="flex items-start gap-2 sm:gap-3.5">
        <IconTile icon={icon} tone={tone} size="sm" className="h-9 w-9 sm:h-12 sm:w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[12px] sm:text-[14px] font-semibold leading-tight text-ink">
            <span>{label}</span>
            {info && (
              <span title={info} className="inline-flex shrink-0 text-ink-mute" aria-label={info} role="img">
                <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
              </span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <p className={cx('whitespace-nowrap font-extrabold leading-none tracking-tight text-ink tabular-nums', valueClassName ?? 'text-[17px] sm:text-[23px]')}>
              {value}
              {unit && <span className="ml-0.5 text-[11px] sm:text-[14px] font-semibold text-ink-soft">{unit}</span>}
            </p>
            {delta && <DeltaBadge value={delta.value} goodWhenUp={delta.goodWhenUp} className="h-4 sm:h-5 text-[10px] sm:text-xs px-1.5" />}
            {badge}
            {aside && <div className="ml-auto shrink-0 hidden sm:block">{aside}</div>}
          </div>
          {sub && <div className="mt-1 text-[10.5px] sm:text-[12px] text-ink-soft leading-tight">{sub}</div>}
        </div>
      </div>
      {progress && (
        <ProgressBar
          value={progress.value}
          color={progress.color ?? TONE_HEX[progress.tone ?? tone]}
          label={progress.label}
          className="mt-3 sm:mt-4"
        />
      )}
      {footnote && <div className="mt-2.5 sm:mt-3 text-[11.5px] sm:text-[12.5px] leading-relaxed text-ink-soft">{footnote}</div>}
      {children}
    </section>
  );
}

/* ───────── Vòng tiến độ nhỏ ───────── */

export interface ProgressRingProps {
  /** Phần trăm 0..100. */
  value: number;
  label?: ReactNode;
  icon?: LucideIcon;
  tone?: ExtTone;
  size?: number;
  stroke?: number;
  /** Chữ dưới vòng; mặc định "NN%". Truyền null để ẩn. */
  valueLabel?: ReactNode | null;
  /** Badge trạng thái dưới giá trị ("Đang đi đúng hướng"). */
  status?: { label: ReactNode; tone?: ExtTone };
  ariaLabel?: string;
  className?: string;
}

/** Vòng tròn có icon + nhãn ở tâm, % và badge trạng thái bên dưới (mockup "Phân bổ nguồn lực"). */
export function ProgressRing({ value, label, icon: Icon, tone = 'green', size = 104, stroke = 9, valueLabel, status, ariaLabel, className }: ProgressRingProps) {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  const color = TONE_HEX[tone];
  return (
    <div className={cx('flex min-w-0 flex-col items-center text-center', className)}>
      <ScoreRing score={pct} max={100} size={size} stroke={stroke} color={color} label={ariaLabel ?? `${typeof label === 'string' ? `${label}: ` : ''}${pct}%`}>
        {Icon && <Icon className="h-6 w-6" style={{ color }} strokeWidth={2.2} aria-hidden />}
        {label && <span className="mt-1 text-[12px] font-semibold leading-tight text-ink">{label}</span>}
      </ScoreRing>
      {valueLabel !== null && <p className="mt-2 text-[17px] font-bold text-ink tabular-nums">{valueLabel ?? `${pct}%`}</p>}
      {status && (
        <Badge size="sm" tone={status.tone ?? tone} className="mt-1.5 !h-auto min-h-6 max-w-full !whitespace-normal py-0.5 text-center leading-tight">
          {status.label}
        </Badge>
      )}
    </div>
  );
}
