import { useState, type FormEvent } from 'react';
import { Droplet, House, Music, Phone, Plus, Receipt, ShieldCheck, Trash2, Tv, Wifi, Zap, type LucideIcon } from 'lucide-react';
import type { Bill } from '@shared/types/api';
import { TRANSACTION_CATEGORIES } from '@shared/engine/ledger';
import { formatVndFull } from '@shared/format';
import { Badge, Button, EmptyState, FormAlert, FormField, IconTile, MenuButton, Modal, MoneyInput, SectionCard, Select, TextInput, Toggle, type ExtTone } from '@/components/ui';
import { useDeleteBill, usePayBill, useSaveBill, type BillInput } from '@/lib/queries';
import { useLocale } from '@/app/locale';

const BILL_ICON: Record<string, { icon: LucideIcon; tone: ExtTone }> = {
  zap: { icon: Zap, tone: 'orange' },
  wifi: { icon: Wifi, tone: 'blue' },
  tv: { icon: Tv, tone: 'red' },
  music: { icon: Music, tone: 'green' },
  shield: { icon: ShieldCheck, tone: 'blue' },
  droplet: { icon: Droplet, tone: 'sky' },
  phone: { icon: Phone, tone: 'violet' },
  home: { icon: House, tone: 'teal' },
  receipt: { icon: Receipt, tone: 'gray' },
};

function StateBadge({ bill }: { bill: Bill }) {
  const { t } = useLocale();
  if (bill.state === 'auto') return <Badge size="sm" tone="green">{t('ledger.bills.auto')}</Badge>;
  if (bill.state === 'overdue') return <Badge size="sm" tone="red">{t('ledger.bills.overdue', { n: -bill.daysLeft })}</Badge>;
  if (bill.state === 'due_soon') return <Badge size="sm" tone="green">{t('ledger.bills.due_soon', { n: bill.daysLeft })}</Badge>;
  return <Badge size="sm" tone="gray">{t('ledger.bills.upcoming', { n: bill.daysLeft })}</Badge>;
}

export function BillsCard({ bills }: { bills: Bill[] }) {
  const { t } = useLocale();
  const pay = usePayBill();
  const del = useDeleteBill();
  const [editing, setEditing] = useState<Bill | 'new' | null>(null);

  return (
    <SectionCard title={t('ledger.bills.title')} action={{ label: t('ledger.bills.add'), onClick: () => setEditing('new') }}>
      {bills.length === 0 ? (
        <EmptyState compact icon={Receipt} title={t('ledger.bills.empty')} body={t('ledger.bills.empty_body')} />
      ) : (
        <ul className="-my-1 divide-y divide-line/70">
          {bills.slice(0, 5).map((b) => {
            const meta = BILL_ICON[b.icon] ?? BILL_ICON.receipt;
            return (
              <li key={b.id} className="flex items-center gap-2.5 py-[7px]">
                <IconTile icon={meta.icon} tone={meta.tone} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{b.name}</p>
                  <p className="mt-0.5 truncate text-[12.5px] text-ink-soft">{t('ledger.bills.schedule', { d: b.dayOfMonth })}</p>
                </div>
                <p className="w-[80px] shrink-0 text-right text-[14px] font-semibold text-ink tabular-nums">{formatVndFull(b.amount)}</p>
                <div className="hidden w-[128px] shrink-0 justify-center sm:flex [&>span]:text-[11px]">
                  <StateBadge bill={b} />
                </div>
                <MenuButton
                  label={t('ledger.more_actions')}
                  items={[
                    { label: b.paidThisMonth ? t('ledger.bills.paid') : t('ledger.bills.mark_paid'), onSelect: () => pay.mutate(b.id), disabled: b.paidThisMonth || pay.isPending },
                    { label: t('ledger.edit_title_bill'), onSelect: () => setEditing(b) },
                    { label: t('ledger.delete'), onSelect: () => confirm(t('ledger.bills.delete_confirm')) && del.mutate(b.id) },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}
      <FormAlert error={pay.error} />
      {editing && <BillModal initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </SectionCard>
  );
}

function BillModal({ initial, onClose }: { initial?: Bill; onClose: () => void }) {
  const { t } = useLocale();
  const save = useSaveBill();
  const del = useDeleteBill();
  const [v, setV] = useState<BillInput>(
    initial ? { name: initial.name, amount: initial.amount, category: initial.category, dayOfMonth: initial.dayOfMonth, autoRenew: initial.autoRenew, icon: initial.icon } : { name: '', amount: 0, category: 'housing', dayOfMonth: 10, autoRenew: false, icon: 'receipt' },
  );
  const set = <K extends keyof BillInput>(k: K, val: BillInput[K]) => setV((o) => ({ ...o, [k]: val }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(initial ? { ...v, id: initial.id } : v, { onSuccess: onClose });
  };
  return (
    <Modal title={initial ? t('ledger.edit_title_bill') : t('ledger.bills.add')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <FormField label={t('ledger.bills.name')}>{(id) => <TextInput id={id} value={v.name} maxLength={60} onChange={(e) => set('name', e.target.value)} required />}</FormField>
        <FormField label={t('ledger.amount')}>{(id) => <MoneyInput id={id} value={v.amount} onChange={(a) => set('amount', a)} />}</FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t('ledger.bills.day')}>{(id) => <TextInput id={id} type="number" min={1} max={31} value={v.dayOfMonth} onChange={(e) => set('dayOfMonth', Math.min(31, Math.max(1, Number(e.target.value) || 1)))} />}</FormField>
          <FormField label={t('ledger.category')}>
            {() => (
              <Select
                label={t('ledger.category')}
                value={v.category}
                onChange={(c) => set('category', c)}
                options={TRANSACTION_CATEGORIES.filter((c) => c.kind === 'expense').map((c) => ({ value: c.key, label: t(`category.${c.key}`) }))}
              />
            )}
          </FormField>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('ledger.bills.icon')}>
          {Object.entries(BILL_ICON).map(([k, m]) => (
            <button key={k} type="button" role="radio" aria-checked={v.icon === k} aria-label={k} onClick={() => set('icon', k)} className={`rounded-xl p-0.5 ring-2 ${v.icon === k ? 'ring-accent-600' : 'ring-transparent'}`}>
              <IconTile icon={m.icon} tone={m.tone} size="sm" />
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between gap-3 text-sm text-ink">
          {t('ledger.bills.auto_label')}
          <Toggle checked={v.autoRenew} onChange={(x) => set('autoRenew', x)} label={t('ledger.bills.auto_label')} />
        </label>
        <FormAlert error={save.error ?? del.error} />
        <div className="flex gap-2">
          <Button type="submit" icon={initial ? undefined : Plus} disabled={!v.name.trim() || v.amount <= 0 || save.isPending}>
            {save.isPending ? t('ledger.saving') : t('ledger.save_changes')}
          </Button>
          {initial && (
            <Button variant="danger" icon={Trash2} onClick={() => confirm(t('ledger.bills.delete_confirm')) && del.mutate(initial.id, { onSuccess: onClose })}>
              {t('ledger.delete')}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
