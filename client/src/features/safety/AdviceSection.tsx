// Hàng 4 — Gợi ý từ An Tâm AI: tóm tắt cách để dành thêm · số tiền thêm · tác động đến từng mục tiêu.

import { ArrowRight, Bot, CircleCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SafetyData } from '@shared/types/api';
import { formatVndFull } from '@shared/format';
import { IconTile, TONE_EXT, cx } from '@/components/ui';
import { useLocale } from '@/app/locale';
import { goalLook } from './goalLook';

export function AdviceSection({ data }: { data: SafetyData }) {
  const { t } = useLocale();
  const { advice, fund } = data;
  const byId = new Map(data.goals.map((g) => [g.goal.id, g.goal]));
  return (
    <section aria-labelledby="advice-h" className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
        <div className="flex min-w-0 items-start gap-3">
          <IconTile icon={Bot} tone="sky" size="lg" />
          <div className="min-w-0">
            <h2 id="advice-h" className="flex items-center gap-1.5 text-[17px] font-bold text-ink">
              <Sparkles className="h-4 w-4 text-violet-500" aria-hidden />
              {t('safety.advice.title')}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">{t('safety.advice.sub')}</p>
          </div>
        </div>
        <Link
          to="/thu-chi"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-accent-100 bg-white px-3.5 text-[13px] font-semibold text-accent-600 hover:bg-accent-50"
        >
          {t('safety.advice.more')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {advice.ideas.length === 0 ? (
        <p className="px-1 pb-2 text-[14px] text-ink-soft">
          {t('safety.advice.empty')}{' '}
          <Link to="/thu-chi" className="font-semibold text-accent-600">
            {t('safety.advice.empty_cta')} →
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[570fr_380fr_395fr]">
          <div className="rounded-xl bg-[#F3F7FD] px-4 py-3.5">
            <h3 className="text-[14px] font-bold text-ink">{t('safety.advice.summary')}</h3>
            <ul className="mt-2.5 space-y-2">
              {advice.ideas.map((i) => (
                <li key={i.key} className="flex items-start gap-2.5 text-[13px] text-ink">
                  <CircleCheck className="mt-px h-[18px] w-[18px] shrink-0 fill-success-600 text-white" aria-hidden />
                  {t(`safety.advice.idea.${i.key}`, { amount: formatVndFull(i.amount) })}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-4 rounded-xl bg-[#ECF8F1] px-4 py-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-success-600">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] text-ink">{t('safety.advice.extra_label')}</p>
              <p className="text-[22px] font-extrabold leading-tight tabular-nums text-success-700">
                {formatVndFull(advice.extraMonthly)}
                {t('safety.advice.per_month')}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                {fund.gap6 > 0
                  ? t('safety.advice.extra_body', { from: advice.fundMonthsFrom, to: advice.fundMonthsTo })
                  : t('safety.advice.extra_body_goals')}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-line px-4 py-3.5">
            <h3 className="text-[14px] font-bold text-ink">{t('safety.advice.impact')}</h3>
            {advice.accelerations.length === 0 ? (
              <p className="mt-2 text-[13px] text-ink-soft">{t('safety.advice.impact_empty')}</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {advice.accelerations.slice(0, 4).map((a) => {
                  const goal = byId.get(a.goalId);
                  const look = goalLook(goal ?? { kind: 'custom', icon: a.icon });
                  const Icon = look.icon;
                  const fundRow = goal?.kind === 'emergency';
                  return (
                    <li key={a.goalId} className="flex items-center gap-2 text-[12.5px] text-ink">
                      <Icon className={cx('h-4 w-4 shrink-0', TONE_EXT[look.tone].text)} aria-hidden />
                      <span className="min-w-0 truncate">
                        {a.title}:{' '}
                        {t(fundRow ? 'safety.advice.impact_fund' : 'safety.advice.impact_row', { n: a.monthsSooner })
                          .split(String(a.monthsSooner))
                          .flatMap((part, i, arr) => (i < arr.length - 1 ? [part, <b key={i}>{a.monthsSooner}</b>] : [part]))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
