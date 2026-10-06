import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { LedgerDashboard } from '@shared/types/api';
import { formatVndFull } from '@shared/format';
import { Button, EmptyState, SectionCard } from '@/components/ui';
import { useLocale } from '@/app/locale';

const C = { income: '#27AE72', expense: '#F2545B', net: '#2F6BEA' };

/** Trục: 40.000.000 → "40Tr" (vi) / "40M". */
const axisMoney = (v: number, unit: string) => (v === 0 ? '0' : `${Math.round(v / 1e6)}${unit}`);

export function CashflowChartCard({ months, onAdd }: { months: LedgerDashboard['months']; onAdd: () => void }) {
  const { t } = useLocale();
  const rows = months.map((m) => ({ ...m, label: t('ledger.chart.month', { m: Number(m.month.slice(5, 7)) }) }));
  const has = months.some((m) => m.income || m.expense);
  const unit = t('ledger.chart.million_short');
  // Trục tròn 10 triệu, gồm cả 0 (dòng tiền âm vẫn hiện dưới trục).
  const STEP = 10_000_000;
  const lo = Math.min(0, ...months.map((m) => m.net));
  const hi = Math.max(0, ...months.flatMap((m) => [m.income, m.expense, m.net]));
  const ticks: number[] = [];
  for (let v = Math.floor(lo / STEP) * STEP; v <= Math.ceil(hi / STEP) * STEP; v += STEP) ticks.push(v);

  const legend = (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
      <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: C.income }} />{t('ledger.chart.income')}</li>
      <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: C.expense }} />{t('ledger.chart.expense')}</li>
      <li className="flex items-center gap-1.5">
        <span className="relative h-2.5 w-4"><span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2" style={{ background: C.net }} /><span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: C.net }} /></span>
        {t('ledger.chart.net')}
      </li>
    </ul>
  );

  return (
    <SectionCard title={t('ledger.chart.title')} extra={has ? legend : undefined} className="flex flex-col" bodyClassName="flex-1">
      {!has ? (
        <EmptyState compact icon={BarChart3} title={t('ledger.chart.empty')} body={t('ledger.chart.empty_body')} action={<Button size="sm" onClick={onAdd}>{t('ledger.btn.add')}</Button>} />
      ) : (
        <div className="h-[210px] sm:h-[220px] w-full min-w-0" role="img" aria-label={t('ledger.chart.title')}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 6, right: 4, bottom: 0, left: -10 }} barGap={2} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="#EEF1F5" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#E5E9F0' }} tick={{ fontSize: 11.5, fill: '#64748B' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11.5, fill: '#64748B' }} tickFormatter={(v: number) => axisMoney(v, unit)} width={42} ticks={ticks} domain={[ticks[0], ticks[ticks.length - 1]]} />
              <Tooltip
                cursor={{ fill: 'rgba(15,23,42,0.04)' }}
                formatter={(v, name) => [formatVndFull(Number(v)), t(`ledger.chart.${String(name)}`)]}
                contentStyle={{ borderRadius: 12, border: '1px solid #E5E9F0', fontSize: 12 }}
              />
              <Bar dataKey="income" fill={C.income} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
              <Bar dataKey="expense" fill={C.expense} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
              <Line dataKey="net" stroke={C.net} strokeWidth={2} dot={{ r: 3.5, fill: C.net, stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 4.5 }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}
