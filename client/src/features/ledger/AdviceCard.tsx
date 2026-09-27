import { ArrowRight, Coffee, Lightbulb, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SpendingAdvice } from '@shared/types/api';
import { formatVndFull } from '@shared/format';
import { SectionCard, cx } from '@/components/ui';
import { useLocale } from '@/app/locale';

/** "Gợi ý từ An Tâm AI" — tính từ chi tiêu thật (engine spendingAdvice). */
export function AdviceCard({ advice, month, className }: { advice: SpendingAdvice; month: string; className?: string }) {
  const { t } = useLocale();
  const pct = (v: number) => Math.round(v * 100);
  const cat = advice.focus ? t(`category.${advice.focus.category}`).toLowerCase() : '';
  const join = (labels: string[]) => labels.map((l) => l.toLowerCase()).join(t('ledger.advice.and'));

  return (
    <SectionCard
      title={t('ledger.advice.title')}
      icon={Sparkles}
      iconTone="violet"
      extra={<span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11.5px] font-semibold text-violet-600">{t('ledger.advice.badge')}</span>}
      className={cx('flex flex-col', className)}
      bodyClassName="flex flex-1 flex-col"
    >
      {!advice.ready ? (
        <p className="rounded-xl bg-accent-50 p-4 text-[13px] leading-relaxed text-ink-soft">{t('ledger.advice.not_ready', { month: Number(month.slice(5, 7)) })}</p>
      ) : (
        <>
          {advice.focus ? (
            <div className="flex items-start gap-3 rounded-xl bg-[#FFF3EC] p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-500"><Coffee className="h-5 w-5" aria-hidden /></span>
              <p className="text-[13.5px] font-semibold leading-snug text-ink">
                {advice.items.length ? t('ledger.advice.focus_items', { items: join(advice.items.map((i) => i.label).slice(0, 2)) }) : t('ledger.advice.focus', { category: cat })}
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-success-50 p-3 text-[13.5px] font-semibold text-ink">{t('ledger.advice.balanced')}</p>
          )}
          <ul className="mt-2.5 list-disc space-y-1 pl-5 text-[12.5px] leading-relaxed text-ink-soft">
            {advice.focus && !advice.items.length && <li>{t('ledger.advice.share_line', { category: t(`category.${advice.focus.category}`), pct: pct(advice.focus.share), peer: pct(advice.focus.peerShare) })}</li>}
            {advice.items.map((i) => (
              <li key={i.label}>{t('ledger.advice.item_line', { label: i.label, amount: formatVndFull(i.amount) })}</li>
            ))}
          </ul>
          {advice.saving && (
            <div className="mt-2.5 flex items-start gap-2.5 rounded-xl bg-success-50 p-3 text-[12.5px] leading-relaxed text-ink">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden />
              <p>
                <b className="text-success-700">{t('ledger.advice.tip')}</b>{' '}
                {advice.saving.basis === 'regret'
                  ? t('ledger.advice.tip_regret', { items: join(advice.saving.labels), monthly: formatVndFull(advice.saving.monthly), yearly: formatVndFull(advice.saving.yearly) })
                  : t('ledger.advice.tip_peer', { category: cat, monthly: formatVndFull(advice.saving.monthly), yearly: formatVndFull(advice.saving.yearly) })}
              </p>
            </div>
          )}
          {!advice.items.length && advice.focus && <p className="mt-2 text-[12px] text-ink-mute">{t('ledger.advice.tag_hint')}</p>}
        </>
      )}
      <div className="mt-auto pt-3">
        <Link to="/thu-chi?tab=thoi-quen" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent-50 px-3.5 text-[13px] font-semibold text-accent-700 hover:bg-accent-100">
          {t('ledger.advice.more')} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </SectionCard>
  );
}
