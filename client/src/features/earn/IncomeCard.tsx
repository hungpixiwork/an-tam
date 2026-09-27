// Nguồn thu nhập hiện tại — gộp từ giao dịch thu trong sổ thu chi; "Thêm nguồn thu" ghi một giao dịch thu thật.

import { useState, type FormEvent } from 'react';
import { Plus, Wallet } from 'lucide-react';
import type { EarnDashboard, IncomeSourceKey } from '@shared/types/api';
import { formatMonthLocale, formatVndFull } from '@shared/format';
import { Button, FormAlert, FormField, Modal, MoneyInput, SectionCard, Segmented, StackedBar, TextInput, type ExtTone } from '@/components/ui';
import { useAddIncome } from '@/lib/queries';
import { useLocale } from '@/app/locale';

const SOURCE_TONE: Record<IncomeSourceKey, ExtTone> = { salary: 'green', side: 'blue', invest: 'amber', other: 'violet' };
const CATEGORIES = ['salary', 'freelance', 'invest_income', 'other_income'] as const;
type Category = (typeof CATEGORIES)[number];

const localToday = () => new Date().toLocaleDateString('sv-SE');

function AddIncomeModal({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const add = useAddIncome();
  const [category, setCategory] = useState<Category>('freelance');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(localToday());
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    add.mutate({ category, note: note.trim(), amount, occurredOn: date }, { onSuccess: onClose });
  };
  return (
    <Modal title={t('earn.add.title')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">{t('earn.add.type')}</p>
          <Segmented value={category} onChange={setCategory} label={t('earn.add.type')} options={CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}`) }))} />
        </div>
        <FormField label={t('earn.add.name')}>{(id) => <TextInput id={id} value={note} maxLength={80} placeholder={t('earn.add.name_ph')} onChange={(e) => setNote(e.target.value)} />}</FormField>
        <FormField label={t('earn.add.amount')}>{(id) => <MoneyInput id={id} value={amount} onChange={setAmount} autoFocus />}</FormField>
        <FormField label={t('earn.add.date')}>{(id) => <TextInput id={id} type="date" value={date} max={localToday()} onChange={(e) => setDate(e.target.value)} />}</FormField>
        <FormAlert error={add.error} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="white" onClick={onClose}>{t('earn.add.cancel')}</Button>
          <Button type="submit" disabled={amount <= 0 || add.isPending}>{t('earn.add.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function IncomeCard({ month, income }: Pick<EarnDashboard, 'month' | 'income'>) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <SectionCard
      title={t('earn.income.title')}
      icon={Wallet}
      iconTone="blue"
      iconTile
      extra={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-accent-100 bg-white px-3 text-[12.5px] font-semibold text-accent-600 hover:bg-accent-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('earn.income.add')}
        </button>
      }
    >
      {income.total > 0 ? (
        <>
          <p className="-mt-1 text-[32px] font-extrabold leading-tight tracking-tight text-ink tabular-nums">
            {formatVndFull(income.total)}
            <span className="ml-0.5 text-[17px] font-semibold text-ink-soft">{t('earn.per_month')}</span>
          </p>
          <StackedBar
            className="mt-4"
            height={14}
            segments={income.sources.map((s) => ({ key: s.key, label: t(`earn.income.src.${s.key}`), value: s.amount, tone: SOURCE_TONE[s.key] }))}
            formatValue={(v) => formatVndFull(v)}
            ariaLabel={t('earn.income.title')}
          />
          <p className="mt-3 text-[12px] text-ink-mute">{t('earn.income.note', { month: formatMonthLocale(month, locale).toLowerCase() })}</p>
        </>
      ) : (
        <p className="text-[13.5px] text-ink-soft">{t('earn.income.empty')}</p>
      )}
      {open && <AddIncomeModal onClose={() => setOpen(false)} />}
    </SectionCard>
  );
}
