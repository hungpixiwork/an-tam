import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import { useLocale } from '@/app/locale';
import { NAV } from '@/app/nav';
import { cx } from '@/components/ui';

export function Logo({ compact = false, onClick }: { compact?: boolean; onClick?: () => void }) {
  const { t } = useLocale();

  return (
    <Link to="/" onClick={onClick} className="flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600" aria-label={t('nav.home_aria')}>
      <svg viewBox="0 0 32 32" className="h-10 w-10 shrink-0" aria-hidden>
        <path fill="#1FA37A" d="M15 29C7 27 3 20 5 9c7 1 12 6 10 20z" />
        <path fill="#0F5E45" d="M17 29c8-2 12-9 10-20-7 1-12 6-10 20z" />
        <path fill="#6FD3A8" d="M16 30c-1-8 0-15 3-22-4 5-6 12-3 22z" opacity=".8" />
      </svg>
      {!compact && (
        <span>
          <span className="block text-[22px] font-bold leading-tight tracking-tight text-ink">{t('app.name')}</span>
          <span className="block text-[11.5px] leading-snug text-ink-soft">
            {t('sidebar.tagline1')}
            <br />
            {t('sidebar.tagline2')}
          </span>
        </span>
      )}
    </Link>
  );
}

/** Thẻ minh họa cuối sidebar → Học tài chính (/cong-dong). Ẩn khi màn hình thấp để menu không bị chật. */
function PromoCard({ onClick }: { onClick: () => void }) {
  const { t } = useLocale();
  return (
    <Link
      to="/cong-dong"
      onClick={onClick}
      className="group relative m-4 mt-3 hidden h-[272px] shrink-0 overflow-hidden rounded-2xl border border-[#D8EAF6] bg-[#EAF5FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600 max-lg:block xl:block [@media(max-height:860px)]:!hidden"
    >
      <img src="/hero-lake-city.jpg" alt="" className="absolute inset-x-0 bottom-0 h-[190px] w-full object-cover object-[35%_center] [mask-image:linear-gradient(to_bottom,transparent,black_35%)]" loading="lazy" decoding="async" />
      <div className="relative px-5 pt-5">
        <p className="text-[16px] font-bold leading-snug text-ink">{t('sidebar.promo_title')}</p>
      </div>
      <p className="absolute bottom-4 left-4 right-16 rounded-lg bg-white/75 px-2.5 py-1.5 text-[11.5px] leading-snug text-ink-soft backdrop-blur-sm">{t('sidebar.promo_subtitle')}</p>
      <span className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-lift transition-transform group-hover:translate-x-0.5">
        <ArrowRight className="h-5 w-5" aria-hidden />
        <span className="sr-only">{t('sidebar.explore_lessons')}</span>
      </span>
    </Link>
  );
}

/**
 * Sidebar: ≥1280 đầy đủ; 1024–1279 thu còn cột icon; <1024 thành drawer (điều khiển bởi AppShell).
 */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLocale();

  return (
    <>
      {/* Lớp phủ khi mở drawer trên màn nhỏ */}
      <div
        className={cx(
          'fixed inset-0 z-30 bg-ink/30 transition-opacity duration-200 lg:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-white transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:w-[76px] lg:translate-x-0 xl:w-64',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label={t('nav.main_aria')}
      >
        <div className="flex items-center justify-between px-6 pb-6 pt-5 lg:px-4 xl:px-6">
          <span className="lg:hidden xl:block"><Logo onClick={onClose} /></span>
          <span className="hidden lg:block xl:hidden"><Logo compact /></span>
          <button type="button" className="rounded-lg p-2 text-ink-soft hover:bg-slate-100 lg:hidden" onClick={onClose} aria-label={t('nav.close_menu')}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3.5 pb-2">
          {NAV.map(({ key, to, icon: Icon }) => {
            const label = t(`nav.${key}`);
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={onClose}
                title={label}
                className={({ isActive }) =>
                  cx(
                    'flex h-11 items-center gap-3.5 rounded-xl px-3.5 text-[14.5px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-600 lg:justify-center xl:justify-start',
                    isActive ? 'bg-primary-50 font-semibold text-primary-700' : 'font-medium text-ink/85 hover:bg-slate-50 hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cx('h-[21px] w-[21px] shrink-0', isActive ? 'text-primary-700' : 'text-ink-soft')} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                    <span className="truncate lg:hidden xl:inline">{label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <PromoCard onClick={onClose} />
      </aside>
    </>
  );
}
