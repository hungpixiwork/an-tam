// "Điều kiện để khả thi" (4 ô có tiến độ, tính ở máy chủ: preview.conditions) và "Kết quả sơ bộ" (3 ô + dòng nhắc).

import { BarChart3, CalendarDays, Coins, Info, Lightbulb, Settings2, ShieldCheck, Target, Wallet, type LucideIcon } from 'lucide-react';
import type { LifeChoiceCondition, LifeChoicePreview } from '@shared/types/api';
import { formatVnd } from '@shared/format';
import { ProgressBar, cx } from '@/components/ui';
import { useLocale } from '@/app/locale';
import { ApplyAction } from '@/components/actions/ActionCard';
import { useAppliedSteps } from '@/lib/queries';
import { num } from './shared';

const COND: Record<LifeChoiceCondition['key'], { icon: LucideIcon; color: string; tone: string }> = {
  fund: { icon: Coins, color: '#1FA16B', tone: 'text-[#1FA16B]' },
  side_income: { icon: Wallet, color: '#F5A524', tone: 'text-amber-500' },
  prepare: { icon: CalendarDays, color: '#3B82F6', tone: 'text-accent-600' },
  safety: { icon: ShieldCheck, color: '#1FA16B', tone: 'text-[#1FA16B]' },
};

const safetyLabel = (score: number) => (score >= 75 ? 'good' : score >= 50 ? 'fair' : 'low');

export function ConditionsCard({ preview, choiceId }: { preview: LifeChoicePreview | undefined; choiceId: string }) {
  const { t, locale } = useLocale();
  const applied = new Set(useAppliedSteps(choiceId).data?.map((a) => a.stepKey));
  if (!preview) return null;
  const value = (c: LifeChoiceCondition) =>
    c.key === 'fund' ? formatVnd(c.need)
      : c.key === 'side_income' ? t('choices.roadmap.per_month', { amount: formatVnd(c.need) })
        : c.key === 'prepare' ? t('choices.detail.months', { n: c.need })
          : `${c.have}/100`;
  const foot = (c: LifeChoiceCondition) =>
    c.key === 'fund' ? t('choices.cond.fund_foot', { have: formatVnd(c.have), need: formatVnd(c.need) })
      : c.key === 'side_income' ? t('choices.cond.side_foot', { have: formatVnd(c.have), need: formatVnd(c.need) })
        : c.key === 'prepare' ? t('choices.cond.prep_foot', { have: num(c.have, locale), need: num(c.need, locale) })
          : t(`choices.cond.safety_${safetyLabel(c.have)}`);
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby="cond-title">
      <h2 id="cond-title" className="flex items-center gap-1.5 text-[17px] font-bold text-ink">
        {t('choices.cond.title')}<Info className="h-4 w-4 text-ink-mute" aria-hidden />
      </h2>
      <p className="mb-3 text-[12px] text-ink-soft">{t('choices.cond.subtitle')}</p>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {preview.conditions.map((c) => {
          const { icon: Icon, color, tone } = COND[c.key];
          return (
            <div key={c.key} className="min-w-0 rounded-xl border border-line p-2.5">
              <div className="flex items-start gap-1.5">
                <Icon className={cx('h-5 w-5 shrink-0', tone)} aria-hidden />
                <div className="min-w-0">
                  <p className="text-[11.5px] leading-snug text-ink-soft">{t(`choices.cond.${c.key}`)}</p>
                  <p className="text-[13.5px] font-bold leading-snug text-ink">{value(c)}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <ProgressBar value={c.progress} color={color} className="h-1.5" label={t(`choices.cond.${c.key}`)} />
                <span className="text-[11px] font-semibold tabular-nums text-ink-soft">{Math.round(c.progress * 100)}%</span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-ink-soft">{foot(c)}</p>
              {c.progress < 1 && (
                <ApplyAction compact className="mt-1.5" action={c.action} to={c.to} title={t(`choices.cond.${c.key}`)} stepKey={`cond_${c.key}`} choiceId={choiceId} applied={applied.has(`cond_${c.key}`)} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function OutcomesCard({ preview }: { preview: LifeChoicePreview | undefined }) {
  const { t } = useLocale();
  if (!preview) return null;
  const e = preview.evaluation;
  const feas = e.feasibility >= 75 ? 'high' : e.feasibility >= 50 ? 'mid' : 'low';
  const tiles: { icon: LucideIcon; tone: string; label: string; value: string; sub: string }[] = [
    { icon: BarChart3, tone: 'text-[#1FA16B]', label: t('choices.outcome.finance'), value: t(`choices.result.finance_${e.verdict}`), sub: t('choices.result.finance_sub', { n: String(e.monthsAfter).replace('.', ',') }) },
    {
      icon: Target, tone: 'text-rose-500', label: t('choices.outcome.goal'),
      value: preview.goalImpactMonths ? t('choices.result.goal_delay', { n: preview.goalImpactMonths }) : t('choices.result.goal_ok'),
      sub: preview.goalTitle ? t('choices.result.goal_sub', { goal: preview.goalTitle }) : t('choices.outcome.goal_sub'),
    },
    { icon: Settings2, tone: 'text-accent-600', label: t('choices.outcome.feasibility'), value: t(`choices.result.feas_${feas}`), sub: t('choices.result.feas_sub', { score: e.feasibility, done: e.prereqsDone, total: e.prereqsTotal }) },
  ];
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby="result-title">
      <h2 id="result-title" className="flex items-center gap-1.5 text-[17px] font-bold text-ink">
        {t('choices.outcome.title')}<Info className="h-4 w-4 text-ink-mute" aria-hidden />
      </h2>
      <p className="mb-3 text-[12px] text-ink-soft">{t('choices.result.subtitle')}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {tiles.map(({ icon: Icon, tone, label, value, sub }) => (
          <div key={label} className="flex min-w-0 items-start gap-2 rounded-xl border border-line p-2.5">
            <Icon className={cx('h-5 w-5 shrink-0', tone)} aria-hidden />
            <div className="min-w-0">
              <p className="text-[11.5px] text-ink-soft">{label}</p>
              <p className="text-[13px] font-bold leading-snug text-ink">{value}</p>
              <p className="text-[11px] leading-snug text-ink-soft">{sub}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 rounded-lg bg-[#FFF6E5] px-3 py-2 text-[12px] text-[#9A5A06]">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p><strong>{t(`choices.result.headline_${e.verdict}`)}</strong> {t('choices.result.headline_sub')}</p>
      </div>
    </section>
  );
}
