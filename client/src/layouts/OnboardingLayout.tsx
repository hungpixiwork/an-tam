import { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/auth';
import { Logo } from '@/components/layout/Sidebar';
import { PageSkeleton } from '@/components/ui';

/** Khung màn "Bắt đầu": chỉ cho tài khoản đã đăng nhập nhưng chưa hoàn tất. */
export function OnboardingLayout() {
  const { me, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-canvas" aria-busy="true" />;
  if (!me) return <Navigate to="/dang-nhap" replace />;
  if (me.onboarded) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-canvas px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Logo />
        <main className="mt-6">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
