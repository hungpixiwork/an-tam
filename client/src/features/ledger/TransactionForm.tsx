// Form thêm / sửa giao dịch (nút "Thêm giao dịch", menu ⋯ và tab Tất cả giao dịch).

import { useRef, useState, type FormEvent } from 'react';
import { Check, Trash2 } from 'lucide-react';
import type { SpendingTag, Transaction, TransactionKind } from '@shared/types/domain';
import { TRANSACTION_CATEGORIES, categoryOf } from '@shared/engine/ledger';
import { SPENDING_TAGS } from '@shared/engine/spending';
import { useLocale } from '@/app/locale';
import { Button, FormAlert, Modal, MoneyInput, Segmented, TextInput, cx } from '@/components/ui';
import { useDeleteTransaction, useSaveTransaction, type TransactionInput } from '@/lib/queries';
import { categoryIcon } from './categoryIcons';

const K = 1_000;
const M = 1_000_000;
const CHIPS: Record<TransactionKind, number[]> = {
  expense: [50 * K, 100 * K, 200 * K, 500 * K, 1 * M],
  income: [5 * M, 10 * M, 20 * M, 30 * M],
};
const DEFAULT_CATEGORY: Record<TransactionKind, string> = { expense: 'food', income: 'salary' };

/** Ngày hôm nay theo giờ máy người dùng, dạng 'YYYY-MM-DD'. */
export const localToday = () => new Date().toLocaleDateString('sv-SE');

/** Hộp thoại "Thêm giao dịch" / "Sửa giao dịch". */
export function AddTransactionModal({ onClose, initial }: { onClose: () => void; initial?: Transaction }) {
  const { t } = useLocale();
  return (
    <Modal title={initial ? t('ledger.edit_title') : t('ledger.btn.add')} onClose={onClose} className="max-w-lg">
      <TransactionForm initial={initial} onSaved={() => onClose()} />
    </Modal>
  );
}

/* ───────── Form thêm / sửa ───────── */

export function TransactionForm({ initial, onSaved }: { initial?: Transaction; onSaved: (month: string) => void }) {
  const { t } = useLocale();
  const [kind, setKind] = useState<TransactionKind>(initial?.kind ?? 'expense');
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [category, setCategory] = useState(initial?.category ?? DEFAULT_CATEGORY.expense);
  const [valueTag, setValueTag] = useState<SpendingTag | undefined>(initial?.valueTag);
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(initial?.occurredOn ?? localToday());
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const amountRef = useRef<HTMLDivElement>(null);
  const save = useSaveTransaction();
  const del = useDeleteTransaction();

  const categories = TRANSACTION_CATEGORIES.filter((c) => c.kind === kind);

  function changeKind(k: TransactionKind) {
    setKind(k);
    if (categoryOf(category)?.kind !== k) setCategory(DEFAULT_CATEGORY[k]);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (amount <= 0) return;
    const input: TransactionInput = {
      kind,
      amount,
      category,
      note: note.trim(),
      occurredOn: date,
      valueTag: kind === 'expense' ? valueTag : undefined,
    };
    save.mutate(initial ? { ...input, id: initial.id } : input, {
      onSuccess: () => {
        if (!initial) {
          setAmount(0);
          setNote('');
          setValueTag(undefined);
          setSavedAt(Date.now());
          amountRef.current?.querySelector('input')?.focus();
        }
        onSaved(date.slice(0, 7));
      },
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Segmented
        label={t('ledger.kind_label')}
        value={kind}
        onChange={changeKind}
        options={[
          { value: 'expense', label: t('ledger.expense'), tone: 'red' },
          { value: 'income', label: t('ledger.income'), tone: 'green' },
        ]}
      />
      <div ref={amountRef}>
        <MoneyInput label={t('ledger.amount')} value={amount} onChange={setAmount} chips={CHIPS[kind]} autoFocus />
      </div>
      <div role="radiogroup" aria-label={t('ledger.category')} className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const Icon = categoryIcon(c.icon);
          const active = c.key === category;
          const label = t('category.' + c.key) || c.label;
          return (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setCategory(c.key)}
              className={cx(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors',
                active ? 'border-accent-600 bg-accent-50 text-accent-700' : 'border-line bg-white text-ink-soft hover:bg-slate-50',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {/* Ý định chi tiêu (Intentional Spending) */}
      {kind === 'expense' && (
        <div className="rounded-xl border border-line bg-slate-50/70 p-3">
          <p className="mb-2 text-xs font-semibold text-ink-soft">{t('spending.label')}</p>
          <div className="flex flex-wrap gap-1.5">
            {SPENDING_TAGS.map((tTag) => {
              const active = valueTag === tTag.tag;
              const label = t('spending.tag.' + tTag.tag) || tTag.label;
              return (
                <button
                  key={tTag.tag}
                  type="button"
                  onClick={() => setValueTag(active ? undefined : tTag.tag)}
                  className={cx(
                    'rounded-lg border px-2.5 py-1 text-xs transition-all',
                    active
                      ? 'border-primary-600 bg-primary-50 text-primary-700 font-bold shadow-sm'
                      : 'border-line bg-white text-ink-soft hover:bg-slate-100',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
        <TextInput aria-label={t('ledger.note')} placeholder={t('ledger.note')} value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} />
        <TextInput aria-label={t('ledger.date')} type="date" value={date} max={localToday()} onChange={(e) => setDate(e.target.value || localToday())} />
      </div>
      <FormAlert error={save.error ?? del.error} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={amount <= 0 || save.isPending} className="min-w-[140px]">
          {save.isPending ? t('ledger.saving') : initial ? t('ledger.save_changes') : t('ledger.save_item')}
        </Button>
        {initial && (
          <Button variant="danger" icon={Trash2} disabled={del.isPending} onClick={() => confirm(t('ledger.delete_confirm')) && del.mutate(initial.id, { onSuccess: () => onSaved(initial.occurredOn.slice(0, 7)) })}>
            {t('ledger.delete')}
          </Button>
        )}
        {savedAt && !save.isPending && (
          <span key={savedAt} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-success-600" role="status">
            <Check className="h-4 w-4" aria-hidden /> {t('ledger.saved_ai')}
          </span>
        )}
      </div>
    </form>
  );
}

