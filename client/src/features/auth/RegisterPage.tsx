import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Salutation } from '@shared/types/domain';
import { useAuth } from '@/app/auth';
import { useLocale } from '@/app/locale';
import { Button, cx } from '@/components/ui';
import { Field, FormError } from './fields';

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [salutation, setSalutation] = useState<Salutation>('anh');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const salutations: { value: Salutation; label: string }[] = [
    { value: 'anh', label: t('auth.salutation.anh') },
    { value: 'chị', label: t('auth.salutation.chi') },
    { value: 'bạn', label: t('auth.salutation.ban') },
  ];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      await register({
        fullName: String(form.get('fullName')),
        email: String(form.get('email')),
        password: String(form.get('password')),
        salutation,
      });
      navigate('/bat-dau', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.register_failed'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink">{t('auth.register_title')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('auth.register_subtitle')}</p>
      </div>
      <FormError message={error} />
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink">{t('auth.salutation')}</legend>
        <div className="flex gap-2">
          {salutations.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSalutation(s.value)}
              aria-pressed={salutation === s.value}
              className={cx(
                'h-10 flex-1 rounded-xl border text-sm font-semibold transition-colors',
                salutation === s.value ? 'border-accent-600 bg-accent-50 text-accent-700' : 'border-line bg-white text-ink-soft hover:bg-slate-50',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>
      <Field label={t('auth.full_name')} name="fullName" autoComplete="name" required placeholder={t('auth.full_name_placeholder')} />
      <Field label={t('auth.email')} name="email" type="email" autoComplete="email" required />
      <Field label={t('auth.password')} name="password" type="password" autoComplete="new-password" required minLength={8} hint={t('auth.password_hint')} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t('auth.registering') : t('auth.register_btn')}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        {t('auth.have_account')}{' '}
        <Link to="/dang-nhap" className="font-semibold text-accent-600 hover:underline">
          {t('auth.login_btn')}
        </Link>
      </p>
    </form>
  );
}
