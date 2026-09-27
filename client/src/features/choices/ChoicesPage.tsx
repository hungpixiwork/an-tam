// Trang 6 — Lựa chọn cuộc đời (mockup 6). Dữ liệu: GET /api/life-choices + GET /api/life-choices/:id (đánh giá khi đọc).

import { useState } from 'react';
import { Compass, Plus } from 'lucide-react';
import { Button, EmptyState, ErrorState, HeroBanner, PageSkeleton } from '@/components/ui';
import { useLifeChoice, useLifeChoices } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { NewChoiceModal, SituationCard } from './SituationCard';
import { CompareOptions, DetailCard } from './OptionsSection';
import { ActionPlanCard, PrereqsCard } from './SidePanels';

export default function ChoicesPage() {
  const { t } = useLocale();
  const list = useLifeChoices();
  const [picked, setPicked] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const activeId = picked && list.data?.some((c) => c.id === picked) ? picked : list.data?.[0]?.id;
  const detail = useLifeChoice(activeId);

  const hero = (
    <HeroBanner
      title={t('choices.hero.title')}
      highlight={<span className="block max-w-[640px] text-[17px] font-semibold md:text-[20px]">{t('choices.hero.subtitle')}</span>}
      description={t('choices.hero.description')}
      quote={t('choices.hero.quote')}
      quoteClassName="w-[280px] self-start xl:mr-[20%] [&_blockquote]:text-[14px]"
      image="/hero-lake-city.jpg"
      imageAlt={t('choices.hero.image_alt')}
      imagePosition="right 55%"
      visualWidth="56%"
      className="min-h-[150px]"
    />
  );
  const modal = creating && (
    <NewChoiceModal
      onClose={() => setCreating(false)}
      onCreated={(id) => {
        setPicked(id);
        setCreating(false);
      }}
    />
  );

  if (list.isPending || (activeId && detail.isPending)) return <PageSkeleton />;
  if (list.error || detail.error) return <ErrorState error={list.error ?? detail.error} onRetry={() => (list.error ? list.refetch() : detail.refetch())} />;

  if (!detail.data) {
    return (
      <div className="space-y-3.5">
        {hero}
        <EmptyState
          icon={Compass}
          tone="violet"
          title={t('choices.empty.title')}
          body={t('choices.empty.body')}
          action={
            <Button icon={Plus} onClick={() => setCreating(true)}>
              {t('choices.situation.new')}
            </Button>
          }
        />
        {modal}
      </div>
    );
  }

  const d = detail.data;
  return (
    <div className="space-y-3.5">
      {hero}
      <SituationCard detail={d} choices={list.data ?? []} onPick={setPicked} onNew={() => setCreating(true)} />
      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[905fr_490fr]">
        <div className="min-w-0 space-y-3.5">
          <CompareOptions detail={d} />
          <DetailCard detail={d} />
        </div>
        <div className="min-w-0 space-y-3.5">
          <PrereqsCard detail={d} />
          <ActionPlanCard detail={d} />
        </div>
      </div>
      {modal}
    </div>
  );
}
