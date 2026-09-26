import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import { useLocale } from '@/app/locale';
import { NAV } from '@/app/nav';
import { WindingPath } from '@/components/pixel';
import { cx } from '@/components/ui';

export function Logo({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();

  return (
    <Link to="/" className="flex items-center gap-3" aria-label="An Tâm AI — về trang Tổng quan">
      <svg viewBox="0 0 32 32" className="h-10 w-10 shrink-0" aria-hidden>
        <path fill="#1FA37A" d="M15 29C7 27 3 20 5 9c7 1 12 6 10 20z" />
        <path fill="#0E6B58" d="M17 29c8-2 12-9 10-20-7 1-12 6-10 20z" />
        <path fill="#6FD3A8" d="M16 30c-1-8 0-15 3-22-4 5-6 12-3 22z" opacity=".8" />
      </svg>
      {!compact && (
        <span>
          <span className="block text-[22px] font-bold leading-tight tracking-tight text-ink">{t('app.name')}</span>
          <span className="block text-[11.5px] leading-snug text-ink-soft">
            {t('app.tagline1')}
            <br />
            {t('app.tagline2')}
          </span>
        </span>
      )}
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
      <div className={cx('fixed inset-0 z-30 bg-ink/30 lg:hidden', open ? 'block' : 'hidden')} onClick={onClose} aria-hidden />
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:w-[76px] xl:w-64',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Điều hướng chính"
      >
        <div className="flex items-center justify-between px-6 pb-7 pt-6 lg:px-4 xl:px-6">
          <span className="lg:hidden xl:block"><Logo /></span>
          <span className="hidden lg:block xl:hidden"><Logo compact /></span>
          <button type="button" className="rounded-lg p-2 text-ink-soft hover:bg-slate-100 lg:hidden" onClick={onClose} aria-label="Đóng menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3.5">
          {NAV.map(({ key, to, icon: Icon }) => {
            const displayLabel = t(`nav.${key}`);
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={onClose}
                title={displayLabel}
                className={({ isActive }) =>
                  cx(
                    'flex h-12 items-center gap-3.5 rounded-xl px-3.5 text-[15px] transition-colors lg:justify-center xl:justify-start',
                    isActive ? 'bg-accent-50 font-semibold text-accent-600' : 'font-medium text-ink/85 hover:bg-slate-50 hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cx('h-[22px] w-[22px] shrink-0', isActive ? 'text-accent-600' : 'text-ink-soft')} strokeWidth={isActive ? 2.4 : 2} fill={isActive ? 'currentColor' : 'none'} fillOpacity={isActive ? 0.15 : 0} />
                    <span className="lg:hidden xl:inline">{displayLabel}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Thẻ promo */}
        <Link
          to="/cong-dong"
          onClick={onClose}
          className="group relative m-4 block h-[296px] overflow-hidden rounded-2xl border border-[#D8EAF6] bg-[#EAF5FC] lg:hidden xl:block"
        >
          <WindingPath className="absolute inset-x-0 bottom-0 h-[200px] w-full" />
          <div className="relative px-5 pt-5">
            <p className="whitespace-pre-line text-[17px] font-bold leading-snug text-ink">
              {t('sidebar.promo_title')}
            </p>
            <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">
              {t('sidebar.promo_subtitle')}
            </p>
          </div>
          <span className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-lift transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="h-5 w-5" aria-hidden />
            <span className="sr-only">{t('sidebar.explore_lessons')}</span>
          </span>
        </Link>
      </aside>
    </>
  );
}
