import { useRef, useState, type FormEvent } from 'react';
import { Bot, Check, ChevronLeft, ChevronRight, NotebookPen, Pencil, Trash2 } from 'lucide-react';
import type { LedgerData, ProfileUsage } from '@shared/types/api';
import type { SpendingTag, Transaction, TransactionKind } from '@shared/types/domain';
import { TRANSACTION_CATEGORIES, categoryOf } from '@shared/engine/ledger';
import { addMonths } from '@shared/engine/month';
import { SPENDING_TAGS, spendingSummary } from '@shared/engine/spending';
import { formatCurrency, formatMonthLocale } from '@shared/format';
import { useLocale } from '@/app/locale';
import { Button, Card, CardTitle, EmptyState, ErrorState, FormAlert, IconTile, Modal, MoneyInput, PageSkeleton, ProgressBar, Segmented, TextInput, cx } from '@/components/ui';
import { useDeleteTransaction, useSaveTransaction, useTransactions, type TransactionInput } from '@/lib/queries';
import { categoryIcon } from './categoryIcons';

const K = 1_000;
const M = 1_000_000;
const CHIPS: Record<TransactionKind, number[]> = {
  expense: [50 * K, 100 * K, 200 * K, 500 * K, 1 * M],
  income: [5 * M, 10 * M, 20 * M, 30 * M],
};
const DEFAULT_CATEGORY: Record<TransactionKind, string> = { expense: 'food', income: 'salary' };

const TAG_STYLES: Record<SpendingTag, { bg: string; text: string }> = {
  essential: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  useful: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700' },
  joy: { bg: 'bg-pink-50 border-pink-200', text: 'text-pink-700' },
  growth: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  regret: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
};

/** Ngày hôm nay theo giờ máy người dùng, dạng 'YYYY-MM-DD'. */
const localToday = () => new Date().toLocaleDateString('sv-SE');

export default function LedgerPage() {
  const { t } = useLocale();
  const [month, setMonth] = useState(() => localToday().slice(0, 7));
  const { data, error, refetch, isPending } = useTransactions(month);
  const [editing, setEditing] = useState<Transaction | null>(null);

  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1fr]">
        <Card>
          <CardTitle icon={NotebookPen} tone="teal" title={t('ledger.quick_title')} subtitle={t('ledger.quick_subtitle')} />
          <TransactionForm onSaved={(m) => setMonth(m)} />
        </Card>
        <MonthCard data={data} month={month} onMonth={setMonth} />
      </div>

      <TransactionList data={data} onEdit={setEditing} />

      {editing && (
        <Modal title={t('ledger.edit_title')} onClose={() => setEditing(null)}>
          <TransactionForm initial={editing} onSaved={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}

/* ───────── Form thêm / sửa ───────── */

function TransactionForm({ initial, onSaved }: { initial?: Transaction; onSaved: (month: string) => void }) {
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

/* ───────── Tổng quan tháng ───────── */

function MonthCard({ data, month, onMonth }: { data: LedgerData; month: string; onMonth: (m: string) => void }) {
  const { t, locale, currency } = useLocale();
  const isCurrent = month >= localToday().slice(0, 7);
  const expenses = data.byCategory.filter((c) => c.kind === 'expense');
  const maxMonth = Math.max(1, ...data.months.flatMap((m) => [m.income, m.expense]));
  const spending = spendingSummary(data.items);

  const getSourceText = (src: ProfileUsage['incomeSource']) => {
    switch (src) {
      case 'ledger': return t('ledger.source_ledger');
      case 'baseline': return t('ledger.source_baseline');
      case 'current_month': return t('ledger.source_current');
      default: return t('ledger.source_none');
    }
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button variant="white" size="sm" aria-label={t('ledger.prev_month')} onClick={() => onMonth(addMonths(month, -1))}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <h2 className="text-lg font-bold text-ink">{formatMonthLocale(month, locale)}</h2>
        <Button variant="white" size="sm" aria-label={t('ledger.next_month')} disabled={isCurrent} onClick={() => onMonth(addMonths(month, 1))}>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={t('ledger.stat_income')} value={data.totals.income} currency={currency} className="text-success-600" />
        <Stat label={t('ledger.stat_expense')} value={data.totals.expense} currency={currency} className="text-danger-600" />
        <Stat label={t('ledger.stat_net')} value={data.totals.net} currency={currency} className={data.totals.net >= 0 ? 'text-ink' : 'text-danger-600'} sign />
      </div>

      {/* Phân tích ý định chi tiêu nếu đã có tag */}
      {spending.tagged > 0 && (
        <div className="mt-5 rounded-xl border border-line bg-slate-50/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ink">{t('spending.intent_title')}</span>
            <span className="text-ink-soft">{t('spending.tagged_ratio', { tagged: spending.tagged, total: spending.tagged + spending.untagged })}</span>
          </div>
          {spending.insight && (
            <p className="rounded-lg bg-primary-50 p-2 text-xs font-semibold text-primary-800">
              💡 {spending.insight}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {spending.byTag.filter((b) => b.tag !== 'untagged' && b.amount > 0).map((b) => {
              const tagLabel = t('spending.tag.' + b.tag) || b.label;
              return (
                <span key={b.tag} className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs text-ink">
                  <span>{tagLabel}:</span>
                  <span className="font-bold">{formatCurrency(b.amount, currency)}</span>
                  <span className="text-ink-soft">({Math.round(b.pct * 100)}%)</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {expenses.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <p className="text-sm font-bold text-ink">{t('ledger.by_category')}</p>
          {expenses.slice(0, 5).map((c) => {
            const catLabel = t('category.' + c.key) || c.label;
            return (
              <div key={c.key}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="text-ink">{catLabel}</span>
                  <span className="text-ink-soft">{formatCurrency(c.amount, currency)}</span>
                </div>
                <ProgressBar value={c.pct} color="#EF4444" label={`${catLabel} ${Math.round(c.pct * 100)}%`} />
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-sm font-bold text-ink">{t('ledger.last_6_months')}</p>
        <ul className="space-y-1.5">
          {data.months.map((m) => (
            <li key={m.month} className="grid grid-cols-[72px_1fr] items-center gap-2 text-xs">
              <span className={cx('text-ink-soft truncate', m.month === month && 'font-bold text-ink')}>{formatMonthLocale(m.month, locale)}</span>
              <span className="space-y-0.5">
                <span className="block h-1.5 rounded-full bg-success-500" style={{ width: `${(m.income / maxMonth) * 100}%` }} title={`Thu ${formatCurrency(m.income, currency)}`} />
                <span className="block h-1.5 rounded-full bg-danger-500" style={{ width: `${(m.expense / maxMonth) * 100}%` }} title={`Chi ${formatCurrency(m.expense, currency)}`} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex gap-2.5 rounded-xl bg-accent-50 p-3 text-[13px] leading-relaxed text-ink">
        <Bot className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
        <p>
          {t('ledger.ai_used_notice', {
            income: formatCurrency(data.used.income, currency),
            srcInc: getSourceText(data.used.incomeSource),
            expense: formatCurrency(data.used.expense, currency),
            srcExp: getSourceText(data.used.expenseSource),
          })}
          {data.used.ledgerMonths === 0 && t('ledger.month_close_hint')}
        </p>
      </div>
    </Card>
  );
}

function Stat({ label, value, className, sign, currency }: { label: string; value: number; className?: string; sign?: boolean; currency: any }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className={cx('mt-1 truncate text-base font-bold sm:text-lg', className)}>{formatCurrency(value, currency, { sign })}</p>
    </div>
  );
}

/* ───────── Danh sách ───────── */

function TransactionList({ data, onEdit }: { data: LedgerData; onEdit: (t: Transaction) => void }) {
  const { t, locale, currency } = useLocale();

  const dayLabel = (date: string) => {
    const [y, m, d] = date.split('-');
    return date === localToday() ? t('ledger.today') : `${Number(d)}/${Number(m)}/${y}`;
  };

  if (data.items.length === 0) {
    return <EmptyState icon={NotebookPen} tone="teal" title={t('ledger.empty_title', { month: formatMonthLocale(data.month, locale).toLowerCase() })} body={t('ledger.empty_body')} />;
  }
  const days = [...new Set(data.items.map((t) => t.occurredOn))];
  return (
    <Card>
      <CardTitle title={t('ledger.transactions_in_month')} subtitle={t('ledger.items_count', { count: data.items.length })} />
      <div className="space-y-4">
        {days.map((day) => (
          <section key={day}>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-mute">{dayLabel(day)}</h3>
            <ul className="divide-y divide-line">
              {data.items
                .filter((item) => item.occurredOn === day)
                .map((item) => {
                  const cat = categoryOf(item.category);
                  const catLabel = t('category.' + item.category) || cat?.label || item.category;
                  const tagInfo = item.valueTag ? SPENDING_TAGS.find((x) => x.tag === item.valueTag) : null;
                  const tagLabel = item.valueTag ? (t('spending.tag.' + item.valueTag) || tagInfo?.label) : null;
                  return (
                    <li key={item.id} className="flex items-center gap-3 py-2.5">
                      <IconTile icon={categoryIcon(cat?.icon ?? '')} tone={item.kind === 'income' ? 'green' : 'red'} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-ink">{catLabel}</p>
                          {item.valueTag && tagInfo && (
                            <span className={cx('rounded-md border px-1.5 py-0.5 text-[11px] font-semibold', TAG_STYLES[item.valueTag]?.bg, TAG_STYLES[item.valueTag]?.text)}>
                              {tagLabel}
                            </span>
                          )}
                        </div>
                        {item.note && <p className="truncate text-xs text-ink-soft">{item.note}</p>}
                      </div>
                      <span className={cx('whitespace-nowrap text-sm font-bold', item.kind === 'income' ? 'text-success-600' : 'text-ink')}>
                        {item.kind === 'income' ? '+' : '−'}
                        {formatCurrency(item.amount, currency)}
                      </span>
                      <button type="button" onClick={() => onEdit(item)} className="rounded-lg p-2 text-ink-mute hover:bg-slate-100 hover:text-ink" aria-label={`Sửa ${catLabel} ${formatCurrency(item.amount, currency)}`}>
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
}
