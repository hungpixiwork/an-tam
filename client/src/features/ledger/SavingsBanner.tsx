import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cx } from '@/components/ui';
import { useLocale } from '@/app/locale';

/** Banner minh họa cuối trang → mô phỏng mục tiêu. */
export function SavingsBanner({ className }: { className?: string }) {
  const { t } = useLocale();
  return (
    <section
      className={cx('relative flex min-h-[250px] flex-col overflow-hidden rounded-2xl border border-line bg-cover p-5 shadow-card', className)}
      style={{ backgroundImage: 'url(/hero-lake-city.jpg)', backgroundPosition: 'right 58%' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white/90 to-white/0" aria-hidden />
      <div className="relative max-w-[78%]">
        <h2 className="text-[20px] font-extrabold leading-tight text-ink">{t('ledger.banner.title')}</h2>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{t('ledger.banner.body')}</p>
      </div>
      <Link to="/mo-phong" className="relative mt-auto inline-flex h-9 w-fit items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-accent-700 shadow-soft hover:bg-accent-50">
        {t('ledger.banner.cta')} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </section>
  );
}
