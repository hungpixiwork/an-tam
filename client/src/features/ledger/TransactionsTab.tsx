// Tab "Tất cả giao dịch": xem theo tháng, sửa / xóa từng khoản (giữ từ sổ thu chi cũ).

import { useState } from 'react';
import { Bot, ChevronLeft, ChevronRight, NotebookPen, Pencil } from 'lucide-react';
import type { LedgerData, ProfileUsage } from '@shared/types/api';
import type { SpendingTag, Transaction } from '@shared/types/domain';
import { categoryOf } from '@shared/engine/ledger';
import { addMonths } from '@shared/engine/month';
import { SPENDING_TAGS, spendingSummary } from '@shared/engine/spending';
import { formatCurrency, formatMonthLocale } from '@shared/format';
import { useLocale } from '@/app/locale';
import { Button, Card, CardTitle, EmptyState, ErrorState, IconTile, PageSkeleton, ProgressBar, cx } from '@/components/ui';
import { useTransactions } from '@/lib/queries';
import { categoryIcon } from './categoryIcons';
import { AddTransactionModal, localToday } from './TransactionForm';

const TAG_STYLES: Record<SpendingTag, { bg: string; text: string }> = {
  essential: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  useful: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700' },
  joy: { bg: 'bg-pink-50 border-pink-200', text: 'text-pink-700' },
  growth: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  regret: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
};

export default function TransactionsTab() {
  const [month, setMonth] = useState(() => localToday().slice(0, 7));
  const { data, error, refetch, isPending } = useTransactions(month);
  const [editing, setEditing] = useState<Transaction | null>(null);

  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
      <TransactionList data={data} onEdit={setEditing} />
      <MonthCard data={data} month={month} onMonth={setMonth} />
      {editing && <AddTransactionModal initial={editing} onClose={() => setEditing(null)} />}
    </div>
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
