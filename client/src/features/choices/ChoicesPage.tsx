// 06 · Lựa chọn cuộc đời — bố cục theo mockup: hero → 4 bước → tình huống + lộ trình Bull/Base/Bear →
// kế hoạch liên hoàn + điều kiện + kết quả sơ bộ | Agent đồng hành hôm nay → các lựa chọn khác.

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Compass, Plus } from 'lucide-react';
import type { DecisionMode, LifeChoiceTemplate } from '@shared/types/api';
import { Button, EmptyState, ErrorState, HeroBanner, PageSkeleton } from '@/components/ui';
import { useLifeChoice, useLifeChoicePreview, useLifeChoices } from '@/lib/queries/choices';
import { useLocale } from '@/app/locale';
import { Journey } from './Journey';
import { EditChoiceModal, NewChoiceModal, SituationCard } from './SituationCard';
import { RoadmapCard } from './RoadmapCard';
import { ChainPlans, CompanionCard } from './PlanCards';
import { ConditionsCard, OutcomesCard } from './ResultCards';
import { Alternatives } from './Alternatives';

export default function ChoicesPage() {
  const { t } = useLocale();
  const [params, setParams] = useSearchParams();
  const list = useLifeChoices();
  const [mode, setMode] = useState<DecisionMode>('base');
  const [creating, setCreating] = useState<LifeChoiceTemplate['key'] | null>(null);
  const [editing, setEditing] = useState(false);
  const picked = params.get('id');
  const activeId = picked && list.data?.some((c) => c.id === picked) ? picked : list.data?.[0]?.id;
  const pick = (id: string) => setParams((p) => { p.set('id', id); return p; }, { replace: true });
  const detail = useLifeChoice(activeId);
  const preview = useLifeChoicePreview(activeId, mode);

  const hero = (
    <HeroBanner
      title={t('choices.hero.title')}
      description={t('choices.hero.subtitle')}
      quote={t('choices.hero.quote')}
      quoteClassName="w-[240px] self-start xl:mr-[20%] [&_blockquote]:text-[13px]"
      image="/hero-lake-city.jpg"
      imageAlt={t('choices.hero.image_alt')}
      imagePosition="right 55%"
      visualWidth="56%"
      className="min-h-[108px]"
    />
  );
  const modal = creating && (
    <NewChoiceModal initial={creating} onClose={() => setCreating(null)} onCreated={(id) => { pick(id); setCreating(null); }} />
  );
  if (list.isPending || (activeId && detail.isPending)) return <PageSkeleton />;
  if (list.error || detail.error) return <ErrorState error={list.error ?? detail.error} onRetry={() => (list.error ? list.refetch() : detail.refetch())} />;
  if (!detail.data) {
    return (
      <div className="space-y-3">
        {hero}
        <EmptyState icon={Compass} tone="violet" title={t('choices.empty.title')} body={t('choices.empty.body')} action={<Button icon={Plus} onClick={() => setCreating('study')}>{t('choices.situation.new')}</Button>} />
        {modal}
      </div>
    );
  }
  const d = detail.data;
  return (
    <div className="space-y-2.5">
      {hero}
      <Journey detail={d} />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1fr)]">
        <SituationCard detail={d} preview={preview.data} choices={list.data ?? []} onPick={pick} onNew={() => setCreating('study')} onEdit={() => setEditing(true)} />
        <RoadmapCard detail={d} mode={mode} onMode={setMode} />
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-2.5">
          <ChainPlans detail={d} />
          <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <ConditionsCard preview={preview.data} />
            <OutcomesCard preview={preview.data} />
          </div>
        </div>
        <CompanionCard detail={d} mode={mode} />
      </div>
      <Alternatives currentId={d.id} choices={list.data ?? []} onPick={pick} onTemplate={setCreating} />
      {modal}
      {editing && <EditChoiceModal detail={d} onClose={() => setEditing(false)} />}
    </div>
  );
}
