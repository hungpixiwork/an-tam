import { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/auth';
import { Logo } from '@/components/layout/Sidebar';
import { HeroLakeCity } from '@/components/pixel';

/** Khung trang đăng nhập / đăng ký: form bên trái, minh họa bên phải. */
export function AuthLayout() {
  const { me, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-canvas" aria-busy="true" />;
  if (me) return <Navigate to="/" replace />;

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(420px,520px)_1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <main className="flex flex-1 items-center py-10">
          <div className="w-full max-w-sm">
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <p className="text-xs text-ink-mute">Kết nối được mã hóa HTTPS. Mật khẩu được băm an toàn.</p>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#EAF4FB] to-[#DCEBF7] lg:block">
        <HeroLakeCity className="absolute inset-0 h-full w-full" />
        <div className="absolute left-10 top-10 max-w-md rounded-2xl bg-white/80 p-6 backdrop-blur">
          <p className="text-2xl font-extrabold leading-tight text-ink">Hiểu tiền của bạn.</p>
          <p className="text-2xl font-extrabold leading-tight text-primary-700">Chuẩn bị cho tương lai.</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">An Tâm AI theo dõi mục tiêu, mô phỏng rủi ro và gợi ý kế hoạch an toàn — bạn luôn là người quyết định cuối cùng.</p>
        </div>
      </div>
    </div>
  );
}
