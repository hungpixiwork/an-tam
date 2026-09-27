import { Construction } from 'lucide-react';
import { useLocale } from '@/app/locale';
import { EmptyState, HeroBanner } from '@/components/ui';

/** Placeholder Wave 0 — Quỹ an toàn & mục tiêu (gộp Kế hoạch an toàn + mục tiêu tiết kiệm) dựng ở Wave 1. */
export default function SafetyPage() {
  const { t } = useLocale();
  return (
    <div className="space-y-4">
      <HeroBanner
        title={t('safety.hero.title')}
        subtitle={t('safety.hero.subtitle')}
        quote={t('safety.hero.quote')}
        image="/hero-lake-city.jpg"
        imageAlt={t('safety.hero.image_alt')}
      />
      <EmptyState icon={Construction} tone="green" title={t('common.under_construction')} body={t('common.under_construction_body')} />
    </div>
  );
}
