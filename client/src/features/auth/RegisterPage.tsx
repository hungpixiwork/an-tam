import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Salutation } from '@shared/types/domain';
import { useAuth } from '@/app/auth';
import { Button, cx } from '@/components/ui';
import { Field, FormError } from './fields';

const SALUTATIONS: { value: Salutation; label: string }[] = [
  { value: 'anh', label: 'Anh' },
  { value: 'chị', label: 'Chị' },
  { value: 'bạn', label: 'Bạn' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [salutation, setSalutation] = useState<Salutation>('anh');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-ink-soft">Tài khoản mới có sẵn bộ dữ liệu mẫu để bạn khám phá ngay.</p>
      </div>
      <FormError message={error} />
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink">Xưng hô</legend>
        <div className="flex gap-2">
          {SALUTATIONS.map((s) => (
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
      <Field label="Họ và tên" name="fullName" autoComplete="name" required placeholder="Nguyễn Văn Minh" />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Mật khẩu" name="password" type="password" autoComplete="new-password" required minLength={8} hint="Ít nhất 8 ký tự" />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        Đã có tài khoản?{' '}
        <Link to="/dang-nhap" className="font-semibold text-accent-600 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
