import { ArrowDown, ArrowUp, Copy, House, ShieldCheck, Wallet } from 'lucide-react';
import type { PortfolioRisk } from '@shared/types/api';
import { formatVndFull } from '@shared/format';
import { Badge, KpiCard, type ExtTone } from '@/components/ui';
import { useLocale } from '@/app/locale';

const pctOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function PctBadge({ value, tone, icon }: { value: string; tone: ExtTone; icon?: typeof ArrowUp }) {
  return (
    <Badge size="sm" tone={tone} icon={icon} className="text-[13px]">
      {value}
    </Badge>
  );
}

/** H2 — 4 chỉ số: tài sản ròng, đầu tư, tài sản khác, nợ (tỷ lệ trên tổng tài sản). */
export function KpiRow({ nw }: { nw: PortfolioRisk['netWorth'] }) {
  const { t } = useLocale();
  const delta = nw.deltaPct === null ? null : Math.round(nw.deltaPct * 100);
  const value = (v: number) => formatVndFull(v);
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={Wallet}
        tone="blue"
        label={t('portfolio.kpi.net')}
        value={value(nw.net)}
        className="relative pr-5"
        children={<div className="absolute right-5 top-5">{delta !== null && <PctBadge value={`${Math.abs(delta)}%`} tone={delta >= 0 ? 'green' : 'red'} icon={delta >= 0 ? ArrowUp : ArrowDown} />}</div>}
        footnote={delta !== null ? t('portfolio.kpi.net_note', { n: nw.compareMonths }) : t('portfolio.kpi.net_nohistory')}
      />
      <KpiCard
        icon={Copy}
        tone="green"
        label={t('portfolio.kpi.invested')}
        value={value(nw.invested)}
        className="relative pr-5"
        children={<div className="absolute right-5 top-5">{<PctBadge value={`${pctOf(nw.invested, nw.totalAssets)}%`} tone="green" />}</div>}
        footnote={t('portfolio.kpi.invested_note')}
      />
      <KpiCard
        icon={House}
        tone="sky"
        label={t('portfolio.kpi.other')}
        value={value(nw.other)}
        className="relative pr-5"
        children={<div className="absolute right-5 top-5">{<PctBadge value={`${pctOf(nw.other, nw.totalAssets)}%`} tone="sky" />}</div>}
        footnote={t('portfolio.kpi.other_note')}
      />
      <KpiCard
        icon={ShieldCheck}
        tone="violet"
        label={t('portfolio.kpi.debt')}
        value={value(nw.debt)}
        className="relative pr-5"
        children={<div className="absolute right-5 top-5">{<PctBadge value={`${pctOf(nw.debt, nw.totalAssets)}%`} tone="violet" />}</div>}
        footnote={t('portfolio.kpi.debt_note')}
      />
    </div>
  );
}
