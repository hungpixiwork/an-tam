// 4 bước quyết định: Xác định lựa chọn → Lập kế hoạch → Mô phỏng kết quả → Ra quyết định.
// Bước đã xong suy ra từ dữ liệu thật: có lựa chọn, có việc trong kế hoạch, đã lưu lần mô phỏng, đã đánh dấu xong.

import { Check } from 'lucide-react';
import type { LifeChoiceDetail } from '@shared/types/api';
import { cx } from '@/components/ui';
import { useRuns } from '@/lib/queries';
import { useLocale } from '@/app/locale';

export function Journey({ detail }: { detail: LifeChoiceDetail }) {
  const { t } = useLocale();
  const runs = useRuns();
  const simulated = !!runs.data?.some((r) => r.choiceId === detail.id);
  const done = [true, detail.tasks.some((x) => x.done), simulated, detail.status === 'done'];
  const current = done.findIndex((d) => !d);
  return (
    <nav aria-label={t('choices.journey.title')} className="px-1">
      <ol className="grid grid-cols-2 gap-y-3 md:grid-cols-4">
        {done.map((isDone, i) => {
          const active = i === current;
          return (
            <li key={i} className="relative flex min-w-0 items-center gap-3 pr-3" aria-current={active ? 'step' : undefined}>
              <span
                className={cx(
                  'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold',
                  isDone ? 'bg-[#0B7A55] text-white' : active ? 'bg-[#0B7A55] text-white ring-4 ring-[#DDF1E7]' : 'bg-[#E9EEF3] text-[#5B6B7C]',
                )}
              >
                {isDone && !active ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0">
                <strong className={cx('block text-[13px]', isDone || active ? 'text-[#0B7A55]' : 'text-ink')}>{t(`choices.journey.step${i + 1}`)}</strong>
                <small className="block text-[11.5px] leading-snug text-ink-soft">{t(`choices.journey.sub${i + 1}`)}</small>
              </span>
              {i < 3 && <span className="ml-auto hidden h-px flex-1 bg-[#D5DEE7] md:block" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
