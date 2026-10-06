// Trang 4 — Tăng thu nhập & kỹ năng (mockup 4). Mọi số liệu từ GET /api/earn/dashboard.

import { ErrorState, HeroBanner, PageSkeleton } from '@/components/ui';
import { useEarnDashboard } from '@/lib/queries';
import { useLocale } from '@/app/locale';

import { IncomeCard } from './IncomeCard';
import { JobsCard, OpportunitiesCard } from './OpportunityCards';
import { CareerCard } from './CareerCard';
import { RoadmapCard } from './RoadmapCard';
import { WeekPlanCard } from './WeekPlanCard';
import { DecisionStrip } from '@/components/actions/DecisionStrip';
import { useFocusParam } from '@/lib/useFocusParam';

export default function EarnPage() {
  const { t } = useLocale();
  const { data, error, refetch, isPending } = useEarnDashboard();
  // ?focus=side (từ gợi ý "Xây nguồn thu nhập phụ") → tới khối cơ hội làm thêm
  useFocusParam(!isPending, { side: 'co-hoi' });
  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-3.5">
      {/* ── Desktop Hero Banner (Ẩn trên Mobile để tối ưu viewport) ── */}
      <div className="hidden md:block">
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
      </div>

      {/* ── Mobile Compact Header ── */}
      <div className="flex items-center justify-between gap-3 pb-0.5 md:hidden">
        <div>
          <h1 className="text-[20px] font-extrabold text-ink">{t('earn.hero_title')}</h1>
          <p className="text-[12px] text-ink-soft">Phát triển kỹ năng & mở rộng nguồn thu</p>
        </div>
      </div>

      <DecisionStrip domain="earn" />

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
