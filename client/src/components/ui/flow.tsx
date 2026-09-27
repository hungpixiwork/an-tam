import type { ReactNode } from 'react';
import { Check, CircleCheck, CircleDashed, CircleX, Loader2, Pencil, X } from 'lucide-react';
import { TONE_EXT, TONE_HEX, cx, type ExtTone } from './core';

/* ───────── Stepper ngang ───────── */

export type StepState = 'done' | 'current' | 'todo';

export interface StepItem { label: ReactNode; sub?: ReactNode; state: StepState }

export interface StepperProps {
  steps: StepItem[];
  /** Màu bước đã xong + đường nối. */
  tone?: ExtTone;
  /** Màu bước hiện tại (ví dụ đỏ khi "Chưa an toàn"); mặc định = tone. */
  currentTone?: ExtTone;
  ariaLabel?: string;
  /** Nhãn đọc cho trình đọc màn hình theo trạng thái. */
  stateLabels?: Partial<Record<StepState, string>>;
  className?: string;
}

/** Cột mốc ngang (mockup Tổng quan "Tìm hiểu → Chuẩn bị tài chính → …", Quỹ an toàn "Hiện tại / 6 tháng / 12 tháng"). */
export function Stepper({ steps, tone = 'green', currentTone, ariaLabel, stateLabels, className }: StepperProps) {
  const done = TONE_HEX[tone];
  const cur = TONE_HEX[currentTone ?? tone];
  const idle = '#CBD5E1';
  return (
    <ol aria-label={ariaLabel} className={cx('grid', className)} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((s, i) => {
        const next = steps[i + 1];
        const leftOn = s.state !== 'todo';
        const rightOn = !!next && next.state !== 'todo';
        return (
          <li key={i} className="flex min-w-0 flex-col items-center text-center" aria-current={s.state === 'current' ? 'step' : undefined}>
            <div className="relative flex h-6 w-full items-center justify-center">
              {i > 0 && <span className="absolute left-0 right-1/2 top-1/2 h-0.5 -translate-y-1/2" style={{ background: leftOn ? done : idle }} aria-hidden />}
              {next && <span className="absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2" style={{ background: rightOn ? done : idle }} aria-hidden />}
              {s.state === 'done' ? (
                <span className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: done }}>
                  <Check className="h-3 w-3" strokeWidth={3.2} aria-hidden />
                </span>
              ) : s.state === 'current' ? (
                <span className="relative z-10 h-5 w-5 rounded-full border-[3px] bg-white" style={{ borderColor: cur }} />
              ) : (
                <span className="relative z-10 h-4 w-4 rounded-full border-2 bg-white" style={{ borderColor: idle }} />
              )}
            </div>
            <p className={cx('mt-2 text-[12.5px] leading-snug', s.state === 'todo' ? 'text-ink-soft' : 'font-semibold text-ink')}>
              {s.label}
              {stateLabels?.[s.state] && <span className="sr-only"> — {stateLabels[s.state]}</span>}
            </p>
            {s.sub && (
              <p className={cx('mt-0.5 text-[12px] leading-snug', s.state === 'current' ? cx('font-semibold', TONE_EXT[currentTone ?? tone].text) : 'text-ink-soft')}>{s.sub}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ───────── Timeline dọc ───────── */

export type TimelineState = 'done' | 'running' | 'pending' | 'error';

export interface TimelineItem {
  id?: string;
  time?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  state: TimelineState;
  children?: ReactNode;
}

const TL_ICON = {
  done: { Icon: CircleCheck, cls: 'text-white fill-success-500' },
  running: { Icon: Loader2, cls: 'text-accent-600 animate-spin' },
  pending: { Icon: CircleDashed, cls: 'text-ink-mute' },
  error: { Icon: CircleX, cls: 'text-white fill-danger-500' },
} as const;

/** Nhật ký thực thi dọc (mockup AI Workspace): giờ · icon trạng thái · nội dung. */
export function Timeline({ items, ariaLabel, stateLabels, className }: {
  items: TimelineItem[];
  ariaLabel?: string;
  stateLabels?: Partial<Record<TimelineState, string>>;
  className?: string;
}) {
  const hasTime = items.some((it) => it.time !== undefined);
  return (
    <ol aria-label={ariaLabel} className={cx('min-w-0', className)}>
      {items.map((it, i) => {
        const { Icon, cls } = TL_ICON[it.state];
        const last = i === items.length - 1;
        return (
          <li key={it.id ?? i} className="flex gap-3" aria-busy={it.state === 'running' || undefined}>
            {hasTime && <span className="w-11 shrink-0 pt-0.5 text-right text-[12.5px] font-medium text-ink-soft tabular-nums">{it.time}</span>}
            <div className="relative flex w-5 shrink-0 justify-center">
              <Icon className={cx('relative z-10 mt-0.5 h-5 w-5 bg-white', cls)} strokeWidth={2.2} aria-hidden />
              {!last && <span className="absolute bottom-0 top-6 w-px bg-line" aria-hidden />}
            </div>
            <div className={cx('min-w-0 flex-1', last ? 'pb-0' : 'pb-4')}>
              <p className={cx('text-[13.5px] font-semibold leading-snug', it.state === 'error' ? 'text-danger-600' : 'text-ink')}>
                {it.title}
                {stateLabels?.[it.state] && <span className="sr-only"> — {stateLabels[it.state]}</span>}
              </p>
              {it.sub && <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{it.sub}</p>}
              {it.children && <div className="mt-2">{it.children}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ───────── Thanh phê duyệt ───────── */

export interface ApprovalBarProps {
  onApprove: () => void;
  onEdit?: () => void;
  onReject: () => void;
  labels: { approve: ReactNode; edit?: ReactNode; reject: ReactNode };
  /** true = khóa cả thanh; hoặc chỉ ra nút đang chạy để hiện spinner. */
  busy?: boolean | 'approve' | 'edit' | 'reject';
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/** Duyệt (xanh đậm) · Chỉnh sửa (viền xanh nhạt) · Từ chối (viền đỏ) — mockup Lịch AI, AI Workspace. */
export function ApprovalBar({ onApprove, onEdit, onReject, labels, busy, disabled, size = 'sm', className }: ApprovalBarProps) {
  const locked = !!busy || !!disabled;
  const h = size === 'sm' ? 'h-9 px-3.5 text-[13px]' : 'h-11 px-5 text-sm';
  const base = cx('inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:cursor-not-allowed disabled:opacity-60', h);
  const spin = (key: 'approve' | 'edit' | 'reject') => busy === key || (busy === true && key === 'approve');
  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)} aria-busy={!!busy || undefined}>
      <button type="button" onClick={onApprove} disabled={locked} className={cx(base, 'bg-primary-700 text-white shadow-sm hover:bg-primary-800')}>
        {spin('approve') ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden />}
        {labels.approve}
      </button>
      {onEdit && labels.edit && (
        <button type="button" onClick={onEdit} disabled={locked} className={cx(base, 'border border-accent-100 bg-accent-50 text-accent-700 hover:bg-accent-100')}>
          {spin('edit') ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Pencil className="h-4 w-4" aria-hidden />}
          {labels.edit}
        </button>
      )}
      <button type="button" onClick={onReject} disabled={locked} className={cx(base, 'border border-danger-100 bg-white text-danger-600 hover:bg-danger-50')}>
        {spin('reject') ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <X className="h-4 w-4" strokeWidth={2.6} aria-hidden />}
        {labels.reject}
      </button>
    </div>
  );
}
