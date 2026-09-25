import { useEffect, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { formatVnd } from '@shared/format';
import { cx } from './core';

/* ───────── Ô nhập ───────── */

export const inputClass =
  'h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-ink-mute focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100 disabled:bg-slate-50';

/** Nhãn + ô nhập + gợi ý. `children` nhận id để gắn vào ô nhập. */
export function FormField({ label, hint, className, children }: { label: ReactNode; hint?: ReactNode; className?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputClass, className)} {...rest} />;
}

const groupDigits = (n: number) => (n > 0 ? n.toLocaleString('vi-VN') : '');

/**
 * Ô nhập tiền VND: gõ số, tự chèn dấu chấm ngăn cách, hiện "≈ 35 triệu" bên dưới.
 * `chips` là các mức bấm nhanh (đặt thẳng giá trị).
 */
export function MoneyInput({ value, onChange, chips, id, placeholder = '0', autoFocus, label, showHint = true }: {
  value: number;
  onChange: (v: number) => void;
  chips?: number[];
  id?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** aria-label khi không có FormField bọc ngoài. */
  label?: string;
  showHint?: boolean;
}) {
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          aria-label={label}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={groupDigits(value)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 15);
            onChange(digits ? Number(digits) : 0);
          }}
          className={cx(inputClass, 'pr-9 text-right font-semibold tabular-nums')}
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-mute">đ</span>
      </div>
      {(showHint || chips) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {chips?.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={cx(
                'h-7 rounded-full border px-2.5 text-xs font-semibold transition-colors',
                value === c ? 'border-accent-600 bg-accent-50 text-accent-700' : 'border-line bg-white text-ink-soft hover:bg-slate-50',
              )}
            >
              {formatVnd(c)}
            </button>
          ))}
          {showHint && value > 0 && <span className="ml-auto text-xs text-ink-mute">≈ {formatVnd(value)}</span>}
        </div>
      )}
    </div>
  );
}

/** Nhóm nút chọn 1 (Thu / Chi, Anh / Chị / Bạn...). */
export function Segmented<T extends string>({ value, onChange, options, label, className }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; tone?: 'green' | 'red' }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('flex gap-1 rounded-xl bg-slate-100 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'h-9 flex-1 rounded-lg px-3 text-sm font-semibold transition-colors',
              active
                ? cx('bg-white shadow-sm', o.tone === 'green' ? 'text-success-600' : o.tone === 'red' ? 'text-danger-600' : 'text-accent-700')
                : 'text-ink-soft hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function FormAlert({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex gap-2.5 rounded-xl bg-danger-50 p-3">
      <AlertCircle className="h-5 w-5 shrink-0 text-danger-600" aria-hidden />
      <p className="text-sm text-danger-600">{error instanceof Error ? error.message : 'Đã có lỗi xảy ra'}</p>
    </div>
  );
}

/* ───────── Hộp thoại ───────── */

export function Modal({ title, onClose, children, className }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={cx('max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-lift sm:rounded-2xl sm:p-6', className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-ink-soft hover:bg-slate-100" aria-label="Đóng">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
