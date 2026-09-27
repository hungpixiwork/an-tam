import { PieChart } from 'lucide-react';
import type { LedgerDashboard } from '@shared/types/api';
import { formatVndFull } from '@shared/format';
import { DonutChart, EmptyState, SectionCard } from '@/components/ui';
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
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <DonutChart data={cats.map((c) => ({ key: c.key, value: c.amount, color: categoryColor(c.key) }))} size={164} thickness={32}>
            <p className="text-[15px] font-extrabold text-ink tabular-nums">{formatVndFull(data.totals.expense)}</p>
            <p className="text-[12px] text-ink-soft">{t('ledger.donut.total')}</p>
          </DonutChart>
          <table className="w-full min-w-0 flex-1 text-[12.5px]">
            <caption className="sr-only">{t('ledger.donut.title', { m: monthNo })}</caption>
            <tbody>
              {cats.map((c) => (
                <tr key={c.key}>
                  <td className="py-[5px] pr-2">
                    <span className="flex items-center gap-2 text-ink-soft">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoryColor(c.key) }} aria-hidden />
                      <span className="truncate">{t(`category.${c.key}`)}</span>
                    </span>
                  </td>
                  <td className="py-[5px] pr-2 text-right font-semibold text-ink tabular-nums">{Math.round(c.pct * 100)}%</td>
                  <td className="whitespace-nowrap py-[5px] text-right text-ink-soft tabular-nums">{formatVndFull(c.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
