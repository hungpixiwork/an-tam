import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, RefreshCw, type LucideIcon } from 'lucide-react';
import { formatPct } from '@shared/format';
import { Button, IconTile, cx, type Tone } from './core';

/* ───────── Số liệu ───────── */

/** Mũi tên ↑/↓ + %; `goodWhenUp=false` đảo màu (ví dụ chi phí tăng là xấu). */
export function DeltaBadge({ value, goodWhenUp = true, className }: { value: number | null; goodWhenUp?: boolean; className?: string }) {
  if (value === null || !Number.isFinite(value)) return null;
  const up = value >= 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={cx('inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold', good ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600', className)}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden />
      {formatPct(Math.abs(value))}
    </span>
  );
}

/** Màu vòng điểm theo mức: xanh ≥80, cam 60–79, đỏ <60. */
export const scoreColor = (score: number) => (score >= 80 ? '#1FA16B' : score >= 60 ? '#F5A524' : '#EF4444');

/** Vòng tròn điểm (SVG). `max` mặc định 100; dùng max=10 cho thang 10. */
export function ScoreRing({ score, max = 100, size = 128, stroke = 14, color, children, label }: {
  score: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, Math.max(0, score / max));
  const col = color ?? scoreColor((score / max) * 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label ?? `${score}/${max}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeOpacity={0.15} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? (
          <span className="font-bold text-ink">
            <span className="text-[32px] leading-none">{score}</span>
            <span className="text-base text-ink-soft">/{max}</span>
          </span>
        )}
      </div>
    </div>
  );
}

/* ───────── Trạng thái ───────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-xl bg-[#E8EEF4]', className)} aria-hidden />;
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra';
  return (
    <div role="alert" className={cx('flex flex-col items-center justify-center gap-3 rounded-2xl border border-danger-50 bg-white p-8 text-center', className)}>
      <p className="font-semibold text-ink">Không tải được dữ liệu</p>
      <p className="max-w-md text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <Button variant="white" size="sm" icon={RefreshCw} onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

/** Chưa có dữ liệu: icon + câu giải thích + hành động gợi ý nhập. */
export function EmptyState({ icon, tone = 'blue', title, body, action, className, compact }: {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Dùng bên trong card (không viền, padding nhỏ). */
  compact?: boolean;
}) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-3 text-center', compact ? 'py-6' : 'rounded-2xl border border-dashed border-line bg-white px-6 py-10', className)}>
      <IconTile icon={icon} tone={tone} size="lg" />
      <div className="max-w-md">
        <p className="font-bold text-ink">{title}</p>
        {body && <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>}
      </div>
      {action}
    </div>
  );
}

/** Khung skeleton mặc định cho một màn đang tải: banner + lưới card. */
export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải">
      <Skeleton className="h-[180px]" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[170px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skeleton className="h-[260px]" />
        <Skeleton className="h-[260px]" />
      </div>
    </div>
  );
}

/* ───────── Chữ nhấn mạnh ───────── */

const RICH_CLASS: Record<string, string> = {
  em: 'text-primary-700',
  danger: 'font-bold text-danger-600',
  success: 'font-bold text-success-600',
  accent: 'text-accent-600',
};

/**
 * Hiển thị chuỗi từ engine có đánh dấu {em:...}, {danger:...}, {success:...}, {accent:...}
 * và xuống dòng bằng \n.
 */
export function Rich({ text, className }: { text: string; className?: string }) {
  const nodes: ReactNode[] = [];
  const re = /\{(em|danger|success|accent):([^}]*)\}|\n/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(m[0] === '\n' ? <br key={i++} /> : <span key={i++} className={RICH_CLASS[m[1]]}>{m[2]}</span>);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <span className={className}>{nodes}</span>;
}
