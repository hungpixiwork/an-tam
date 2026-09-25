import { useRef, useState, type FormEvent } from 'react';
import { Bot, Check, ChevronLeft, ChevronRight, NotebookPen, Pencil, Trash2 } from 'lucide-react';
import type { LedgerData, ProfileUsage } from '@shared/types/api';
import type { Transaction, TransactionKind } from '@shared/types/domain';
import { TRANSACTION_CATEGORIES, categoryOf } from '@shared/engine/ledger';
import { addMonths } from '@shared/engine/month';
import { formatMonth, formatVnd } from '@shared/format';
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

/** Ngày hôm nay theo giờ máy người dùng, dạng 'YYYY-MM-DD'. */
const localToday = () => new Date().toLocaleDateString('sv-SE');

export default function LedgerPage() {
  const [month, setMonth] = useState(() => localToday().slice(0, 7));
  const { data, error, refetch, isPending } = useTransactions(month);
  const [editing, setEditing] = useState<Transaction | null>(null);

  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1fr]">
        <Card>
          <CardTitle icon={NotebookPen} tone="teal" title="Ghi nhanh một khoản" subtitle="Nhập số tiền, chọn danh mục, nhấn Enter. Form giữ nguyên để bạn ghi tiếp." />
          <TransactionForm onSaved={(m) => setMonth(m)} />
        </Card>
        <MonthCard data={data} month={month} onMonth={setMonth} />
      </div>

      <TransactionList data={data} onEdit={setEditing} />

      {editing && (
        <Modal title="Sửa giao dịch" onClose={() => setEditing(null)}>
          <TransactionForm initial={editing} onSaved={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}

/* ───────── Form thêm / sửa ───────── */

function TransactionForm({ initial, onSaved }: { initial?: Transaction; onSaved: (month: string) => void }) {
  const [kind, setKind] = useState<TransactionKind>(initial?.kind ?? 'expense');
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [category, setCategory] = useState(initial?.category ?? DEFAULT_CATEGORY.expense);
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
    const input: TransactionInput = { kind, amount, category, note: note.trim(), occurredOn: date };
    save.mutate(initial ? { ...input, id: initial.id } : input, {
      onSuccess: () => {
        if (!initial) {
          // Giữ loại, danh mục, ngày — chỉ xóa số tiền và ghi chú để nhập khoản tiếp theo
          setAmount(0);
          setNote('');
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
        label="Loại giao dịch"
        value={kind}
        onChange={changeKind}
        options={[
          { value: 'expense', label: 'Khoản chi', tone: 'red' },
          { value: 'income', label: 'Khoản thu', tone: 'green' },
        ]}
      />
      <div ref={amountRef}>
        <MoneyInput label="Số tiền" value={amount} onChange={setAmount} chips={CHIPS[kind]} autoFocus />
      </div>
      <div role="radiogroup" aria-label="Danh mục" className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const Icon = categoryIcon(c.icon);
          const active = c.key === category;
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
              {c.label}
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
        <TextInput aria-label="Ghi chú" placeholder="Ghi chú (không bắt buộc)" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} />
        <TextInput aria-label="Ngày" type="date" value={date} max={localToday()} onChange={(e) => setDate(e.target.value || localToday())} />
      </div>
      <FormAlert error={save.error ?? del.error} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={amount <= 0 || save.isPending} className="min-w-[140px]">
          {save.isPending ? 'Đang lưu…' : initial ? 'Lưu thay đổi' : 'Lưu khoản này'}
        </Button>
        {initial && (
          <Button variant="danger" icon={Trash2} disabled={del.isPending} onClick={() => confirm('Xóa giao dịch này?') && del.mutate(initial.id, { onSuccess: () => onSaved(initial.occurredOn.slice(0, 7)) })}>
            Xóa
          </Button>
        )}
        {savedAt && !save.isPending && (
          <span key={savedAt} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-success-600" role="status">
            <Check className="h-4 w-4" aria-hidden /> Đã lưu · AI đã cập nhật phân tích
          </span>
        )}
      </div>
    </form>
  );
}

/* ───────── Tổng quan tháng ───────── */

const SOURCE_TEXT: Record<ProfileUsage['incomeSource'], string> = {
  ledger: 'trung bình các tháng đã ghi sổ',
  baseline: 'số bạn nhập ban đầu',
  current_month: 'số ghi sổ tháng này',
  none: 'chưa có dữ liệu',
};

function MonthCard({ data, month, onMonth }: { data: LedgerData; month: string; onMonth: (m: string) => void }) {
  const isCurrent = month >= localToday().slice(0, 7);
  const expenses = data.byCategory.filter((c) => c.kind === 'expense');
  const maxMonth = Math.max(1, ...data.months.flatMap((m) => [m.income, m.expense]));

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button variant="white" size="sm" aria-label="Tháng trước" onClick={() => onMonth(addMonths(month, -1))}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <h2 className="text-lg font-bold text-ink">{formatMonth(month)}</h2>
        <Button variant="white" size="sm" aria-label="Tháng sau" disabled={isCurrent} onClick={() => onMonth(addMonths(month, 1))}>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Thu" value={data.totals.income} className="text-success-600" />
        <Stat label="Chi" value={data.totals.expense} className="text-danger-600" />
        <Stat label="Còn lại" value={data.totals.net} className={data.totals.net >= 0 ? 'text-ink' : 'text-danger-600'} sign />
      </div>

      {expenses.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <p className="text-sm font-bold text-ink">Chi theo danh mục</p>
          {expenses.slice(0, 5).map((c) => (
            <div key={c.key}>
              <div className="mb-1 flex justify-between text-[13px]">
                <span className="text-ink">{c.label}</span>
                <span className="text-ink-soft">{formatVnd(c.amount)}</span>
              </div>
              <ProgressBar value={c.pct} color="#EF4444" label={`${c.label} ${Math.round(c.pct * 100)}%`} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-sm font-bold text-ink">6 tháng gần nhất</p>
        <ul className="space-y-1.5">
          {data.months.map((m) => (
            <li key={m.month} className="grid grid-cols-[64px_1fr] items-center gap-2 text-xs">
              <span className={cx('text-ink-soft', m.month === month && 'font-bold text-ink')}>{formatMonth(m.month).replace('Tháng ', 'T')}</span>
              <span className="space-y-0.5">
                <span className="block h-1.5 rounded-full bg-success-500" style={{ width: `${(m.income / maxMonth) * 100}%` }} title={`Thu ${formatVnd(m.income)}`} />
                <span className="block h-1.5 rounded-full bg-danger-500" style={{ width: `${(m.expense / maxMonth) * 100}%` }} title={`Chi ${formatVnd(m.expense)}`} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex gap-2.5 rounded-xl bg-accent-50 p-3 text-[13px] leading-relaxed text-ink">
        <Bot className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
        <p>
          AI đang tính mức an tâm với thu nhập <b>{formatVnd(data.used.income)}</b> ({SOURCE_TEXT[data.used.incomeSource]}) và chi tiêu{' '}
          <b>{formatVnd(data.used.expense)}</b> ({SOURCE_TEXT[data.used.expenseSource]}).
          {data.used.ledgerMonths === 0 && ' Khi một tháng ghi sổ khép lại, AI sẽ chuyển sang dùng số thực tế.'}
        </p>
      </div>
    </Card>
  );
}

function Stat({ label, value, className, sign }: { label: string; value: number; className?: string; sign?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className={cx('mt-1 truncate text-base font-bold sm:text-lg', className)}>{formatVnd(value, { sign })}</p>
    </div>
  );
}

/* ───────── Danh sách ───────── */

const dayLabel = (date: string) => {
  const [y, m, d] = date.split('-');
  return date === localToday() ? 'Hôm nay' : `${Number(d)}/${Number(m)}/${y}`;
};

function TransactionList({ data, onEdit }: { data: LedgerData; onEdit: (t: Transaction) => void }) {
  if (data.items.length === 0) {
    return <EmptyState icon={NotebookPen} tone="teal" title={`Chưa có giao dịch nào trong ${formatMonth(data.month).toLowerCase()}`} body="Ghi khoản thu chi đầu tiên ở form bên trên. Mỗi khoản bạn ghi, AI sẽ tính lại dòng tiền và mức an tâm." />;
  }
  const days = [...new Set(data.items.map((t) => t.occurredOn))];
  return (
    <Card>
      <CardTitle title="Giao dịch trong tháng" subtitle={`${data.items.length} khoản`} />
      <div className="space-y-4">
        {days.map((day) => (
          <section key={day}>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-mute">{dayLabel(day)}</h3>
            <ul className="divide-y divide-line">
              {data.items
                .filter((t) => t.occurredOn === day)
                .map((t) => {
                  const cat = categoryOf(t.category);
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-2.5">
                      <IconTile icon={categoryIcon(cat?.icon ?? '')} tone={t.kind === 'income' ? 'green' : 'red'} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{cat?.label ?? t.category}</p>
                        {t.note && <p className="truncate text-xs text-ink-soft">{t.note}</p>}
                      </div>
                      <span className={cx('whitespace-nowrap text-sm font-bold', t.kind === 'income' ? 'text-success-600' : 'text-ink')}>
                        {t.kind === 'income' ? '+' : '−'}
                        {formatVnd(t.amount)}
                      </span>
                      <button type="button" onClick={() => onEdit(t)} className="rounded-lg p-2 text-ink-mute hover:bg-slate-100 hover:text-ink" aria-label={`Sửa ${cat?.label ?? ''} ${formatVnd(t.amount)}`}>
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
