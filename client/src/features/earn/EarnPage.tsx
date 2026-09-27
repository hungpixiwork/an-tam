// Trang 4 — Tăng thu nhập & kỹ năng (mockup 4). Mọi số liệu từ GET /api/earn/dashboard.

import { ErrorState, HeroBanner, PageSkeleton } from '@/components/ui';
import { useEarnDashboard } from '@/lib/queries';
import { useLocale } from '@/app/locale';

import { IncomeCard } from './IncomeCard';
import { JobsCard, OpportunitiesCard } from './OpportunityCards';
import { CareerCard } from './CareerCard';
import { RoadmapCard } from './RoadmapCard';
import { WeekPlanCard } from './WeekPlanCard';

export default function EarnPage() {
  const { t } = useLocale();
  const { data, error, refetch, isPending } = useEarnDashboard();
  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-3.5">
      <HeroBanner
        title={t('earn.hero_title')}
        highlight={<span className="block max-w-[640px] text-[17px] md:text-[20px]">{t('earn.hero_highlight')}</span>}
        description={t('earn.hero_desc')}
        quote={t('earn.hero_quote')}
        quoteClassName="w-[236px] self-start xl:mr-[22%] [&_blockquote]:text-[14px]"
        image="/hero-lake-city.jpg"
        imagePosition="right 58%"
        visualWidth="56%"
        className="min-h-[182px]"
      />

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[973fr_420fr]">
        <div className="min-w-0 space-y-3.5">
          <div id="co-hoi" className="grid scroll-mt-24 grid-cols-1 gap-3.5 lg:grid-cols-[468fr_491fr]">
            <IncomeCard month={data.month} income={data.income} />
            <OpportunitiesCard items={data.opportunities} skills={data.roadmap} />
          </div>
          <RoadmapCard items={data.roadmap} />
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[548fr_411fr]">
            <WeekPlanCard week={data.week} />
            <JobsCard items={data.jobs} skills={data.roadmap} />
          </div>
        </div>
        <CareerCard career={data.career} />
      </div>
    </div>
  );
}
