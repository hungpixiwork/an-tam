import { PieChart } from 'lucide-react';
import type { LedgerDashboard } from '@shared/types/api';
import { formatCompactVND, formatVndFull } from '@shared/format';
import { EmptyState, SectionCard } from '@/components/ui';
import { DonutChart } from '@/components/ui/DonutChart';
import { useLocale } from '@/app/locale';
import { categoryColor } from './categoryIcons';

export function CategoryDonutCard({ data, onAll }: { data: LedgerDashboard; onAll: () => void }) {
  const { t } = useLocale();
  const monthNo = Number(data.month.slice(5, 7));
  const cats = data.categories;

  return (
    <SectionCard title={t('ledger.donut.title', { m: monthNo })} action={{ label: t('ledger.see_detail'), onClick: onAll }}>
      {cats.length === 0 ? (
        <EmptyState compact icon={PieChart} title={t('ledger.donut.empty')} body={t('ledger.donut.empty_body')} />
      ) : (
        <div className="grid min-w-0 grid-cols-1 items-center gap-3.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-4">
          <div className="flex justify-center">
            <DonutChart data={cats.map((c) => ({ key: c.key, value: c.amount, color: categoryColor(c.key) }))} size={152} thickness={22}>
              <p
                className="max-w-[104px] truncate text-center text-[15px] sm:text-[16px] font-extrabold leading-tight tracking-tight text-ink tabular-nums"
                title={formatVndFull(data.totals.expense)}
              >
                {formatCompactVND(data.totals.expense)}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-ink-soft">{t('ledger.donut.total')}</p>
            </DonutChart>
          </div>
          <table className="w-full min-w-0 flex-1 table-fixed text-[12px] sm:text-[12.5px]">
            <caption className="sr-only">{t('ledger.donut.title', { m: monthNo })}</caption>
            <tbody>
              {cats.map((c) => (
                <tr key={c.key} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="w-auto py-1 pr-1.5 min-w-0">
                    <span className="flex items-center gap-1.5 min-w-0 text-ink-soft">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoryColor(c.key) }} aria-hidden />
                      <span className="truncate min-w-0 font-medium text-ink" title={t(`category.${c.key}`)}>
                        {t(`category.${c.key}`)}
                      </span>
                    </span>
                  </td>
                  <td className="w-[42px] shrink-0 py-1 pr-1.5 text-right font-semibold text-ink tabular-nums">
                    {Math.round(c.pct * 100)}%
                  </td>
                  <td className="w-[84px] shrink-0 whitespace-nowrap py-1 text-right text-ink-soft tabular-nums" title={formatVndFull(c.amount)}>
                    {formatVndFull(c.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
