import { useState, type FormEvent } from 'react';
import { formatVndFull } from '@shared/format';
import { Button, FormAlert, FormField, Modal, MoneyInput, ProgressBar, TONE_HEX } from '@/components/ui';
import { useLedgerDashboard, useSaveBudget } from '@/lib/queries';
import { useLocale } from '@/app/locale';

/** "Đặt ngân sách tháng": PUT /api/budgets/:month → KPI "Ngân sách tháng" cập nhật. */
export function BudgetModal({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const { data } = useLedgerDashboard();
  const save = useSaveBudget();
  const budget = data?.budget;
  const [limit, setLimit] = useState(budget?.limit ?? 0);
  const avg = data ? Math.round(data.months.slice(0, -1).reduce((s, m) => s + m.expense, 0) / Math.max(1, data.months.slice(0, -1).filter((m) => m.expense).length) / 100_000) * 100_000 : 0;
  const month = data?.month ?? new Date().toLocaleDateString('sv-SE').slice(0, 7);
  const spent = budget?.spent ?? 0;
  const pct = limit > 0 ? spent / limit : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate({ month, limit }, { onSuccess: onClose });
  };

  return (
    <Modal title={t('ledger.budget.title', { m: Number(month.slice(5, 7)) })} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-[13px] leading-relaxed text-ink-soft">{t('ledger.budget.intro')}</p>
        <FormField label={t('ledger.budget.limit')}>
          {(id) => <MoneyInput id={id} value={limit} onChange={setLimit} chips={avg > 0 ? [avg, Math.round((avg * 0.9) / 100_000) * 100_000] : undefined} autoFocus />}
        </FormField>
        {avg > 0 && <p className="text-[12.5px] text-ink-mute">{t('ledger.budget.avg_hint', { amount: formatVndFull(avg) })}</p>}
        {limit > 0 && (
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="mb-2 flex justify-between text-[13px]">
              <span className="text-ink-soft">{t('ledger.budget.spent_so_far', { amount: formatVndFull(spent) })}</span>
              <b className="text-ink">{Math.round(pct * 100)}%</b>
            </div>
            <ProgressBar value={Math.min(1, pct)} color={pct > 1 ? TONE_HEX.red : '#12805A'} label={t('ledger.kpi.spent')} />
            <p className="mt-2 text-[12.5px] text-ink-soft">{limit - spent >= 0 ? t('ledger.budget.left', { amount: formatVndFull(limit - spent) }) : t('ledger.budget.over', { amount: formatVndFull(spent - limit) })}</p>
          </div>
        )}
        {budget?.inherited && <p className="text-[12.5px] text-ink-mute">{t('ledger.budget.inherited')}</p>}
        <FormAlert error={save.error} />
        <Button type="submit" disabled={limit <= 0 || save.isPending}>{save.isPending ? t('ledger.saving') : t('ledger.budget.save')}</Button>
      </form>
    </Modal>
  );
}
