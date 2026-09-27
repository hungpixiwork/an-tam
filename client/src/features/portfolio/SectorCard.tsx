import { forwardRef } from 'react';
import { ArrowRight, BookOpen, Building2, Cog, Factory, GraduationCap, HeartPulse, Landmark, Monitor, ShoppingCart, Shapes, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PortfolioRisk } from '@shared/types/api';
import type { Sector } from '@shared/types/domain';
import { Badge, SectionCard, type ExtTone } from '@/components/ui';
import { useLocale } from '@/app/locale';

const SECTOR_ICON: Record<Sector, LucideIcon> = {
  technology: Monitor,
  finance: Landmark,
  real_estate: Building2,
  manufacturing: Factory,
  consumer: ShoppingCart,
  healthcare: HeartPulse,
  education_public: GraduationCap,
  other: Shapes,
};
const LEVEL_TONE: Record<PortfolioRisk['level'], ExtTone> = { high: 'red', mid: 'orange', low: 'green' };
const BAR: Record<PortfolioRisk['level'], string> = { high: '#F05252', mid: '#F5A524', low: '#3B82F6' };

/** H4 — mức phụ thuộc theo ngành (thu nhập từ công việc + tài sản đầu tư) | hộp "Vì sao…". */
export const SectorCard = forwardRef<HTMLDivElement, { risk: PortfolioRisk }>(function SectorCard({ risk }, ref) {
  const { t } = useLocale();
  const rows = risk.exposure.slice(0, 4);
  return (
    <div ref={ref} className="scroll-mt-24">
      <SectionCard title={t('portfolio.sector.title')} bodyClassName="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_440px]">
        <div className="space-y-3">
          {rows.map((r) => {
            const Icon = SECTOR_ICON[r.sector];
            const pct = Math.round(r.share * 100);
            return (
              <div key={r.sector} className="grid grid-cols-[24px_120px_1fr_48px_96px] items-center gap-3 text-[14px] max-sm:grid-cols-[24px_1fr_44px] max-sm:gap-2">
                <Icon className="h-5 w-5 text-ink-soft" aria-hidden />
                <span className="truncate text-ink">{t(`portfolio.sector.${r.sector}`)}</span>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100 max-sm:col-span-3 max-sm:row-start-2" role="img" aria-label={`${t(`portfolio.sector.${r.sector}`)} ${pct}%`}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, background: BAR[r.level] }} />
                </div>
                <span className="text-right font-bold text-ink tabular-nums">{pct}%</span>
                <Badge size="sm" tone={LEVEL_TONE[r.level]} className="justify-center max-sm:hidden">
                  {t(`portfolio.sector.badge.${r.level}`)}
                </Badge>
              </div>
            );
          })}
          {!risk.careerSector && (
            <p className="text-[12.5px] text-ink-mute">
              <Link to="/tang-thu-nhap" className="hover:text-ink">{t('portfolio.sector.career_hint')}</Link>
            </p>
          )}
        </div>
        <div className="flex gap-3.5 rounded-xl bg-sky-50/70 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-accent-600">
            <Cog className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-ink">{t('portfolio.sector.why_title')}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{t('portfolio.sector.why')}</p>
            <Link to="/cong-dong" className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-600 hover:underline">
              <BookOpen className="h-4 w-4" aria-hidden />
              {t('portfolio.sector.why_cta')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </SectionCard>
    </div>
  );
});
