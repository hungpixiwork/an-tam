import { Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/auth';
import { Logo } from '@/components/layout/Sidebar';
import { LanguageSelector } from '@/components/LanguageSelector';
import { PageSkeleton } from '@/components/ui';

/** Khung màn "Bắt đầu": chỉ cho tài khoản đã đăng nhập nhưng chưa hoàn tất. */
export function OnboardingLayout() {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen bg-canvas" aria-busy="true" />;
  if (!me) {
    const fullPath = location.pathname + location.search;
    return <Navigate to="/dang-nhap" replace state={{ from: fullPath }} />;
  }
  if (me.onboarded) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-canvas px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <LanguageSelector variant="button" />
        </div>
        <main className="mt-6">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
