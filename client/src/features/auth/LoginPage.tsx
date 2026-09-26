import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/auth';
import { useLocale } from '@/app/locale';
import { Button } from '@/components/ui';
import { Field, FormError } from './fields';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      await login(String(form.get('email')), String(form.get('password')));
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.login_failed'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink">{t('auth.login_title')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('auth.login_subtitle')}</p>
      </div>
      <FormError message={error} />
      <Field label={t('auth.email')} name="email" type="email" autoComplete="email" required />
      <Field label={t('auth.password')} name="password" type="password" autoComplete="current-password" required />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t('auth.logging_in') : t('auth.login_btn')}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        {t('auth.no_account')}{' '}
        <Link to="/dang-ky" className="font-semibold text-accent-600 hover:underline">
          {t('auth.create_account')}
        </Link>
      </p>
    </form>
  );
}
