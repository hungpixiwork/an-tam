import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, ChevronDown, FileText, Lock, LogOut, Menu, Search, Settings, Target } from 'lucide-react';
import { useAuth, useMe } from '@/app/auth';
import { PixelAvatar } from '@/components/pixel';
import { cx } from '@/components/ui';
import { useNotifications, useSearch } from '@/lib/queries';

/** Đóng popover khi bấm ra ngoài hoặc nhấn Esc. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

function SearchBox() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  const navigate = useNavigate();
  const ref = useDismiss(open, () => setOpen(false));
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);
  const { data = [] } = useSearch(debounced);
  const go = (to: string) => {
    setOpen(false);
    setQ('');
    navigate(to);
  };
  const ICON = { page: FileText, goal: Target, lesson: BookOpen };

  return (
    <div ref={ref} className="relative hidden w-[220px] md:block 2xl:w-[276px]">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-soft" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && data[0] && go(data[0].to)}
        placeholder="Tìm kiếm"
        aria-label="Tìm kiếm trang, mục tiêu, bài học"
        className="h-11 w-full rounded-xl border border-line bg-[#F4F7FA] pl-10 pr-3 text-sm text-ink placeholder:text-ink-soft focus:border-accent-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-100"
      />
      {open && debounced && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lift">
          {data.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-soft">Không tìm thấy kết quả cho “{debounced}”.</p>
          ) : (
            data.map((r) => {
              const Icon = ICON[r.type];
              return (
                <button key={`${r.type}-${r.title}`} type="button" onClick={() => go(r.to)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{r.title}</span>
                    <span className="block truncate text-xs text-ink-soft">{r.subtitle}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const SEVERITY_DOT = { danger: 'bg-danger-500', warning: 'bg-warning-500', action: 'bg-success-500' };

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const { data = [] } = useNotifications();
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="relative rounded-xl p-2.5 text-ink-soft hover:bg-slate-100" aria-label={`Thông báo${data.length ? ` (${data.length} cảnh báo đang mở)` : ''}`} aria-expanded={open}>
        <Bell className="h-6 w-6" />
        {data.length > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-danger-500 ring-2 ring-white" />}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-lift">
          <p className="border-b border-line px-4 py-3 text-sm font-bold text-ink">Cảnh báo đang mở</p>
          {data.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-soft">Không có cảnh báo nào. Mọi thứ đang ổn!</p>
          ) : (
            data.map((n) => (
              <Link key={n.id} to="/ai-theo-doi" onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-slate-50">
                <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', SEVERITY_DOT[n.severity])} />
                <span className="text-sm text-ink">{n.title}</span>
              </Link>
            ))
          )}
          <Link to="/ai-theo-doi" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-center text-[13px] font-semibold text-accent-600 hover:bg-accent-50">
            Xem tất cả ở AI theo dõi
          </Link>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const me = useMe();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 rounded-xl py-1 pl-1 pr-2 hover:bg-slate-50" aria-expanded={open} aria-haspopup="menu">
        <PixelAvatar seed={me.avatarSeed} className="h-11 w-11 rounded-full ring-2 ring-white" />
        <span className="hidden text-left sm:block">
          <span className="block max-w-[160px] truncate text-[15px] font-semibold text-ink">{me.fullName}</span>
          <span className="block text-xs text-ink-soft">{me.memberStatus}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-ink-soft" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lift">
          <p className="truncate border-b border-line px-4 py-2.5 text-xs text-ink-soft">{me.email}</p>
          <Link role="menuitem" to="/cai-dat" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-slate-50">
            <Settings className="h-4 w-4 text-ink-soft" /> Cài đặt
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={async () => {
              await logout();
              navigate('/dang-nhap', { replace: true });
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50"
          >
            <LogOut className="h-4 w-4" /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

export function Topbar({ title, onMenu }: { title: string; onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center gap-4 border-b border-line bg-white/90 px-4 backdrop-blur md:px-8">
      <button type="button" onClick={onMenu} className="rounded-lg p-2 text-ink-soft hover:bg-slate-100 lg:hidden" aria-label="Mở menu">
        <Menu className="h-6 w-6" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-[22px] font-bold tracking-tight text-ink md:text-[26px] 2xl:text-[28px]">{title}</h1>
      <SearchBox />
      <Link to="/cai-dat" className="hidden h-11 items-center gap-2 rounded-xl bg-success-50 px-4 text-[13px] font-medium text-success-600 hover:bg-[#D9F2E5] xl:flex">
        <Lock className="h-4 w-4" aria-hidden />
        Dữ liệu riêng tư được bảo vệ
      </Link>
      <NotificationBell />
      <UserMenu />
    </header>
  );
}
