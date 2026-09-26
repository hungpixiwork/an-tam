import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import type { Me } from '@shared/types/api';
import { useAuth } from '@/app/auth';
import { useLocale } from '@/app/locale';
import { Button } from '@/components/ui';
import { Field, FormError } from './fields';

export default function LoginPage() {
  const { login, demoLogin } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const rawFrom = (location.state as { from?: string } | null)?.from;
  const from = rawFrom && !rawFrom.startsWith('/dang-nhap') && !rawFrom.startsWith('/dang-ky') ? rawFrom : '/';

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [demoPending, setDemoPending] = useState(false);

  function handleNavigateAfterAuth(user: Me) {
    if (!user.onboarded) {
      navigate('/bat-dau', { replace: true });
    } else {
      navigate(from, { replace: true });
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const user = await login(String(form.get('email')), String(form.get('password')));
      handleNavigateAfterAuth(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.login_failed'));
    } finally {
      setPending(false);
    }
  }

  async function handleDemoLogin() {
    setDemoPending(true);
    setError(null);
    try {
      const user = await demoLogin();
      handleNavigateAfterAuth(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.login_failed'));
    } finally {
      setDemoPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">{t('auth.login_title')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('auth.login_subtitle')}</p>
        </div>
        <FormError message={error} />
        <Field label={t('auth.email')} name="email" type="email" autoComplete="email" required />
        <Field label={t('auth.password')} name="password" type="password" autoComplete="current-password" required />
        <Button type="submit" size="lg" className="w-full" disabled={pending || demoPending}>
          {pending ? t('auth.logging_in') : t('auth.login_btn')}
        </Button>
      </form>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-canvas px-2 text-ink-mute">{t('auth.or_divider')}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDemoLogin}
        disabled={pending || demoPending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4 text-accent-600" />
        {demoPending ? t('auth.demo_logging_in') : t('auth.demo_btn')}
      </button>

      <p className="text-center text-sm text-ink-soft">
        {t('auth.no_account')}{' '}
        <Link to="/dang-ky" className="font-semibold text-accent-600 hover:underline">
          {t('auth.create_account')}
        </Link>
      </p>
    </div>
  );
}
