// Dải gọn trên đầu trang CRUD: việc của quyết định lớn (lựa chọn đang ghim) liên quan tới trang này, áp dụng 1 chạm.
// Không có lựa chọn / chưa mô phỏng / đã làm hết → không hiện gì (không chiếm chỗ bố cục).

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { DecisionStep } from '@shared/types/api/decision';
import { Sparkles } from 'lucide-react';
import { useDecisionNext } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { cx } from '@/components/ui';
import { ActionDiffLine, ApplyAction } from './ActionCard';

export function DecisionStrip({ domain, className }: { domain: 'safety' | 'ledger' | 'portfolio' | 'earn' | 'all'; className?: string }) {
  const { t } = useLocale();
  const next = useDecisionNext(domain);
  // Bước vừa áp dụng sẽ biến khỏi /decision/next → giữ lại tại chỗ để người dùng còn thấy "Đã cập nhật · Hoàn tác"
  const [kept, setKept] = useState<{ choiceId: string; choiceTitle: string; steps: DecisionStep[] } | null>(null);
  const fresh = next.data;
  const d = fresh || kept
    ? {
      choiceId: fresh?.choiceId ?? kept!.choiceId,
      choiceTitle: fresh?.choiceTitle ?? kept!.choiceTitle,
      steps: [...(kept?.steps ?? []), ...(fresh?.steps ?? []).filter((s) => !kept?.steps.some((k) => k.key === s.key))],
    }
    : null;
  if (!d || !d.steps.length) return null;
  const keep = (s: DecisionStep) => setKept((k) => ({ choiceId: d.choiceId, choiceTitle: d.choiceTitle, steps: [...(k?.steps ?? []), s] }));
  return (
    <section aria-label={t('action.strip_label')} className={cx('rounded-2xl border border-[#D9E7FB] bg-[#F5F9FF] px-4 py-2.5', className)}>
      {d.steps.map((s) => (
        <div key={s.key} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-1">
          <Sparkles className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-ink">
              <span className="text-ink-soft">{t('action.strip_for')} </span>
              <Link to={`/lua-chon?id=${encodeURIComponent(d.choiceId)}`} className="font-semibold text-accent-700 hover:underline">{d.choiceTitle}</Link>
              <span className="text-ink-soft">: </span>
              <strong>{t(`simulation.steps.${s.key}`)}</strong>
            </p>
            {s.action && <ActionDiffLine action={s.action} />}
          </div>
          <ApplyAction action={s.action} to={s.to} title={t(`simulation.steps.${s.key}`)} stepKey={s.key} choiceId={d.choiceId} compact onApplied={() => keep(s)} />
        </div>
      ))}
    </section>
  );
}
