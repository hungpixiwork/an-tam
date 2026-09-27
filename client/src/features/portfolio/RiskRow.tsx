import { AlertCircle, ArrowRight, BriefcaseBusiness, ChevronRight, Info, Lightbulb } from 'lucide-react';
import type { PortfolioRisk } from '@shared/types/api';
import type { AssetCategory } from '@shared/types/domain';
import { formatVndFull } from '@shared/format';
import { DonutChart, Gauge, SectionCard, cx, type ExtTone } from '@/components/ui';
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

/** Cơ cấu danh mục đầu tư: donut + 5 dòng loại tài sản. Bấm dòng → xuống bảng các khoản. */
export function AllocationCard({ risk, onPick }: { risk: PortfolioRisk; onPick: (c: AssetCategory) => void }) {
  const { t } = useLocale();
  const total = risk.netWorth.invested;
  return (
    <SectionCard title={t('portfolio.alloc.title')} className="h-full">
      {risk.allocation.length === 0 ? (
        <p className="text-sm text-ink-soft">{t('portfolio.alloc.empty')}</p>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <DonutChart data={risk.allocation.map((a) => ({ key: a.category, value: a.value, color: CATEGORY_COLOR[a.category] }))} size={168} thickness={30}>
            <span className="text-[30px] font-extrabold leading-none text-ink tabular-nums">{Math.round(total / 1_000_000).toLocaleString('vi-VN')}</span>
            <span className="mt-1 text-[13px] text-ink-soft">{t('portfolio.alloc.unit')}</span>
          </DonutChart>
          <ul className="w-full min-w-0 flex-1 space-y-1">
            {risk.allocation.map((a) => (
              <li key={a.category}>
                <button
                  type="button"
                  onClick={() => onPick(a.category)}
                  className="grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-2.5 rounded-lg px-1 py-2 text-left text-[13.5px] hover:bg-canvas"
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
