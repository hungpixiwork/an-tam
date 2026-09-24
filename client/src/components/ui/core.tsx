import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/* ───────── Tone ───────── */

export type Tone = 'blue' | 'green' | 'orange' | 'violet' | 'red' | 'teal' | 'gray';

/** Nền nhạt + màu chữ/icon đậm cho từng tone — dùng cho IconTile, Badge, card nhấn. */
export const TONE: Record<Tone, { soft: string; text: string; solid: string; ring: string }> = {
  blue:   { soft: 'bg-accent-50',  text: 'text-accent-600',  solid: 'bg-accent-600',  ring: 'ring-accent-100' },
  green:  { soft: 'bg-success-50', text: 'text-success-600', solid: 'bg-success-500', ring: 'ring-success-50' },
  orange: { soft: 'bg-warning-50', text: 'text-warning-600', solid: 'bg-warning-500', ring: 'ring-warning-50' },
  violet: { soft: 'bg-violet-50',  text: 'text-violet-600',  solid: 'bg-violet-500',  ring: 'ring-violet-50' },
  red:    { soft: 'bg-danger-50',  text: 'text-danger-600',  solid: 'bg-danger-500',  ring: 'ring-danger-50' },
  teal:   { soft: 'bg-primary-50', text: 'text-primary-700', solid: 'bg-primary-700', ring: 'ring-primary-50' },
  gray:   { soft: 'bg-slate-100',  text: 'text-ink-soft',    solid: 'bg-slate-400',   ring: 'ring-slate-100' },
};

/* ───────── Card ───────── */

const CARD_TONE = {
  white: 'bg-white border-line',
  cream: 'bg-cream border-[#F3E6C8]',
  mint: 'bg-[#F1FAF5] border-[#D7EFE2]',
  rose: 'bg-[#FFF5F4] border-[#F9DAD6]',
  sky: 'bg-[#F3F8FE] border-[#DCE9F8]',
  violet: 'bg-[#F7F4FF] border-[#E6DEFD]',
} as const;

export function Card({ children, className, tone = 'white', as: As = 'section' }: {
  children: ReactNode;
  className?: string;
  tone?: keyof typeof CARD_TONE;
  as?: 'section' | 'div' | 'article';
}) {
  return <As className={cx('rounded-2xl border p-5 shadow-card', CARD_TONE[tone], className)}>{children}</As>;
}

/** Tiêu đề card: icon màu + tiêu đề 18px + phụ đề + vùng action bên phải. */
export function CardTitle({ icon: Icon, tone = 'blue', title, subtitle, action, className }: {
  icon?: LucideIcon;
  tone?: Tone;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && <Icon className={cx('mt-0.5 h-6 w-6 shrink-0', TONE[tone].text)} strokeWidth={2.2} aria-hidden />}
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-snug text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-soft">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function IconTile({ icon: Icon, tone = 'blue', size = 'md', className }: { icon: LucideIcon; tone?: Tone; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const box = size === 'sm' ? 'h-9 w-9 rounded-lg' : size === 'lg' ? 'h-12 w-12 rounded-xl' : 'h-11 w-11 rounded-xl';
  const ico = size === 'sm' ? 'h-[18px] w-[18px]' : size === 'lg' ? 'h-6 w-6' : 'h-[22px] w-[22px]';
  return (
    <span className={cx('inline-flex shrink-0 items-center justify-center', box, TONE[tone].soft, className)}>
      <Icon className={cx(ico, TONE[tone].text)} strokeWidth={2.2} aria-hidden />
    </span>
  );
}

/* ───────── Button ───────── */

const BTN = {
  primary: 'bg-primary-700 text-white hover:bg-primary-800 shadow-sm',
  accent: 'bg-accent-600 text-white hover:bg-accent-700 shadow-sm',
  soft: 'bg-accent-50 text-accent-700 hover:bg-accent-100',
  outline: 'border border-accent-600 text-accent-700 bg-white hover:bg-accent-50',
  ghost: 'text-accent-600 hover:bg-accent-50',
  danger: 'border border-danger-500 text-danger-600 bg-white hover:bg-danger-50',
  white: 'border border-line bg-white text-ink hover:bg-slate-50',
} as const;
export type ButtonVariant = keyof typeof BTN;

const btnClass = (variant: ButtonVariant, size: 'sm' | 'md' | 'lg', className?: string) =>
  cx(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:cursor-not-allowed disabled:opacity-60',
    size === 'sm' ? 'h-9 px-3.5 text-[13px]' : size === 'lg' ? 'h-12 px-6 text-[15px]' : 'h-11 px-5 text-sm',
    BTN[variant],
    className,
  );

interface BtnOwn { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg'; arrow?: boolean; icon?: LucideIcon }

export function Button({ variant = 'primary', size = 'md', arrow, icon: Icon, className, children, type = 'button', ...rest }: BtnOwn & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={btnClass(variant, size, className)} {...rest}>
      {Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
      {arrow && <ArrowRight className="h-4 w-4" aria-hidden />}
    </button>
  );
}

export function ButtonLink({ variant = 'primary', size = 'md', arrow, icon: Icon, className, children, ...rest }: BtnOwn & LinkProps) {
  return (
    <Link className={btnClass(variant, size, className)} {...rest}>
      {Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
      {arrow && <ArrowRight className="h-4 w-4" aria-hidden />}
    </Link>
  );
}

/** Link chữ xanh có mũi tên ("Xem chi tiết →"). */
export function TextLink({ children, className, ...rest }: LinkProps) {
  return (
    <Link className={cx('inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-600 hover:text-accent-700', className)} {...rest}>
      {children}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}

/* ───────── Badge ───────── */

export function Badge({ tone = 'blue', children, icon: Icon, className }: { tone?: Tone; children: ReactNode; icon?: LucideIcon; className?: string }) {
  return (
    <span className={cx('inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold', TONE[tone].soft, TONE[tone].text, className)}>
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </span>
  );
}

/* ───────── Tiến độ ───────── */

export function ProgressBar({ value, color = '#1FA16B', className, label }: { value: number; color?: string; className?: string; label?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-[#E6ECF2]', className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ───────── Form ───────── */

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:opacity-60',
        checked ? 'bg-accent-600' : 'bg-[#CBD5E1]',
      )}
    >
      <span className={cx('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

export function Select<T extends string | number>({ value, onChange, options, label, className }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <select
      aria-label={label}
      value={String(value)}
      onChange={(e) => onChange(options.find((o) => String(o.value) === e.target.value)!.value)}
      className={cx(
        'h-9 cursor-pointer appearance-none rounded-lg border border-line bg-white bg-[length:16px] bg-[right_10px_center] bg-no-repeat pl-3 pr-9 text-[13px] font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent-100',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235B6B7F' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
