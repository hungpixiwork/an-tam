import type { ReactNode } from 'react';
import { ArrowUp, CalendarDays, CircleDollarSign, ShieldCheck, Target, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { OverviewData } from '@shared/types/api';
import { formatVndFull } from '@shared/format';
import { Badge, KpiCard, MiniBars, TONE_HEX, type ExtTone } from '@/components/ui';
import { useLocale } from '@/app/locale';

const LEVEL_TONE: Record<OverviewData['peace']['level'], ExtTone> = { stable: 'green', watch: 'orange', action: 'red' };

/** Số thập phân kiểu Việt ("4,2"). */
const decimal = (v: number, locale: string) => (locale === 'vi' ? String(v).replace('.', ',') : String(v));

function Foot({ icon: Icon, children, tone = 'text-ink-soft' }: { icon?: LucideIcon; children: ReactNode; tone?: string }) {
  return (
    <p className={`flex items-start gap-1.5 ${tone}`}>
      {Icon && <Icon className="mt-[3px] h-3.5 w-3.5 shrink-0 text-success-600" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}

function EmptyFoot({ text, to, cta }: { text: string; to: string; cta: string }) {
  return (
    <p>
      {text}{' '}
      <Link to={to} className="font-semibold text-accent-600 hover:text-accent-700">
        {cta} →
      </Link>
    </p>
  );
}

export function KpiRow({ data }: { data: OverviewData }) {
  const { t, locale } = useLocale();
  const { peace, peaceDelta, safeMonths, cashflow6m: cf, savingsRateVsPeers: sv } = data;

  // 1. Điểm An Tâm
  const peaceFoot = !data.ready ? (
    <EmptyFoot text={t('overview.kpi.peace_empty')} to="/cai-dat#tai-chinh" cta={t('overview.add_data')} />
  ) : peaceDelta === null ? (
    <Foot>{t('overview.kpi.peace_nohistory')}</Foot>
  ) : peaceDelta > 0 ? (
    <Foot icon={TrendingUp}>{t('overview.kpi.peace_up', { n: peaceDelta })}</Foot>
  ) : peaceDelta < 0 ? (
    <Foot icon={TrendingDown} tone="text-danger-600">{t('overview.kpi.peace_down', { n: -peaceDelta })}</Foot>
  ) : (
    <Foot>{t('overview.kpi.peace_same')}</Foot>
  );

  // 4. Tỷ lệ tiết kiệm
  const ratePct = sv.rate === null ? null : Math.round(sv.rate * 100);
  const savingsTone: ExtTone = ratePct === null ? 'gray' : ratePct >= 20 ? 'green' : ratePct >= 10 ? 'orange' : 'red';
  const savingsLabel = ratePct === null ? null : t(`overview.kpi.savings.${ratePct >= 20 ? 'good' : ratePct >= 10 ? 'fair' : 'low'}`);
  const peerDiff = ratePct !== null && sv.peerRate !== null ? ratePct - Math.round(sv.peerRate * 100) : null;
  const savingsFoot =
    ratePct === null ? (
      <EmptyFoot text={t('overview.kpi.savings_empty')} to="/thu-chi" cta={t('overview.record_ledger')} />
    ) : peerDiff === null ? (
      <Foot>
        <Link to="/cai-dat#tai-chinh" className="hover:text-ink">{t('overview.kpi.peer_unknown')}</Link>
      </Foot>
    ) : peerDiff > 0 ? (
      <Foot icon={TrendingUp}>{t('overview.kpi.peer_above', { pct: peerDiff })}</Foot>
    ) : peerDiff < 0 ? (
      <Foot icon={TrendingDown} tone="text-danger-600">{t('overview.kpi.peer_below', { pct: -peerDiff })}</Foot>
    ) : (
      <Foot>{t('overview.kpi.peer_equal')}</Foot>
    );

  const months = decimal(safeMonths.months, locale);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 xl:grid-cols-4">
      <KpiCard
        icon={ShieldCheck}
        tone="green"
        label={t('overview.kpi.peace')}
        info={t('overview.kpi.peace_info')}
        value={data.ready ? peace.score : '—'}
        unit={data.ready ? '/100' : undefined}
        badge={
          data.ready && (
            <Badge size="sm" tone={LEVEL_TONE[peace.level]} icon={ArrowUp} className="ml-1">
              {t(`overview.kpi.level.${peace.level}`)}
            </Badge>
          )
        }
        progress={{ value: data.ready ? peace.score / 100 : 0, color: TONE_HEX[LEVEL_TONE[peace.level]], label: t('overview.kpi.peace') }}
        footnote={peaceFoot}
      />
      <KpiCard
        icon={CalendarDays}
        tone="blue"
        label={t('overview.kpi.safe')}
        info={t('overview.kpi.safe_info')}
        value={safeMonths.ready ? months : '—'}
        unit={safeMonths.ready ? t('overview.kpi.months') : undefined}
        progress={{ value: safeMonths.ready ? safeMonths.months / safeMonths.targetMonths : 0, tone: 'blue', label: t('overview.kpi.safe') }}
        footnote={
          safeMonths.ready ? (
            t('overview.kpi.safe_note', { months })
          ) : (
            <EmptyFoot text={t('overview.kpi.safe_empty')} to="/cai-dat#tai-chinh" cta={t('overview.add_data')} />
          )
        }
      />
      <KpiCard
        icon={CircleDollarSign}
        tone="green"
        label={t('overview.kpi.cashflow')}
        info={t('overview.kpi.cashflow_info')}
        value={
          cf.source === 'none' ? '—' : <span className={cf.net < 0 ? 'text-danger-600' : undefined}>{formatVndFull(cf.net, { sign: true })}</span>
        }
        valueClassName="text-[24px]"
        aside={cf.months.some((m) => m.net !== null) && <MiniBars values={cf.months.map((m) => m.net)} ariaLabel={t('overview.kpi.chart_label')} height={44} barWidth={5} />}
        footnote={
          cf.source === 'none' ? (
            <EmptyFoot text={t('overview.kpi.cashflow_empty')} to="/thu-chi" cta={t('overview.record_ledger')} />
          ) : (
            <>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-soft tabular-nums">
                <span>{t('overview.kpi.income')} {formatVndFull(cf.income)}</span>
                <span className="h-3.5 w-px bg-line" aria-hidden />
                <span>{t('overview.kpi.expense')} {formatVndFull(cf.expense)}</span>
              </p>
              {cf.source === 'estimate' && <p className="mt-1 text-[12px] text-ink-mute">{t('overview.kpi.cashflow_estimate')}</p>}
            </>
          )
        }
      />
      <KpiCard
        icon={Target}
        tone="rose"
        label={t('overview.kpi.savings')}
        info={t('overview.kpi.savings_info')}
        value={ratePct === null ? '—' : `${ratePct}%`}
        badge={
          savingsLabel && (
            <Badge size="sm" tone={savingsTone} className="ml-auto">
              {savingsLabel}
            </Badge>
          )
        }
        progress={{ value: ratePct === null ? 0 : Math.max(0, ratePct) / 100, tone: 'green', label: t('overview.kpi.savings') }}
        footnote={savingsFoot}
      />
    </div>
  );
}
