import { Construction } from 'lucide-react';
import { useLocale } from '@/app/locale';
import { EmptyState, HeroBanner } from '@/components/ui';

/** Placeholder Wave 0 — Nhật ký AI (gộp AI theo dõi) dựng ở Wave 3. Neo #integrations / #privacy dùng cho link ở Topbar. */
export default function AuditPage() {
  const { t } = useLocale();
  return (
    <div className="space-y-4">
      <HeroBanner
        title={t('audit.hero.title')}
        subtitle={t('audit.hero.subtitle')}
        quote={t('audit.hero.quote')}
        image="/hero-lake-city.jpg"
        imageAlt={t('audit.hero.image_alt')}
      />
      <div id="integrations" className="scroll-mt-24" />
      <div id="privacy" className="scroll-mt-24" />
      <EmptyState icon={Construction} tone="green" title={t('common.under_construction')} body={t('common.under_construction_body')} />
    </div>
  );
}
