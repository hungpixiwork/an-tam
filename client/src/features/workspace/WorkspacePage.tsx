import { Construction } from 'lucide-react';
import { useLocale } from '@/app/locale';
import { EmptyState, HeroBanner } from '@/components/ui';

/** Placeholder Wave 0 — AI Workspace dựng ở Wave 3. */
export default function WorkspacePage() {
  const { t } = useLocale();
  return (
    <div className="space-y-4">
      <HeroBanner
        title={t('workspace.hero.title')}
        subtitle={t('workspace.hero.subtitle')}
        quote={t('workspace.hero.quote')}
        image="/family-city.jpg"
        imageAlt={t('workspace.hero.image_alt')}
      />
      <EmptyState icon={Construction} tone="teal" title={t('common.under_construction')} body={t('common.under_construction_body')} />
    </div>
  );
}
