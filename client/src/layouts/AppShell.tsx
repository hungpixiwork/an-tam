import { Suspense, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/auth';
import { useLocale } from '@/app/locale';
import { titleFor } from '@/app/nav';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { PageSkeleton } from '@/components/ui';

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
        <main className="flex-1 min-w-0 p-4 md:px-5 md:py-3">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
