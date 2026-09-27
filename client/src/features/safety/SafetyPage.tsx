// Trang 3 — Quỹ an toàn & mục tiêu (mockup 3). Số liệu từ GET /api/safety (engine buildSafety).

import { useState } from 'react';
import type { Goal } from '@shared/types/domain';
import { ErrorState, HeroBanner, PageSkeleton } from '@/components/ui';
import { useSafety } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { FundRow } from './FundRow';
import { GoalsSection } from './GoalsSection';
import { AdviceSection } from './AdviceSection';
import { GoalFormModal } from './GoalFormModal';

export default function SafetyPage() {
  const { t } = useLocale();
  const { data, error, refetch, isPending } = useSafety();
  const [editing, setEditing] = useState<{ goal: Goal | null; key: number } | null>(null);
  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const open = (goal: Goal | null) => setEditing({ goal, key: Date.now() });
  const emergency = data.goals.find((g) => g.essential)?.goal ?? null;

  return (
    <div className="space-y-3.5">
      <HeroBanner
        title={t('safety.hero.title')}
        subtitle={t('safety.hero.subtitle')}
        quote={t('safety.hero.quote')}
        quoteClassName="w-[350px] self-start xl:mr-[9%] [&_blockquote]:text-[13.5px]"
        image="/hero-lake-city.jpg"
        imageAlt={t('safety.hero.image_alt')}
        imagePosition="right 45%"
        visualWidth="52%"
        className="!min-h-[124px] [&>div]:py-5 [&_h2+p]:text-[15px] [&_h2+p]:text-ink-soft"
      />
      <FundRow data={data} onAdjust={() => open(emergency)} />
      <GoalsSection data={data} onEdit={open} onAdd={() => open(null)} />
      <AdviceSection data={data} />
      {editing && <GoalFormModal key={editing.key} goal={editing.goal} onClose={() => setEditing(null)} />}
    </div>
  );
}
