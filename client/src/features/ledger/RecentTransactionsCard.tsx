import { useState } from 'react';
import { NotebookPen } from 'lucide-react';
import type { Transaction } from '@shared/types/domain';
import { categoryOf } from '@shared/engine/ledger';
import { formatVndFull } from '@shared/format';
import { Badge, Button, EmptyState, IconTile, MenuButton, SectionCard, cx } from '@/components/ui';
import { useDeleteTransaction } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { categoryIcon, categoryTone } from './categoryIcons';
import { AddTransactionModal } from './TransactionForm';

const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export function RecentTransactionsCard({ items, today, onAll, onAdd }: { items: Transaction[]; today: string; onAll: () => void; onAdd: () => void }) {
  const { t } = useLocale();
  const del = useDeleteTransaction();
  const [editing, setEditing] = useState<Transaction | null>(null);

  const when = (d: string) => {
    const diff = dayDiff(d, today);
    if (diff === 0) return t('ledger.today');
    if (diff === 1) return t('ledger.yesterday');
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  return (
    <SectionCard title={t('ledger.recent.title')} action={items.length ? { label: t('ledger.see_all'), onClick: onAll } : undefined}>
      {items.length === 0 ? (
        <EmptyState compact icon={NotebookPen} tone="teal" title={t('ledger.recent.empty')} body={t('ledger.recent.empty_body')} action={<Button size="sm" onClick={onAdd}>{t('ledger.btn.add')}</Button>} />
      ) : (
        <ul className="-my-1 divide-y divide-line/70">
          {items.map((x) => {
            const cat = categoryOf(x.category);
            const tone = categoryTone(x.category, x.kind);
            const catLabel = x.kind === 'income' ? t('ledger.income_badge') : t(`category.${x.category}`);
            return (
              <li key={x.id} className="flex items-center gap-2.5 py-[7px]">
                <IconTile icon={categoryIcon(cat?.icon ?? '')} tone={tone} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{x.note || t(`category.${x.category}`)}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft">{when(x.occurredOn)}</p>
                </div>
                <div className="hidden shrink-0 sm:block">
                  <Badge size="sm" tone={tone}>{catLabel}</Badge>
                </div>
                <p className={cx('w-[104px] shrink-0 whitespace-nowrap text-right text-[14px] font-bold tabular-nums', x.kind === 'income' ? 'text-success-600' : 'text-danger-600')}>
                  {x.kind === 'income' ? '+ ' : '- '}
                  {formatVndFull(x.amount)}
                </p>
                <MenuButton
                  label={t('ledger.more_actions')}
                  items={[
                    { label: t('ledger.edit_title'), onSelect: () => setEditing(x) },
                    { label: t('ledger.delete'), onSelect: () => confirm(t('ledger.delete_confirm')) && del.mutate(x.id), disabled: del.isPending },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}
      {editing && <AddTransactionModal initial={editing} onClose={() => setEditing(null)} />}
    </SectionCard>
  );
}
