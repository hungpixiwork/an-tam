import { NavLink } from 'react-router-dom';
import { CalendarDays, House, Menu, NotebookPen, ShieldCheck } from 'lucide-react';
import { useLocale } from '@/app/locale';
import { cx } from '@/components/ui';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const { t } = useLocale();

  const primaryItems = [
    { to: '/', label: t('nav.overview') || 'Tổng quan', icon: House, end: true },
    { to: '/thu-chi', label: 'Thu chi', icon: NotebookPen },
    { to: '/quy-an-toan', label: 'Quỹ an toàn', icon: ShieldCheck },
    { to: '/lich-ai', label: 'Lịch AI', icon: CalendarDays },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-line bg-white px-1 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] lg:hidden"
    >
      {primaryItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cx(
                'flex flex-1 flex-col items-center justify-center py-1 text-[11px] font-semibold transition-colors',
                isActive ? 'text-primary-700 font-bold' : 'text-ink-soft hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cx('h-5 w-5', isActive ? 'text-primary-700' : 'text-ink-soft')} strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                <span className="truncate whitespace-nowrap text-[11px]">{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}

      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-1 flex-col items-center justify-center py-1 text-[11px] font-semibold text-ink-soft hover:text-ink"
        aria-label={t('nav.open_menu')}
      >
        <Menu className="h-5 w-5 text-ink-soft" aria-hidden />
        <span className="truncate whitespace-nowrap text-[11px]">{t('nav.menu_more')}</span>
      </button>
    </nav>
  );
}
