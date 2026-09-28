import { Suspense, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/auth';
import { useLocale } from '@/app/locale';
import { Logo } from '@/components/layout/Sidebar';
import { LanguageSelector } from '@/components/LanguageSelector';
import { mcpReturnPath } from '@/features/auth/mcpReturn';

function ReturnToMcp({ path }: { path: string }) {
  useEffect(() => { window.location.replace(path); }, [path]);
  return <div className="min-h-screen bg-canvas" aria-busy="true" />;
}

/** Khung trang đăng nhập / đăng ký: form bên trái, minh họa bên phải. */
export function AuthLayout() {
  const { me, loading } = useAuth();
  const location = useLocation();
  const { t } = useLocale();

  if (loading) return <div className="min-h-screen bg-canvas" aria-busy="true" />;
  if (me) {
    const mcpNext = mcpReturnPath(location.search, window.location.origin);
    return mcpNext ? <ReturnToMcp path={mcpNext} /> : <Navigate to={me.onboarded ? '/' : '/bat-dau'} replace />;
  }

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(420px,520px)_1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <LanguageSelector variant="button" />
        </div>
        <main className="flex flex-1 items-center py-10">
          <div className="w-full max-w-sm">
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <p className="text-xs text-ink-mute">{t('auth.footer_secure')}</p>
      </div>
      <div className="relative hidden overflow-hidden bg-canvas lg:block">
        <img
          src="/auth-hero.jpg"
          alt="An Tâm AI - Hiểu tiền của bạn, chuẩn bị cho tương lai"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute left-10 top-10 max-w-md rounded-2xl border border-line bg-white p-6 shadow-lift">
          <p className="text-2xl font-extrabold leading-tight text-ink">{t('app.tagline1')}</p>
          <p className="text-2xl font-extrabold leading-tight text-primary-700">{t('app.tagline2')}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t('app.description')}</p>
        </div>
      </div>
    </div>
  );
}
