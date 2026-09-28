// Nút "Áp dụng" 1 chạm cho một gợi ý: xem trước trước → sau, áp dụng (ghi vào trang CRUD tương ứng),
// sau đó hiện "Đã cập nhật · Mở trang · Hoàn tác" trong 10 phút. Dùng ở Mô phỏng, Lựa chọn và dải liên kết trên trang CRUD.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Loader2, Undo2 } from 'lucide-react';
import type { SuggestedAction } from '@shared/types/api/decision';
import { cx } from '@/components/ui';
import { useApplyAction, useUndoAction, type ApplyResult } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { describeAction } from './describe';

export interface ApplyProps {
  action?: SuggestedAction;
  to?: string | null;
  /** Tên hành động ghi vào nhật ký (audit). */
  title: string;
  stepKey?: string;
  choiceId?: string;
  /** Đã áp dụng trước đó (từ /actions/applied) → chỉ hiện "Đã áp dụng". */
  applied?: boolean;
  compact?: boolean;
  className?: string;
  /** Gọi ngay khi áp dụng xong (nơi chứa giữ dòng này lại để còn nút Hoàn tác). */
  onApplied?: () => void;
}

/** Dòng trước → sau (không có nút) — dùng khi muốn tự đặt nút ở chỗ khác. */
export function ActionDiffLine({ action, className }: { action: SuggestedAction; className?: string }) {
  const { t } = useLocale();
  const d = describeAction(t, action);
  if (!d) return null;
  return (
    <p className={cx('flex flex-wrap items-center gap-1 text-[11.5px] text-ink-soft', className)}>
      {d.before && <><span className="line-through decoration-slate-300">{d.before}</span><ArrowRight className="h-3 w-3" aria-hidden /></>}
      <span className="font-semibold text-ink">{d.after}</span>
      {d.line && <span>· {d.line}</span>}
    </p>
  );
}

export function ApplyAction({ action, to, title, stepKey, choiceId, applied, compact, className, onApplied }: ApplyProps) {
  const { t } = useLocale();
  const apply = useApplyAction();
  const undo = useUndoAction();
  const [done, setDone] = useState<ApplyResult | null>(null);
  const [undone, setUndone] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!done || undone) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [done, undone]);
  const canUndo = !!done && !undone && done.status === 'done' && now < Date.parse(done.undoUntil);
  const link = done?.to ?? to;
  const btn = compact ? 'h-7 px-2.5 text-[11.5px]' : 'h-8 px-3 text-[12.5px]';

  if (applied && !done) {
    return (
      <span className={cx('inline-flex items-center gap-1 text-[12px] font-semibold text-[#137A4F]', className)}>
        <Check className="h-3.5 w-3.5" aria-hidden />{t('action.applied')}
        {to && <Link to={to} className="ml-1 font-bold text-accent-700 hover:underline">{t('action.open')} ›</Link>}
      </span>
    );
  }
  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)} aria-live="polite">
      {!done && action && (
        <button
          type="button"
          disabled={apply.isPending}
          onClick={() => apply.mutate({ ...action, title, stepKey, choiceId }, { onSuccess: (r) => { setDone(r); onApplied?.(); } })}
          className={cx('inline-flex items-center gap-1.5 rounded-lg bg-primary-700 font-bold text-white hover:bg-primary-800 disabled:opacity-60', btn)}
        >
          {apply.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
          {t('action.apply')}
        </button>
      )}
      {done && (
        <span className={cx('inline-flex items-center gap-1 text-[12px] font-semibold', done.status === 'done' && !undone ? 'text-[#137A4F]' : 'text-ink-soft')}>
          {undone ? t('action.undone') : done.status === 'done' ? <><Check className="h-3.5 w-3.5" aria-hidden />{t('action.done')}</> : done.error ?? t('action.failed')}
        </span>
      )}
      {canUndo && (
        <button type="button" disabled={undo.isPending} onClick={() => undo.mutate({ id: done!.id, type: action?.type ?? '' }, { onSuccess: () => setUndone(true) })} className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-soft hover:text-ink hover:underline">
          <Undo2 className="h-3.5 w-3.5" aria-hidden />{t('action.undo')}
        </button>
      )}
      {link && (
        <Link to={link} className="text-[12px] font-bold text-accent-700 hover:underline">{t('action.open')} ›</Link>
      )}
      {(apply.error || undo.error) && <span className="text-[12px] text-danger-600" role="alert">{(apply.error ?? undo.error)?.message}</span>}
    </div>
  );
}
