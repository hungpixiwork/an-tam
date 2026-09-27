// Cơ hội tăng thu nhập (làm thêm) + Cơ hội việc làm & làm thêm phù hợp — danh mục `opportunities`, xếp theo mức phù hợp kỹ năng.

import { useState } from 'react';
import { BriefcaseBusiness, ChevronRight, Lightbulb } from 'lucide-react';
import type { Opportunity, OpportunityFit, RoadmapItem } from '@shared/types/api';
import { Badge, IconTile, Modal, SectionCard, cx, type ExtTone } from '@/components/ui';
import { useLocale } from '@/app/locale';
import { TAG_STYLE, millions } from './shared';

const FIT_TONE: Record<OpportunityFit, ExtTone> = { high: 'green', medium: 'green', low: 'gray' };

function useRange() {
  const { t, locale } = useLocale();
  return (o: Opportunity, long = false) => t(long ? 'earn.range_long' : 'earn.range_short', { a: millions(o.incomeMin, locale), b: millions(o.incomeMax, locale) });
}

function OpportunityModal({ opp, skills, onClose }: { opp: Opportunity; skills: RoadmapItem[]; onClose: () => void }) {
  const { t } = useLocale();
  const range = useRange();
  const skill = skills.find((s) => s.tag === opp.tag);
  return (
    <Modal title={opp.title} onClose={onClose}>
      <dl className="space-y-3 text-[14px]">
        <div className="flex justify-between gap-3"><dt className="text-ink-soft">{t('earn.road.income')}</dt><dd className="font-semibold text-ink">{range(opp, true)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-soft">{t('earn.modal.demand')}</dt><dd className="font-semibold text-ink">{t(`earn.demand.${opp.demand}`)}{opp.remote ? ` · ${t('earn.remote')}` : ''}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-soft">{t('earn.road.skills')}</dt><dd className="font-semibold text-ink">{skill?.name ?? '—'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-soft">{t('earn.modal.fit')}</dt><dd><Badge tone={FIT_TONE[opp.fit]} size="sm">{t(`earn.fit.${opp.fit}`)}</Badge></dd></div>
      </dl>
    </Modal>
  );
}

function Row({ opp, compact, onOpen }: { opp: Opportunity; compact?: boolean; onOpen: () => void }) {
  const { t } = useLocale();
  const range = useRange();
  const style = TAG_STYLE[opp.tag];
  const sub = compact
    ? [range(opp, true), opp.remote ? t('earn.remote') : null].filter(Boolean).join(' • ')
    : opp.demand === 'high'
      ? `${t('earn.demand.high')} • ${range(opp)}`
      : opp.demand === 'rising'
        ? t('earn.demand.rising')
        : range(opp);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cx(
          'flex w-full items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600',
          compact ? 'rounded-lg px-1 py-1.5 hover:bg-slate-50' : 'rounded-xl border border-line bg-white px-3 py-2.5 hover:bg-slate-50',
        )}
      >
        <IconTile icon={style.icon} tone={style.tone} size={compact ? 'sm' : 'md'} />
        <span className="min-w-0 flex-1">
          <span className={cx('block font-semibold text-ink', compact ? 'text-[12.5px] leading-snug' : 'truncate text-[14.5px]')}>{opp.title}</span>
          <span className={cx('mt-0.5 block truncate text-ink-soft', compact ? 'text-[11.5px]' : 'text-[12.5px]')}>{sub}</span>
        </span>
        {compact && <Badge tone={FIT_TONE[opp.fit]} size="sm" className="shrink-0 !text-[11px]">{t(`earn.fit.${opp.fit}`)}</Badge>}
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
      </button>
    </li>
  );
}

function OpportunityList({ items, skills, compact, empty }: { items: Opportunity[]; skills: RoadmapItem[]; compact?: boolean; empty: string }) {
  const [open, setOpen] = useState<Opportunity | null>(null);
  if (!items.length) return <p className="text-[13.5px] text-ink-soft">{empty}</p>;
  return (
    <>
      <ul className={compact ? 'divide-y divide-line' : 'space-y-2'}>
        {items.map((o) => <Row key={o.id} opp={o} compact={compact} onOpen={() => setOpen(o)} />)}
      </ul>
      {open && <OpportunityModal opp={open} skills={skills} onClose={() => setOpen(null)} />}
    </>
  );
}

export function OpportunitiesCard({ items, skills }: { items: Opportunity[]; skills: RoadmapItem[] }) {
  const { t } = useLocale();
  return (
    <SectionCard title={t('earn.opps.title')} icon={Lightbulb} iconTone="amber" iconTile bodyClassName="-mt-1">
      <OpportunityList items={items} skills={skills} empty={t('earn.opps.empty')} />
    </SectionCard>
  );
}

export function JobsCard({ items, skills }: { items: Opportunity[]; skills: RoadmapItem[] }) {
  const { t } = useLocale();
  return (
    <SectionCard title={t('earn.jobs.title')} icon={BriefcaseBusiness} iconTone="green" iconTile bodyClassName="-mt-2">
      <OpportunityList items={items} skills={skills} compact empty={t('earn.jobs.empty')} />
    </SectionCard>
  );
}
