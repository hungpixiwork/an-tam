import { Suspense, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/auth';
import { useLocale } from '@/app/locale';
import { titleFor } from '@/app/nav';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { PageSkeleton } from '@/components/ui';

import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

/** Khung cho mọi màn cần đăng nhập: Sidebar + Topbar + nội dung. */
export function AppShell() {
  const { me, loading } = useAuth();
  const { t } = useLocale();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const title = titleFor(location.pathname, t);

  useEffect(() => {
    document.title = `${title} · ${t('app.name')}`;
    window.scrollTo({ top: 0 });
  }, [title, t]);

  if (loading) return <div className="min-h-screen bg-canvas" aria-busy="true" />;
  if (!me) {
    const fullPath = location.pathname + location.search;
    return <Navigate to="/dang-nhap" replace state={{ from: fullPath }} />;
  }
  // Tài khoản mới: nhập dữ liệu ban đầu (hoặc bỏ qua) trước khi vào ứng dụng
  if (!me.onboarded) return <Navigate to="/bat-dau" replace />;

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar open={drawer} onClose={() => setDrawer(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} onMenu={() => setDrawer(true)} />
        <main className="mx-auto w-full max-w-[1480px] flex-1 min-w-0 p-3 pb-28 md:p-6 md:pb-6">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
        <MobileBottomNav onOpenMenu={() => setDrawer(true)} />
      </div>
    </div>
  );
}
