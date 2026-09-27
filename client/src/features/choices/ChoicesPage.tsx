import { Construction } from 'lucide-react';
import { useLocale } from '@/app/locale';
import { EmptyState, HeroBanner } from '@/components/ui';

/** Placeholder Wave 0 — Lựa chọn cuộc đời dựng ở Wave 2. */
export default function ChoicesPage() {
  const { t } = useLocale();
  return (
    <div className="space-y-4">
      <HeroBanner
        title={t('choices.hero.title')}
        subtitle={t('choices.hero.subtitle')}
        description={t('choices.hero.description')}
        quote={t('choices.hero.quote')}
        image="/winding-path.jpg"
        imageAlt={t('choices.hero.image_alt')}
      />
      <EmptyState icon={Construction} tone="violet" title={t('common.under_construction')} body={t('common.under_construction_body')} />
    </div>
  );
}
