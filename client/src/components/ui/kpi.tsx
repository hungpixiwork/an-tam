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
  /** Tooltip của icon (i) cạnh nhãn. */
  info?: string;
  children?: ReactNode;
  className?: string;
}

/** Thẻ chỉ số: icon tile + nhãn + giá trị lớn + delta/badge + progress + chú thích (mockup Tổng quan, Sổ thu chi, Danh mục). */
export function KpiCard({ icon, tone = 'green', label, value, unit, delta, badge, progress, footnote, info, children, className }: KpiCardProps) {
  return (
    <section className={cx('flex min-w-0 flex-col rounded-2xl border border-line bg-white p-5 shadow-card', className)}>
      <div className="flex items-start gap-4">
        <IconTile icon={icon} tone={tone} size="lg" className="h-14 w-14 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
            <span className="truncate">{label}</span>
            {info && (
              <span title={info} className="inline-flex shrink-0 text-ink-mute" aria-label={info} role="img">
                <Info className="h-3.5 w-3.5" aria-hidden />
              </span>
            )}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <p className="text-[26px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
              {value}
              {unit && <span className="ml-1 text-[15px] font-semibold text-ink-soft">{unit}</span>}
            </p>
            {delta && <DeltaBadge value={delta.value} goodWhenUp={delta.goodWhenUp} className="h-6 text-xs" />}
            {badge}
          </div>
        </div>
      </div>
      {progress && (
        <ProgressBar
          value={progress.value}
          color={progress.color ?? TONE_HEX[progress.tone ?? tone]}
          label={progress.label}
          className="mt-4"
        />
      )}
      {footnote && <div className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">{footnote}</div>}
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
        <Badge size="sm" tone={status.tone ?? tone} className="mt-1.5">
          {status.label}
        </Badge>
      )}
    </div>
  );
}
