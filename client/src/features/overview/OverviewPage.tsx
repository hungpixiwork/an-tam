// Trang 1 — Tổng quan (mockup 1). Mọi số liệu lấy từ GET /api/overview (engine buildOverview).

import { ButtonLink, ErrorState, HeroBanner, PageSkeleton } from '@/components/ui';
import { useOverview } from '@/lib/queries';
import { useAuth } from '@/app/auth';
import { useLocale } from '@/app/locale';

import { KpiRow } from './KpiRow';
import { SuggestionsCard } from './SuggestionsCard';
import { TodayCalendarCard } from './TodayCalendarCard';
import { LifeChoiceCard, NetWorthCard, ResourcesCard } from './BottomRow';

export default function OverviewPage() {
  const { me } = useAuth();
  const { t } = useLocale();
  const { data, error, refetch, isPending } = useOverview();
  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  const s = me?.salutation ?? 'bạn';

  return (
    <div className="space-y-3.5">
      {/* H1 — lời chào */}
      <HeroBanner
        title={data.greeting.title}
        highlight={data.ready ? t('overview.hero.subtitle', { s }) : data.greeting.headline}
        description={data.ready ? t('overview.hero.description') : data.greeting.sub}
        quote={t('overview.hero.quote')}
        quoteClassName="w-[262px] self-start mt-1 xl:mr-[20%] [&_blockquote]:text-[13.5px]"
        image="/hero-lake-city.jpg"
        imagePosition="right 58%"
        visualWidth="56%"
        className="min-h-[188px]"
      >
        {!data.ready && (
          <ButtonLink to="/cai-dat#tai-chinh" size="sm" arrow>
            {t('overview.hero.empty_cta')}
          </ButtonLink>
        )}
      </HeroBanner>

      {/* H2 — 4 chỉ số */}
      <KpiRow data={data} />

      {/* H3 — đề xuất hôm nay · lịch hôm nay */}
      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[863fr_518fr]">
        <SuggestionsCard suggestions={data.todaySuggestions} />
        <TodayCalendarCard date={data.todayDate} events={data.todayEvents} />
      </div>

      {/* H4 — tài sản · nguồn lực · lựa chọn cuộc đời */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-[515fr_434fr_420fr]">
        <NetWorthCard nw={data.netWorthBreakdown} />
        <ResourcesCard rings={data.resourceRings} />
        <LifeChoiceCard choice={data.pinnedLifeChoice} className="md:col-span-2 xl:col-span-1" />
      </div>
    </div>
  );
}
