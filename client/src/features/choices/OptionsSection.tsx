// "So sánh các phương án" (thẻ radio + vòng điểm khả thi) và "Phân tích chi tiết" của phương án đang chọn.
// Mọi số từ GET /api/life-choices/:id (engine evaluateLifeChoice). Chọn phương án → PATCH option selected.

import { Crown, Database, Lightbulb, Sparkles, TrendingDown, TrendingUp, TriangleAlert, Wallet, CircleCheck, type LucideIcon } from 'lucide-react';
import type { LifeChoiceDetail, LifeChoiceOptionView } from '@shared/types/api';
import { formatVndFull } from '@shared/format';
import { Badge, IconTile, ScoreRing, StackedBar, cx } from '@/components/ui';
import { useSelectOption } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { VERDICT_HEX, VERDICT_TONE, fmtParams, num } from './shared';

function OptionCard({ option, n, recommended, onSelect, busy }: { option: LifeChoiceOptionView; n: number; recommended: boolean; onSelect: () => void; busy: boolean }) {
  const { t, locale } = useLocale();
  const e = option.evaluation;
  const tone = VERDICT_TONE[e.verdict];
  return (
    <label
      className={cx(
        'relative flex min-w-0 cursor-pointer flex-col rounded-2xl border bg-white p-5 shadow-card transition-colors',
        option.selected ? 'border-[#1FA16B] bg-[#F7FCF9] ring-1 ring-[#1FA16B]' : 'border-line hover:border-slate-300',
        busy && 'opacity-70',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <input type="radio" name="life-option" checked={option.selected} onChange={onSelect} className="h-5 w-5 accent-[#1FA16B]" aria-label={t('choices.compare.select', { n })} />
          <span className={cx('rounded-full px-2.5 py-1 text-[14px] font-semibold', option.selected ? 'bg-[#E3F5EB] text-[#137A4F]' : 'text-ink')}>
            {t('choices.compare.option', { n })} {recommended && t('choices.compare.recommended')}
          </span>
        </span>
        {recommended && (
          <Badge tone="amber" icon={Crown} size="sm">
            {t(`choices.verdict_badge.${e.verdict}`)}
          </Badge>
        )}
      </div>
      <h3 className="mt-3 text-[18px] font-bold text-ink">{option.title}</h3>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{option.description}</p>
      <div className="mt-4 flex items-center gap-5">
        <ScoreRing score={e.feasibility} size={104} stroke={12} color={VERDICT_HEX[e.verdict]} label={`${e.feasibility}/100`}>
          <span className="font-extrabold text-ink tabular-nums">
            <span className="text-[26px] leading-none">{e.feasibility}</span>
            <span className="text-[13px] font-semibold text-ink-soft">/100</span>
          </span>
        </ScoreRing>
        <div className="min-w-0">
          <Badge tone={tone} icon={e.verdict === 'wait' ? TrendingDown : TrendingUp}>
            {t(`choices.verdict.${e.verdict}`)}
          </Badge>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{t(`choices.summary.${e.verdict}`, { months: num(e.monthsAfter, locale) })}</p>
        </div>
      </div>
    </label>
  );
}

export function CompareOptions({ detail }: { detail: LifeChoiceDetail }) {
  const { t } = useLocale();
  const select = useSelectOption(detail.id);
  return (
    <section aria-label={t('choices.compare.title')}>
      <h2 className="mb-2.5 text-[17px] font-bold text-ink">{t('choices.compare.title')}</h2>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {detail.options.map((o, i) => (
          <OptionCard
            key={o.id}
            option={o}
            n={i + 1}
            recommended={o.id === detail.recommendedOptionId}
            busy={select.isPending}
            onSelect={() => !o.selected && select.mutate(o.id)}
          />
        ))}
      </div>
    </section>
  );
}

function Tile({ icon, tone, children, className }: { icon: LucideIcon; tone: 'blue' | 'violet' | 'green' | 'amber'; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('flex min-w-0 gap-3.5 rounded-xl border border-line p-4', className)}>
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function DetailCard({ detail }: { detail: LifeChoiceDetail }) {
  const { t, locale } = useLocale();
  const idx = Math.max(0, detail.options.findIndex((o) => o.selected));
  const option = detail.options[idx];
  if (!option) return null;
  const e = option.evaluation;
  const keep = e.monthsBefore > 0 ? Math.min(100, (e.monthsAfter / e.monthsBefore) * 100) : 0;
  const verdictColor = e.verdict === 'go' ? 'text-[#137A4F]' : e.verdict === 'wait' ? 'text-danger-600' : 'text-[#D97706]';

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="choice-detail-title">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <h2 id="choice-detail-title" className="text-[17px] font-bold text-ink">
          {t('choices.detail.title', { n: idx + 1 })}
        </h2>
        <Badge tone="green" icon={Sparkles} size="sm">
          {t('choices.detail.ai_badge')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[300fr_560fr]">
        <Tile icon={Wallet} tone="blue">
          <p className="text-[13px] font-semibold text-ink">{t('choices.detail.impact')}</p>
          <p className={cx('mt-1 text-[26px] font-extrabold leading-tight tabular-nums', e.monthsDelta < 0 ? 'text-danger-600' : 'text-[#137A4F]')}>
            {e.monthsDelta > 0 ? '+' : ''}
            {t('choices.detail.months', { n: num(e.monthsDelta, locale) })}
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
            {t('choices.detail.impact_body', { before: num(e.monthsBefore, locale), after: num(e.monthsAfter, locale) })}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#FDE2E2]" role="img" aria-label={`${num(e.monthsAfter, locale)}/${num(e.monthsBefore, locale)}`}>
            <div className="h-full rounded-full bg-danger-500" style={{ width: `${keep}%` }} />
          </div>
        </Tile>
        <Tile icon={Database} tone="violet">
          <p className="text-[13px] font-semibold text-ink">{t('choices.detail.cost')}</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-[24px] font-extrabold tabular-nums text-ink">{formatVndFull(e.costs.total)}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[12px] text-ink-soft">{t('choices.detail.cost_months', { n: option.durationMonths })}</span>
          </p>
          <StackedBar
            className="mt-2"
            height={10}
            hidePercent
            formatValue={formatVndFull}
            ariaLabel={t('choices.detail.cost')}
            legendClassName="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-3"
            segments={[
              { key: 'tuition', label: t(detail.kind === 'study' ? 'choices.detail.tuition_study' : 'choices.detail.tuition'), value: e.costs.tuition, color: '#2F6FED' },
              { key: 'living', label: t('choices.detail.living'), value: e.costs.living, color: '#8FB5F5' },
              { key: 'other', label: t('choices.detail.other'), value: e.costs.other, color: '#F5B82E' },
            ]}
          />
        </Tile>
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <Tile icon={TrendingUp} tone="green">
          <p className="text-[13px] font-semibold text-ink">{t('choices.detail.opps')}</p>
          <ul className="mt-2 space-y-1.5">
            {e.opportunities.map((o) => (
              <li key={o.key} className="flex gap-2 text-[13px] leading-snug text-ink-soft">
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1FA16B]" aria-hidden />
                {t(`choices.opp.${o.key}`, fmtParams(o.params, locale))}
              </li>
            ))}
          </ul>
        </Tile>
        <Tile icon={TriangleAlert} tone="amber">
          <p className="text-[13px] font-semibold text-ink">{t('choices.detail.risks')}</p>
          <ul className="mt-2 space-y-1.5">
            {e.risks.map((r) => (
              <li key={r.key} className="flex gap-2 text-[13px] leading-snug text-ink-soft">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#F28C28]" aria-hidden />
                {t(`choices.risk.${r.key}`, fmtParams(r.params, locale))}
              </li>
            ))}
          </ul>
        </Tile>
      </div>

      <div className="mt-3.5 flex flex-col gap-3 rounded-xl border border-[#F7D98B] bg-[#FFF9EA] p-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center gap-2.5 sm:w-[180px]">
          <Lightbulb className="h-7 w-7 text-[#F5A524]" aria-hidden />
          <p className="text-[13.5px] font-bold text-ink">{t('choices.detail.conclusion')}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className={cx('text-[14.5px] font-bold', verdictColor)}>{t(`choices.headline.${e.verdict}`)}</p>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">{t(`choices.unlock.${e.unlock.key}`, fmtParams(e.unlock.params, locale))}</p>
          <p className="mt-1 text-[11.5px] text-ink-mute">{t('choices.detail.score_parts', e.parts)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="rounded-full bg-[#FDECC0] px-3 py-1 text-[15px] font-extrabold tabular-nums text-ink">{e.feasibility}/100</span>
          <span className={cx('text-[12.5px] font-semibold', verdictColor)}>{t(`choices.verdict.${e.verdict}`)}</span>
        </div>
      </div>
    </section>
  );
}
