import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Coins, Compass, Plus, Sparkles, Target, TrendingDown, TrendingUp, Wallet, BriefcaseBusiness, Clock3, type LucideIcon } from 'lucide-react';
import type { DecisionMode, LifeChoice, LifeChoiceDetail, LifeChoicePreview } from '@shared/types/api';
import { formatVndFull } from '@shared/format';
import { Button, EmptyState, ErrorState, HeroBanner, PageSkeleton, cx } from '@/components/ui';
import { useLifeChoice, useLifeChoicePreview, useLifeChoices } from '@/lib/queries/choices';
import { useLocale } from '@/app/locale';
import { EditChoiceModal, NewChoiceModal, SituationCard } from './SituationCard';
import { ActionPlanCard, PrereqsCard } from './SidePanels';
import { num } from './shared';

const MODES: DecisionMode[] = ['bull', 'base', 'bear'];

function Journey({ detail }: { detail: LifeChoiceDetail }) {
  const { t } = useLocale();
  const completed = detail.status === 'done' ? 4 : detail.options.length ? 2 : 1;
  return <nav aria-label={t('choices.journey.title')} className="grid grid-cols-2 gap-2 md:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-2 py-2">
    <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', i <= completed ? 'bg-[#087D59] text-white' : 'bg-[#E8F0F7] text-[#476078]')}>{i < completed ? <Check className="h-4 w-4" aria-hidden /> : i + 1}</span>
    <span className="min-w-0"><strong className="block text-[12px] text-ink">{t(`choices.journey.step${i + 1}`)}</strong><small className="block text-[10px] leading-snug text-ink-soft">{t(`choices.journey.sub${i + 1}`)}</small></span>
  </div>)}</nav>;
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="min-w-0"><Icon className="mb-1 h-4 w-4 text-[#0E986B]" aria-hidden /><p className="text-[11px] text-ink-soft">{label}</p><p className="break-words text-[13px] font-bold text-ink">{value}</p></div>;
}

function ScenarioPanel({ detail, mode, onMode }: { detail: LifeChoiceDetail; mode: DecisionMode; onMode: (m: DecisionMode) => void }) {
  const { t, locale } = useLocale();
  const preview = useLifeChoicePreview(detail.id, mode);
  const p = preview.data;
  return <section className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby="scenario-title">
    <h2 id="scenario-title" className="text-[17px] font-bold text-ink">{t('choices.scenario.title')}</h2><p className="mb-3 text-[12px] text-ink-soft">{t('choices.scenario.subtitle')}</p>
    <div className="grid grid-cols-3 gap-2" role="tablist" aria-label={t('choices.scenario.title')}>{MODES.map((m) => <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => onMode(m)} className={cx('flex min-w-0 items-center justify-center gap-1 rounded-xl border px-1 py-2 text-[12px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-700', mode === m ? 'border-[#4AAE88] bg-[#EAF7F0] text-[#126349]' : 'border-line bg-[#F7F9FC] text-ink')}>
      {m === 'bull' ? <TrendingUp className="h-4 w-4" aria-hidden /> : m === 'bear' ? <TrendingDown className="h-4 w-4" aria-hidden /> : <Coins className="h-4 w-4" aria-hidden />}{t(`choices.scenario.${m}`)}
    </button>)}</div>
    {preview.isPending ? <p className="mt-4 text-sm text-ink-soft" role="status">{t('choices.scenario.loading')}</p> : preview.error ? <div className="mt-4 text-sm text-danger-600" role="alert">{preview.error.message} <button type="button" className="font-bold underline" onClick={() => preview.refetch()}>{t('choices.scenario.retry')}</button></div> : p ? <div className="mt-3 rounded-xl border border-[#E6EDF2] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-[14px] font-bold text-[#087D59]">{t(`choices.scenario.heading.${mode}`)}</h3><p className="text-[11px] text-ink-soft">{t('choices.scenario.assumption', { cost: Math.round((p.assumptions.costFactor - 1) * 100), income: Math.round((p.assumptions.upliftFactor - 1) * 100) })}</p></div><Link to={`/mo-phong?choiceId=${encodeURIComponent(detail.id)}&mode=${mode}`} className="text-[12px] font-bold text-accent-600 hover:underline">{t('choices.scenario.details')} →</Link></div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric icon={CalendarDays} label={t('choices.scenario.start')} value={p.startAfterMonths === null ? t('choices.scenario.unknown') : t('choices.scenario.after_months', { n: p.startAfterMonths })} /><Metric icon={Wallet} label={t('choices.scenario.income')} value={formatVndFull(p.expectedMonthlyIncome)} /><Metric icon={Coins} label={t('choices.scenario.safe')} value={t('choices.detail.months', { n: num(p.evaluation.monthsAfter, locale) })} /><Metric icon={Target} label={t('choices.scenario.goal')} value={p.goalImpactMonths === null ? t('choices.scenario.unknown') : t('choices.scenario.delay', { n: p.goalImpactMonths })} /></div>
    </div> : null}
    <p className="mt-2 text-[11px] leading-snug text-ink-soft">{t('choices.scenario.disclaimer')}</p>
  </section>;
}

function PlanGrid({ detail, preview }: { detail: LifeChoiceDetail; preview: LifeChoicePreview | undefined }) {
  const { t, locale } = useLocale();
  const option = detail.options.find((o) => o.selected) ?? detail.options[0];
  if (!option || !preview) return null;
  const done = detail.tasks.filter((task) => task.done).length;
  const plans = [
    { icon: Coins, tone: 'green', title: t('choices.plans.finance'), rows: [[t('choices.plans.total'), formatVndFull(preview.evaluation.costs.total)], [t('choices.plans.available'), formatVndFull(preview.evaluation.funding.liquid)], [t('choices.plans.gap'), formatVndFull(preview.evaluation.funding.shortfall)]] },
    { icon: BriefcaseBusiness, tone: 'blue', title: t('choices.plans.work'), rows: [[t('choices.plans.current_income'), formatVndFull(detail.monthlyIncome)], [t('choices.plans.expected_income'), formatVndFull(preview.expectedMonthlyIncome)], [t('choices.plans.no_income'), t('choices.detail.months', { n: option.monthsWithoutIncome })]] },
    { icon: Clock3, tone: 'violet', title: t('choices.plans.time'), rows: [[t('choices.plans.prepare'), preview.startAfterMonths === null ? t('choices.scenario.unknown') : t('choices.detail.months', { n: num(preview.startAfterMonths, locale) })], [t('choices.plans.duration'), t('choices.detail.months', { n: option.durationMonths })], [t('choices.plans.tasks'), t('choices.plans.tasks_progress', { done, total: detail.tasks.length })]] },
  ];
  return <section className="rounded-2xl border border-line bg-white p-4 shadow-card"><div className="mb-3 flex flex-wrap items-baseline gap-2"><h2 className="text-[17px] font-bold text-ink">{t('choices.plans.title')}</h2><span className="text-[12px] text-ink-soft">{t('choices.plans.subtitle')}</span></div><div className="grid gap-2.5 md:grid-cols-3">{plans.map(({ icon: Icon, tone, title, rows }) => <div key={title} className="min-w-0 overflow-hidden rounded-xl border border-line"><h3 className={cx('flex items-center gap-2 px-3 py-2.5 text-[14px] font-bold', tone === 'green' ? 'bg-[#EAF7F0] text-[#126349]' : tone === 'blue' ? 'bg-[#EDF4FF] text-accent-700' : 'bg-[#F4F0FF] text-violet-700')}><Icon className="h-4 w-4" aria-hidden />{title}</h3><dl className="space-y-2 px-3 py-3">{rows.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-x-2 text-[12px]"><dt className="text-ink-soft">{label}</dt><dd className="font-bold text-ink">{value}</dd></div>)}</dl></div>)}</div></section>;
}

function Outcomes({ preview }: { preview: LifeChoicePreview | undefined }) {
  const { t, locale } = useLocale();
  if (!preview) return null;
  const e = preview.evaluation;
  return <section className="rounded-2xl border border-line bg-white p-4 shadow-card"><h2 className="mb-2.5 text-[17px] font-bold text-ink">{t('choices.outcome.title')}</h2><div className="grid gap-2 sm:grid-cols-3">
    <div className="rounded-xl bg-[#F1FAF5] p-3"><p className="text-[12px] text-ink-soft">{t('choices.outcome.finance')}</p><strong className="block text-[14px] text-[#126349]">{t(`choices.verdict.${e.verdict}`)}</strong><small className="text-ink-soft">{t('choices.outcome.safe', { n: num(e.monthsAfter, locale) })}</small></div>
    <div className="rounded-xl bg-[#F5F8FD] p-3"><p className="text-[12px] text-ink-soft">{t('choices.outcome.goal')}</p><strong className="block text-[14px] text-ink">{preview.goalImpactMonths === null ? t('choices.scenario.unknown') : t('choices.scenario.delay', { n: preview.goalImpactMonths })}</strong><small className="text-ink-soft">{t('choices.outcome.goal_sub')}</small></div>
    <div className="rounded-xl bg-[#F7F4FF] p-3"><p className="text-[12px] text-ink-soft">{t('choices.outcome.feasibility')}</p><strong className="block text-[14px] text-ink">{e.feasibility}/100</strong><small className="text-ink-soft">{t('choices.outcome.prereqs', { done: e.prereqsDone, total: e.prereqsTotal })}</small></div>
  </div><p className="mt-2 rounded-lg bg-[#FFF8EA] px-3 py-2 text-[12px] text-[#9A5A06]">{t(`choices.headline.${e.verdict}`)}</p></section>;
}

function Alternatives({ detail, choices, onPick }: { detail: LifeChoiceDetail; choices: LifeChoice[]; onPick: (id: string) => void }) {
  const { t } = useLocale();
  const others = choices.filter((c) => c.id !== detail.id);
  if (!others.length) return null;
  return <section className="rounded-2xl border border-line bg-white p-4 shadow-card"><h2 className="mb-2.5 text-[17px] font-bold text-ink">{t('choices.alternatives.title')}</h2><div className="grid gap-2 md:grid-cols-3">{others.map((c) => <button key={c.id} type="button" onClick={() => onPick(c.id)} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-line p-3 text-left hover:bg-slate-50"><span className="min-w-0"><strong className="block truncate text-[13px] text-ink">{c.title}</strong><small className="line-clamp-2 text-[11px] text-ink-soft">{c.description}</small></span><ArrowRight className="h-4 w-4 shrink-0 text-accent-600" aria-hidden /></button>)}</div></section>;
}

export default function ChoicesPage() {
  const { t } = useLocale();
  const list = useLifeChoices();
  const [picked, setPicked] = useState<string | undefined>();
  const [mode, setMode] = useState<DecisionMode>('base');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const activeId = picked && list.data?.some((c) => c.id === picked) ? picked : list.data?.[0]?.id;
  const detail = useLifeChoice(activeId);
  const preview = useLifeChoicePreview(activeId, mode);
  const hero = <HeroBanner title={t('choices.hero.title')} description={t('choices.hero.subtitle')} quote={t('choices.hero.quote')} quoteClassName="w-[240px] self-start xl:mr-[20%] [&_blockquote]:text-[13px]" image="/hero-lake-city.jpg" imageAlt={t('choices.hero.image_alt')} imagePosition="right 55%" visualWidth="56%" className="min-h-[108px]" />;
  const modal = creating && <NewChoiceModal onClose={() => setCreating(false)} onCreated={(id) => { setPicked(id); setCreating(false); }} />;
  if (list.isPending || (activeId && detail.isPending)) return <PageSkeleton />;
  if (list.error || detail.error) return <ErrorState error={list.error ?? detail.error} onRetry={() => (list.error ? list.refetch() : detail.refetch())} />;
  if (!detail.data) return <div className="space-y-3">{hero}<EmptyState icon={Compass} tone="violet" title={t('choices.empty.title')} body={t('choices.empty.body')} action={<Button icon={Plus} onClick={() => setCreating(true)}>{t('choices.situation.new')}</Button>} />{modal}</div>;
  const d = detail.data;
  return <div className="space-y-2.5">{hero}<Journey detail={d} />
    <div className="grid gap-2.5 xl:grid-cols-2"><SituationCard detail={d} choices={list.data ?? []} onPick={setPicked} onNew={() => setCreating(true)} onEdit={() => setEditing(true)} /><ScenarioPanel detail={d} mode={mode} onMode={setMode} /></div>
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]"><div className="min-w-0 space-y-2.5"><PlanGrid detail={d} preview={preview.data} /><div className="grid gap-2.5 lg:grid-cols-2"><PrereqsCard detail={d} /><Outcomes preview={preview.data} /></div></div><div className="min-w-0 space-y-2.5"><ActionPlanCard detail={d} /><Link to={`/mo-phong?choiceId=${encodeURIComponent(d.id)}&mode=${mode}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-700 px-3 py-2 text-center text-[13px] font-bold text-white hover:bg-primary-800"><Sparkles className="h-4 w-4" aria-hidden />{t('choices.simulation.cta')}<ArrowRight className="h-4 w-4" aria-hidden /></Link><p className="rounded-xl bg-[#EFF7FE] px-3 py-2 text-[12px] text-accent-700">{t('choices.simulation.note')}</p></div></div>
    <Alternatives detail={d} choices={list.data ?? []} onPick={setPicked} />{modal}{editing && <EditChoiceModal detail={d} onClose={() => setEditing(false)} />}
  </div>;
}
