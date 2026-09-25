import { useState, type FormEvent } from 'react';
import { Check, KeyRound, UserRound, Wallet } from 'lucide-react';
import type { ProfileUsage } from '@shared/types/api';
import type { Salutation } from '@shared/types/domain';
import { formatVnd } from '@shared/format';
import { useMe } from '@/app/auth';
import { Button, Card, CardTitle, FormAlert, FormField, MoneyInput, Segmented, Skeleton, TextInput } from '@/components/ui';
import { useChangePassword, useProfile, useSaveProfile, useUpdateMe } from '@/lib/queries';

const M = 1_000_000;

function Saved({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-success-600" role="status">
      <Check className="h-4 w-4" aria-hidden /> Đã lưu
    </span>
  );
}

/* ───────── Hồ sơ ───────── */

export function ProfileCard() {
  const me = useMe();
  const [fullName, setFullName] = useState(me.fullName);
  const [salutation, setSalutation] = useState<Salutation>(me.salutation);
  const update = useUpdateMe();
  const dirty = fullName.trim() !== me.fullName || salutation !== me.salutation;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    update.mutate({ fullName: fullName.trim(), salutation });
  }

  return (
    <Card>
      <CardTitle icon={UserRound} title="Hồ sơ" subtitle={me.email} />
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Họ và tên">{(id) => <TextInput id={id} value={fullName} maxLength={80} autoComplete="name" onChange={(e) => setFullName(e.target.value)} />}</FormField>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">AI xưng hô với bạn là</p>
          <Segmented label="Xưng hô" value={salutation} onChange={setSalutation} options={[{ value: 'anh', label: 'Anh' }, { value: 'chị', label: 'Chị' }, { value: 'bạn', label: 'Bạn' }]} />
        </div>
        <FormAlert error={update.error} />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!dirty || fullName.trim().length < 2 || update.isPending}>
            {update.isPending ? 'Đang lưu…' : 'Lưu hồ sơ'}
          </Button>
          <Saved show={update.isSuccess && !dirty} />
        </div>
      </form>
    </Card>
  );
}

/* ───────── Đổi mật khẩu ───────── */

export function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const change = useChangePassword();
  const mismatch = confirm.length > 0 && next !== confirm;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent('');
          setNext('');
          setConfirm('');
        },
      },
    );
  }

  return (
    <Card>
      <CardTitle icon={KeyRound} tone="violet" title="Đổi mật khẩu" subtitle="Các thiết bị khác sẽ bị đăng xuất sau khi đổi." />
      <form onSubmit={onSubmit} className="space-y-3">
        <FormField label="Mật khẩu hiện tại">
          {(id) => <TextInput id={id} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}
        </FormField>
        <FormField label="Mật khẩu mới" hint="Ít nhất 8 ký tự">
          {(id) => <TextInput id={id} type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />}
        </FormField>
        <FormField label="Nhập lại mật khẩu mới" hint={mismatch ? 'Mật khẩu nhập lại chưa khớp' : undefined}>
          {(id) => <TextInput id={id} type="password" autoComplete="new-password" value={confirm} aria-invalid={mismatch} onChange={(e) => setConfirm(e.target.value)} />}
        </FormField>
        <FormAlert error={change.error} />
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" variant="white" disabled={!current || next.length < 8 || next !== confirm || change.isPending}>
            {change.isPending ? 'Đang đổi…' : 'Đổi mật khẩu'}
          </Button>
          <Saved show={change.isSuccess} />
        </div>
      </form>
    </Card>
  );
}

/* ───────── Thu chi cơ bản ───────── */

const SOURCE_TEXT: Record<ProfileUsage['incomeSource'], string> = {
  ledger: 'từ Sổ thu chi',
  baseline: 'từ số bên dưới',
  current_month: 'từ sổ tháng này',
  none: 'chưa có',
};

export function FinanceBasicsCard() {
  const { data } = useProfile();
  return (
    <Card>
      <div id="tai-chinh" className="scroll-mt-24" />
      <CardTitle icon={Wallet} tone="green" title="Thu chi cơ bản" subtitle="Số ước lượng AI dùng khi Sổ thu chi chưa đủ dữ liệu." />
      {data ? <FinanceForm key={JSON.stringify(data.baseline)} baseline={data.baseline} used={data.used} /> : <Skeleton className="h-60" />}
    </Card>
  );
}

function FinanceForm({ baseline, used }: { baseline: { monthlyIncome: number; monthlyExpense: number; emergencyTargetMonths: number }; used: ProfileUsage }) {
  const [income, setIncome] = useState(baseline.monthlyIncome);
  const [expense, setExpense] = useState(baseline.monthlyExpense);
  const [months, setMonths] = useState(String(baseline.emergencyTargetMonths));
  const save = useSaveProfile();
  const dirty = income !== baseline.monthlyIncome || expense !== baseline.monthlyExpense || Number(months) !== baseline.emergencyTargetMonths;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate({ monthlyIncome: income, monthlyExpense: expense, emergencyTargetMonths: Number(months) });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Thu nhập / tháng">{(id) => <MoneyInput id={id} value={income} onChange={setIncome} chips={[10 * M, 20 * M, 30 * M]} />}</FormField>
        <FormField label="Chi tiêu / tháng">{(id) => <MoneyInput id={id} value={expense} onChange={setExpense} chips={[5 * M, 10 * M, 15 * M]} />}</FormField>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-semibold text-ink">Quỹ dự phòng mục tiêu</p>
        <Segmented label="Số tháng dự phòng" value={months} onChange={setMonths} options={['3', '6', '9', '12'].map((v) => ({ value: v, label: `${v} tháng` }))} />
      </div>
      <p className="rounded-xl bg-slate-50 p-3 text-[13px] leading-relaxed text-ink-soft">
        AI đang dùng: thu <b className="text-ink">{formatVnd(used.income)}</b> ({SOURCE_TEXT[used.incomeSource]}) · chi <b className="text-ink">{formatVnd(used.expense)}</b> (
        {SOURCE_TEXT[used.expenseSource]}).
      </p>
      <FormAlert error={save.error} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!dirty || save.isPending}>
          {save.isPending ? 'Đang lưu…' : 'Lưu thu chi'}
        </Button>
        <Saved show={save.isSuccess && !dirty} />
      </div>
    </form>
  );
}
