import { useState } from 'react';
import { AlertCircle, ArrowRight, BriefcaseBusiness, ChevronRight, Info, Lightbulb } from 'lucide-react';
import type { AllocationData, PortfolioRisk } from '@shared/types/api';
import { ALLOCATION_ASSUMPTIONS } from '@shared/engine/allocation';
import { CATEGORY_ORDER } from '@shared/engine/portfolio';
import type { AssetCategory } from '@shared/types/domain';
import { formatVndFull } from '@shared/format';
import { DonutChart, Gauge, SectionCard, Segmented, cx, type ExtTone } from '@/components/ui';
import { useLocale } from '@/app/locale';

export const CATEGORY_COLOR: Record<AssetCategory, string> = {
  stock: '#3B82F6',
  fund: '#22B07D',
  bond: '#F5A524',
  cash: '#A78BFA',
  other: '#A5B4FC',
};

const LEVEL_TONE: Record<PortfolioRisk['level'], ExtTone> = { high: 'red', mid: 'orange', low: 'green' };

function InfoDot({ text }: { text: string }) {
  return (
    <span title={text} aria-label={text} role="img" className="inline-flex text-ink-mute">
      <Info className="h-4 w-4" aria-hidden />
    </span>
  );
}

function ArrowLink({ children, onClick, tone = 'text-accent-600' }: { children: string; onClick?: () => void; tone?: string }) {
  return (
    <button type="button" onClick={onClick} className={cx('mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold hover:underline', tone)}>
      {children}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/** Cơ cấu danh mục đầu tư: donut + 5 dòng loại tài sản. Bấm dòng → xuống bảng các khoản.
 *  Nút "Hiện tại | Đề xuất": Đề xuất đổi donut + chú thích sang danh mục đề xuất và thêm các bước chuyển tiền ngay trong thẻ. */
export function AllocationCard({ risk, plan, onPick }: { risk: PortfolioRisk; plan?: AllocationData; onPick: (c: AssetCategory) => void }) {
  const { t } = useLocale();
  const [mode, setMode] = useState<'current' | 'target'>('current');
  const target = mode === 'target' && plan ? plan.targetPortfolio : null;
  const total = target ? target.base : risk.netWorth.invested;
  const rows = target
    ? CATEGORY_ORDER.map((category) => ({ category, pct: target.target[category], value: Math.round(target.base * target.target[category]) })).filter((r) => r.pct > 0.001)
    : risk.allocation;
  const catLabel = (c: AssetCategory, employer = false) => (employer ? t('portfolio.alloc.from_employer') : t(`portfolio.cat.${c}`));
  const hint = plan
    ? plan.targetPortfolio.horizonGoal
      ? t('portfolio.alloc.target_hint', { goal: plan.targetPortfolio.horizonGoal.title, n: plan.targetPortfolio.horizonGoal.months, pct: Math.round(plan.targetPortfolio.riskyShare * 100) })
      : t('portfolio.alloc.target_hint_nogoal', { pct: Math.round(plan.targetPortfolio.riskyShare * 100) })
    : '';
  return (
    <SectionCard
      title={t('portfolio.alloc.title')}
      className="h-full"
      extra={
        plan && risk.allocation.length > 0 ? (
          <div title={hint}>
            <Segmented
              label={t('portfolio.alloc.mode')}
              value={mode}
              onChange={setMode}
              options={[{ value: 'current', label: t('portfolio.alloc.mode.current') }, { value: 'target', label: t('portfolio.alloc.mode.target') }]}
              className="-my-1 p-0.5 [&>button]:h-7 [&>button]:whitespace-nowrap [&>button]:px-2.5 [&>button]:text-[12.5px]"
            />
          </div>
        ) : undefined
      }
    >
      {risk.allocation.length === 0 ? (
        <p className="text-sm text-ink-soft">{t('portfolio.alloc.empty')}</p>
      ) : (
        <>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <DonutChart data={rows.map((a) => ({ key: a.category, value: a.value, color: CATEGORY_COLOR[a.category] }))} size={168} thickness={30}>
              <span className="text-[30px] font-extrabold leading-none text-ink tabular-nums">{Math.round(total / 1_000_000).toLocaleString('vi-VN')}</span>
              <span className="mt-1 text-[13px] text-ink-soft">{t('portfolio.alloc.unit')}</span>
            </DonutChart>
            <ul className="w-full min-w-0 flex-1 space-y-1">
              {rows.map((a) => (
                <li key={a.category}>
                  <button
                    type="button"
                    onClick={() => onPick(a.category)}
                    className={cx('grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-2.5 rounded-lg px-1 text-left text-[13.5px] hover:bg-canvas', target ? 'py-1' : 'py-2')}
                  >
                    <span className="flex min-w-0 items-center gap-2.5 text-ink">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[a.category] }} aria-hidden />
                      <span className="truncate">{t(`portfolio.cat.${a.category}`)}</span>
                    </span>
                    <span className="w-11 text-right font-bold text-ink tabular-nums">{Math.round(a.pct * 100)}%</span>
                    <span className="text-right text-ink-soft tabular-nums">{formatVndFull(a.value)}</span>
                    <ChevronRight className="h-4 w-4 text-ink-mute" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {target && plan && (
            <div className="mt-3 border-t border-line pt-2.5">
              <p className="text-[13px] font-bold text-ink">{t('portfolio.alloc.steps')}</p>
              {plan.rebalanceSteps.length === 0 ? (
                <p className="mt-1 text-[12.5px] text-ink-soft">{t('portfolio.alloc.no_steps')}</p>
              ) : (
                <ol className="mt-1 space-y-1">
                  {plan.rebalanceSteps.map((s, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] leading-snug">
                      <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[10.5px] font-bold text-accent-700">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="font-semibold text-ink">{t('portfolio.alloc.step', { amount: formatVndFull(s.amount), from: catLabel(s.from, s.fromEmployer), to: catLabel(s.to) })}</span>
                        <span className="text-ink-soft"> · {t(`portfolio.alloc.reason.${s.reason}`, { pct: Math.round(ALLOCATION_ASSUMPTIONS.employerStockCap * 100) })}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

/** Cổ phiếu công ty của bạn: hộp tỷ trọng + hộp "Bạn có biết?". */
export function EmployerCard({ risk, onDiversify }: { risk: PortfolioRisk; onDiversify: () => void }) {
  const { t } = useLocale();
  const { employer } = risk;
  const pct = Math.round(employer.share * 100);
  const tone = employer.level === 'high' ? 'bg-danger-50 text-danger-600' : employer.level === 'mid' ? 'bg-amber-50 text-amber-600' : 'bg-success-50 text-success-600';
  return (
    <SectionCard title={t('portfolio.employer.title')} badge={<InfoDot text={t('portfolio.employer.info')} />} className="h-full">
      <div className="space-y-3">
        <div className={cx('flex gap-3.5 rounded-xl p-4', tone.split(' ')[0])}>
          <span className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/70', tone.split(' ')[1])}>
            <BriefcaseBusiness className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            {employer.value > 0 ? (
              <>
                <p className={cx('text-[16px] font-bold', tone.split(' ')[1])}>{t(`portfolio.employer.level.${employer.level}`, { pct })}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{t('portfolio.employer.body', { amount: formatVndFull(employer.value) })}</p>
              </>
            ) : (
              <p className="text-[13px] leading-relaxed text-ink-soft">{t('portfolio.employer.none')}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3 rounded-xl bg-amber-50/70 p-4">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden />
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-ink">{t('portfolio.employer.tip_title')}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{t('portfolio.employer.tip')}</p>
            <ArrowLink onClick={onDiversify}>{t('portfolio.employer.cta')}</ArrowLink>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/** Mức độ rủi ro tập trung: Gauge 0..100 + hộp cảnh báo theo ngành lớn nhất. */
export function RiskGaugeCard({ risk, onDetail }: { risk: PortfolioRisk; onDetail: () => void }) {
  const { t } = useLocale();
  const top = risk.exposure[0];
  const tone = LEVEL_TONE[risk.level];
  const box = risk.level === 'high' ? 'bg-danger-50' : risk.level === 'mid' ? 'bg-amber-50' : 'bg-success-50';
  const text = risk.level === 'high' ? 'text-danger-600' : risk.level === 'mid' ? 'text-amber-600' : 'text-success-600';
  const sector = top ? t(`portfolio.sector.${top.sector}`) : '';
  return (
    <SectionCard title={t('portfolio.risk.title')} badge={<InfoDot text={t('portfolio.risk.info')} />} className="h-full">
      <Gauge value={risk.score} label={t(`portfolio.risk.level.${risk.level}`)} tone={tone} size={176} stroke={18} ariaLabel={`${t('portfolio.risk.title')}: ${risk.score}/100`} />
      {top && (
        <div className={cx('mt-3 flex gap-3 rounded-xl p-4', box)}>
          <AlertCircle className={cx('mt-0.5 h-5 w-5 shrink-0', text)} aria-hidden />
          <div className="min-w-0">
            <p className={cx('text-[14px] font-bold', text)}>{t(`portfolio.risk.alert.${risk.level}`)}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
              {risk.careerSector
                ? t('portfolio.risk.alert_body', { asset: Math.round(risk.topSectorAssetShare * 100), total: Math.round(top.share * 100), sector })
                : t('portfolio.risk.alert_body_nocareer', { asset: Math.round(top.share * 100), sector })}
            </p>
            <ArrowLink onClick={onDetail}>{t('portfolio.risk.cta')}</ArrowLink>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
