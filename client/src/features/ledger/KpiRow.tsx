import { ArrowRight, CalendarDays, Coins, HandCoins, Wallet } from 'lucide-react';
import type { LedgerDashboard } from '@shared/types/api';
import { formatVndFull } from '@shared/format';
import { KpiCard, ProgressBar, TONE_HEX } from '@/components/ui';
import { useLocale } from '@/app/locale';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function KpiRow({ data, onBudget, onAdd }: { data: LedgerDashboard; onBudget: () => void; onAdd: () => void }) {
  const { t } = useLocale();
  const { totals, deltas, budget, months } = data;
  const monthNo = Number(data.month.slice(5, 7));
  const maxIncome = Math.max(1, ...months.map((m) => m.income));
  const vs = t('ledger.kpi.vs_prev');
  const empty = !data.hasData;
  const emptySub = (
    <button type="button" onClick={onAdd} className="font-semibold text-accent-600 hover:text-accent-700">
      {t('ledger.kpi.empty_cta')} →
    </button>
  );

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={HandCoins}
        tone="green"
        label={t('ledger.kpi.income')}
        value={empty ? '—' : formatVndFull(totals.income)}
        valueClassName="text-[21px]"
        delta={empty ? undefined : { value: deltas.income }}
        sub={empty ? emptySub : vs}
        progress={{ value: clamp01(totals.income / maxIncome), color: '#6FCF97', label: t('ledger.kpi.income_bar') }}
      />
      <KpiCard
        icon={Wallet}
        tone="red"
        label={t('ledger.kpi.expense')}
        value={empty ? '—' : formatVndFull(totals.expense)}
        valueClassName="text-[21px]"
        delta={empty ? undefined : { value: deltas.expense, goodWhenUp: false }}
        sub={empty ? emptySub : vs}
        progress={{ value: totals.income ? clamp01(totals.expense / totals.income) : 0, color: TONE_HEX.red, label: t('ledger.kpi.expense_bar') }}
      />
      <KpiCard
        icon={Coins}
        tone="green"
        label={t('ledger.kpi.net')}
        value={empty ? '—' : <span className={totals.net < 0 ? 'text-danger-600' : undefined}>{formatVndFull(totals.net, { sign: true })}</span>}
        valueClassName="text-[21px]"
        delta={empty ? undefined : { value: deltas.net }}
        sub={empty ? emptySub : vs}
        progress={{ value: totals.income ? clamp01(totals.net / totals.income / 0.5) : 0, color: '#12805A', label: t('ledger.kpi.net_bar') }}
      />
      <section className="flex min-w-0 flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
            <CalendarDays className="h-7 w-7" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{t('ledger.kpi.budget', { m: monthNo })}</p>
            {budget.limit === null ? (
              <>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{t('ledger.kpi.budget_empty')}</p>
                <button type="button" onClick={onBudget} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-600 hover:text-accent-700">
                  {t('ledger.btn.budget')} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </>
            ) : (
              <>
                <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                  <p className="whitespace-nowrap text-[21px] font-extrabold leading-none tracking-tight text-ink tabular-nums">{formatVndFull(budget.limit)}</p>
                  <p className="whitespace-nowrap text-[13px] text-ink-soft">
                    {t('ledger.kpi.spent')} <b className={budget.pct! > 1 ? 'text-danger-600' : 'text-ink'}>{Math.round(budget.pct! * 100)}%</b>
                  </p>
                </div>
                <ProgressBar value={clamp01(budget.pct!)} color={budget.pct! > 1 ? TONE_HEX.red : budget.pct! > 0.9 ? TONE_HEX.orange : '#12805A'} label={t('ledger.kpi.spent')} className="mt-3" />
                <p className="mt-2 text-right text-[13px] text-ink-soft">
                  {budget.remaining! >= 0 ? t('ledger.kpi.remaining') : t('ledger.kpi.over')}{' '}
                  <b className={budget.remaining! >= 0 ? 'text-ink' : 'text-danger-600'}>{formatVndFull(Math.abs(budget.remaining!))}</b>
                </p>
                <button type="button" onClick={onBudget} className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-600 hover:text-accent-700">
                  {t('ledger.kpi.budget_detail')} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
