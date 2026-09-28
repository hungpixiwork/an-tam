// "AI Agent xây lộ trình": 3 kịch bản Bull / Base / Bear của phương án đang chọn (GET /life-choices/:id/preview?mode=).
// Mỗi kịch bản: tháng bắt đầu, thu nhập kỳ vọng sau khi hoàn thành, số tháng an toàn còn lại, tác động tới mục tiêu lớn.

import { Link } from 'react-router-dom';
import { CalendarDays, Coins, House, TrendingDown, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import type { DecisionMode, LifeChoiceDetail, LifeChoicePreview } from '@shared/types/api';
import { formatVnd } from '@shared/format';
import { cx } from '@/components/ui';
import { useLocale } from '@/app/locale';
import { monthShort, num } from './shared';

const MODES: { mode: DecisionMode; icon: LucideIcon; tone: string }[] = [
  { mode: 'bull', icon: TrendingUp, tone: 'text-[#1FA16B]' },
  { mode: 'base', icon: Coins, tone: 'text-[#0B7A55]' },
  { mode: 'bear', icon: TrendingDown, tone: 'text-danger-600' },
];

function Metric({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2 px-2 py-1 first:pl-0">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#0E986B]" strokeWidth={1.9} aria-hidden />
      <div className="min-w-0">
        <p className="text-[11.5px] leading-snug text-ink-soft">{label}</p>
        <p className="text-[14px] font-bold leading-snug text-ink">{value}</p>
        {sub && <p className="text-[11px] leading-snug text-ink-soft">{sub}</p>}
      </div>
    </div>
  );
}

export function RoadmapCard({ detail, preview: p, mode, onMode }: { detail: LifeChoiceDetail; preview: LifeChoicePreview | undefined; mode: DecisionMode; onMode: (m: DecisionMode) => void }) {
  const { t, locale } = useLocale();
  const upliftPct = p && detail.monthlyIncome > 0 ? Math.round((p.expectedMonthlyIncome / detail.monthlyIncome - 1) * 100) : 0;
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby="roadmap-title">
      <h2 id="roadmap-title" className="text-[17px] font-bold text-ink">{t('choices.roadmap.title')}</h2>
      <p className="mb-3 text-[12.5px] text-ink-soft">{t('choices.roadmap.subtitle')}</p>
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label={t('choices.roadmap.title')}>
        {MODES.map(({ mode: m, icon: Icon, tone }) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => onMode(m)}
            className={cx(
              'flex min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-700',
              mode === m ? 'border-[#4AAE88] bg-[#EAF7F0]' : 'border-line bg-[#F7F9FC] hover:bg-white',
            )}
          >
            <Icon className={cx('h-5 w-5 shrink-0', tone)} aria-hidden />
            <span className="min-w-0">
              <strong className="block text-[13px] text-ink">{t(`choices.roadmap.${m}`)}</strong>
              <small className="block text-[11px] text-ink-soft">{t(`choices.roadmap.${m}_sub`)}</small>
            </span>
          </button>
        ))}
      </div>

      {!p ? (
        <p className="mt-4 text-sm text-ink-soft">{t('choices.scenario.unknown')}</p>
      ) : (
        <div className="mt-3 rounded-xl border border-[#E6EDF2] p-3" role="tabpanel">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-[14.5px] font-bold text-[#0B7A55]">{t(`choices.scenario.heading.${mode}`)}</h3>
              <p className="text-[12px] text-ink-soft">{t(`choices.roadmap.desc_${mode}`)}</p>
            </div>
            <Link to={`/mo-phong?choiceId=${encodeURIComponent(detail.id)}&mode=${mode}`} className="text-[12.5px] font-bold text-accent-600 hover:underline">
              {t('choices.scenario.details')} →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-y-2 md:grid-cols-4">
            <Metric
              icon={CalendarDays}
              label={t('choices.scenario.start')}
              value={p.startMonth ? monthShort(p.startMonth, locale) : t('choices.scenario.unknown')}
              sub={p.startAfterMonths !== null ? t('choices.roadmap.start_sub', { n: p.startAfterMonths }) : undefined}
            />
            <Metric
              icon={Wallet}
              label={t('choices.roadmap.income')}
              value={t('choices.roadmap.per_month', { amount: formatVnd(p.expectedMonthlyIncome) })}
              sub={upliftPct ? t('choices.roadmap.income_sub', { pct: upliftPct > 0 ? `+${upliftPct}` : upliftPct }) : undefined}
            />
            <Metric
              icon={Coins}
              label={t('choices.scenario.safe')}
              value={t('choices.detail.months', { n: num(p.evaluation.monthsAfter, locale) })}
              sub={t('choices.roadmap.safe_sub')}
            />
            <Metric
              icon={House}
              label={p.goalTitle ? t('choices.roadmap.goal', { goal: p.goalTitle }) : t('choices.scenario.goal')}
              value={p.goalImpactMonths === null ? t('choices.scenario.unknown') : t('choices.roadmap.goal_delay', { n: num(p.goalImpactMonths / 12, locale) })}
              sub={p.goalImpactMonths ? t('choices.roadmap.goal_sub') : undefined}
            />
          </div>
        </div>
      )}
      <p className="mt-2 text-[11px] leading-snug text-ink-soft">{t('choices.scenario.disclaimer')}</p>
    </section>
  );
}
