import { Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui';
import { useAutoSchedule } from '@/lib/queries';
import { useLocale } from '@/app/locale';

/** "AI lập kế hoạch cho bạn" — chạy engine xếp lịch, tạo đề xuất chờ duyệt. */
export function AiPlanCard({ week }: { week: string }) {
  const { t } = useLocale();
  const run = useAutoSchedule();
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby="ai-plan-title">
      <h2 id="ai-plan-title" className="flex items-center gap-2 text-[16px] font-bold text-ink">
        <Sparkles className="h-5 w-5 text-accent-600" aria-hidden />
        {t('calendar.ai.title')}
        <Badge tone="violet" size="sm">{t('calendar.ai.beta')}</Badge>
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{t('calendar.ai.body')}</p>
      <button
        type="button"
        onClick={() => run.mutate(week)}
        disabled={run.isPending}
        className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-600 text-[15px] font-semibold text-white shadow-sm hover:bg-accent-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:opacity-70"
      >
        {run.isPending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Sparkles className="h-5 w-5" aria-hidden />}
        {t('calendar.ai.cta')}
      </button>
      {run.data && (
        <p role="status" className="mt-2 text-[12.5px] font-medium text-accent-700">
          {run.data.created ? t('calendar.ai.created', { n: run.data.created }) : t('calendar.ai.none')}
        </p>
      )}
      {run.error && <p role="alert" className="mt-2 text-[12.5px] text-danger-600">{run.error.message}</p>}
    </section>
  );
}
