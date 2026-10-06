// Trang 5 — Lịch AI & kế hoạch tự động (mockup 5). Dữ liệu: GET /api/calendar?week, /api/automation-rules, /api/integrations.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorState, HeroBanner, PageSkeleton } from '@/components/ui';
import { useCalendarWeek } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { WeekCalendarCard, type CalendarView } from './WeekCalendarCard';
import { GoogleSyncCard } from './GoogleSyncCard';
import { AiPlanCard } from './AiPlanCard';
import { AutomationRulesCard } from './AutomationRulesCard';
import { ProposalsCard } from './ProposalsCard';
import { weekStartOf } from './util';

const vnToday = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

export default function CalendarPage() {
  const { t } = useLocale();
  const [params, setParams] = useSearchParams();
  const [anchor, setAnchor] = useState(vnToday);
  const [view, setView] = useState<CalendarView>('week');
  const [flash] = useState<'connected' | 'error' | null>(() => {
    const g = params.get('google');
    return g === 'connected' ? 'connected' : g ? 'error' : null;
  });
  // Bỏ ?google=… sau khi đọc (quay về từ trang đồng ý của Google)
  useEffect(() => {
    if (params.has('google')) setParams({}, { replace: true });
  }, [params, setParams]);

  const week = weekStartOf(anchor);
  const { data, error, refetch, isPending } = useCalendarWeek(week);
  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,978fr)_minmax(340px,420fr)]">
      <div className="min-w-0 space-y-3.5">
        <div className="hidden md:block">
          <HeroBanner
            title={t('calendar.hero.title')}
            subtitle={t('calendar.hero.subtitle')}
            description={t('calendar.hero.description')}
            quote={t('calendar.hero.quote')}
            quoteClassName="w-[256px] self-start xl:mr-0 [&_blockquote]:text-[13.5px]"
            image="/hero-lake-city.jpg"
            imagePosition="right 60%"
            visualWidth="42%"
            className="min-h-[140px] [&_h2]:md:text-[30px]"
          />
        </div>
        <WeekCalendarCard data={data} anchor={anchor} view={view} onAnchor={setAnchor} onView={setView} />
      </div>
      <aside className="min-w-0 space-y-3.5" aria-label={t('calendar.ai.title')}>
        <GoogleSyncCard sync={data.sync} week={week} flash={flash} />
        <AiPlanCard week={week} />
        <AutomationRulesCard />
        <ProposalsCard proposals={data.proposals} />
      </aside>
    </div>
  );
}
