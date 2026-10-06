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
    <section aria-label={t('action.strip_label')} className={cx('rounded-2xl border border-[#D9E7FB] bg-[#F5F9FF] p-3.5', className)}>
      <div className="divide-y divide-[#E2EEFB]">
        {d.steps.map((s) => (
          <div key={s.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <Sparkles className="h-4 w-4 shrink-0 text-violet-600 mt-0.5" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] leading-snug text-ink">
                  <span className="text-ink-soft">{t('action.strip_for')} </span>
                  <Link to={`/lua-chon?id=${encodeURIComponent(d.choiceId)}`} className="font-semibold text-accent-700 hover:underline">{d.choiceTitle}</Link>
                  <span className="text-ink-soft">: </span>
                  <strong>{t(`simulation.steps.${s.key}`)}</strong>
                </p>
                {s.action && <ActionDiffLine action={s.action} className="mt-1" />}
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <ApplyAction action={s.action} to={s.to} title={t(`simulation.steps.${s.key}`)} stepKey={s.key} choiceId={d.choiceId} compact onApplied={() => keep(s)} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
