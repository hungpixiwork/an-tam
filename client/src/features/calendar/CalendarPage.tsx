import { Construction } from 'lucide-react';
import { useLocale } from '@/app/locale';
import { EmptyState, HeroBanner } from '@/components/ui';

/** Placeholder Wave 0 — Lịch AI dựng ở Wave 2. */
export default function CalendarPage() {
  const { t } = useLocale();
  return (
    <div className="space-y-4">
      <HeroBanner
        title={t('calendar.hero.title')}
        subtitle={t('calendar.hero.subtitle')}
        description={t('calendar.hero.description')}
        quote={t('calendar.hero.quote')}
        image="/hero-lake-city.jpg"
        imageAlt={t('calendar.hero.image_alt')}
      />
      <EmptyState icon={Construction} tone="blue" title={t('common.under_construction')} body={t('common.under_construction_body')} />
    </div>
  );
}
