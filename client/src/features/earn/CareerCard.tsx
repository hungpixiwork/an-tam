// Giá trị nghề nghiệp (humanCapital B2): điểm 0..100, mức AI có thể thay thế công việc, hành động gợi ý.

import { useState } from 'react';
import { BadgeCheck, ChevronRight, Star, TrendingUp, UserRoundPen, ShieldCheck, GraduationCap, type LucideIcon } from 'lucide-react';
import type { CareerActionKey, CareerBand, EarnDashboard, ExposureLevel } from '@shared/types/api';
import { Badge, IconTile, Modal, SectionCard, ScoreRing, TONE_HEX, type ExtTone } from '@/components/ui';
import { useLocale } from '@/app/locale';
import { InfoTip, decimal } from './shared';

const BAND_TONE: Record<CareerBand, ExtTone> = { great: 'green', good: 'green', fair: 'orange', weak: 'red' };
const LEVEL_TONE: Record<ExposureLevel, ExtTone> = { low: 'green', medium: 'amber', high: 'red' };
/** 7 nấc từ xanh → đỏ. */
const NOTCHES = ['#1FA16B', '#3FB27A', '#7CC576', '#F5C542', '#F5A524', '#F2784B', '#EF4444'];
const ACTIONS: Record<CareerActionKey, { icon: LucideIcon; tone: ExtTone; href: string }> = {
  reduce_risk: { icon: ShieldCheck, tone: 'green', href: '#lo-trinh' },
  boost_income: { icon: TrendingUp, tone: 'blue', href: '#co-hoi' },
  personal_brand: { icon: UserRoundPen, tone: 'violet', href: '/lich-ai' },
  start_learning: { icon: GraduationCap, tone: 'amber', href: '#lo-trinh' },
};

function AiMeter({ pct, level }: { pct: number; level: ExposureLevel }) {
  const { t } = useLocale();
  // Vị trí chỉ báo: giữa nấc tương ứng (0..100 → 7 nấc)
  const notch = Math.min(6, Math.floor((pct / 100) * 7));
  const left = ((notch + 0.5) / 7) * 100;
  return (
    <div className="mt-2">
      <div className="relative h-7">
        <span className="absolute -translate-x-1/2 whitespace-nowrap rounded-md bg-amber-100 px-2 py-0.5 text-[12px] font-semibold text-amber-800" style={{ left: `${left}%` }}>
          {t(`earn.career.level.${level}`)}
        </span>
      </div>
      <div className="relative flex h-3 gap-[3px]" role="img" aria-label={`${t('earn.career.ai_title')}: ${t(`earn.career.level.${level}`)}`}>
        {NOTCHES.map((c, i) => (
          <span key={c} className="h-full flex-1 first:rounded-l-full last:rounded-r-full" style={{ background: c, opacity: i === notch ? 1 : 0.85 }} />
        ))}
        <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow" style={{ left: `${left}%`, background: TONE_HEX[LEVEL_TONE[level]] }} />
      </div>
    </div>
  );
}

export function CareerCard({ career }: { career: EarnDashboard['career'] }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const explain = [
    t('earn.explain.years', { years: career.years ?? 0, g: decimal(Math.round((career.g ?? 0) * 1000) / 10, locale) }),
    t('earn.explain.level', { n: Math.round(career.exposurePct / 25) }),
    t('earn.explain.note'),
  ];
  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-1.5">
          {t('earn.career.title')}
          <InfoTip text={t('earn.career.info')} />
        </span>
      }
      icon={BadgeCheck}
      iconTone="green"
      iconTile
      action={{ label: t('earn.career.detail'), onClick: () => setOpen(true) }}
      className="flex flex-col"
    >
      <div className="flex items-center gap-4">
        <ScoreRing score={career.careerScore} size={132} stroke={13} color={TONE_HEX[BAND_TONE[career.band]]} label={`${t('earn.career.title')}: ${career.careerScore}/100`} />
        <div className="min-w-0">
          <Badge tone={BAND_TONE[career.band]} icon={Star}>{t(`earn.career.band.${career.band}`)}</Badge>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{t(`earn.career.desc.${career.band}`)}</p>
        </div>
      </div>

      <h3 className="mt-5 flex items-center gap-1.5 text-[15px] font-bold text-ink">
        {t('earn.career.ai_title')}
        <InfoTip text={explain[1]} />
      </h3>
      <AiMeter pct={career.exposurePct} level={career.exposureLevel} />
      <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">{t(`earn.career.ai_desc.${career.exposureLevel}`)}</p>

      <div className="mt-4 rounded-2xl border border-line bg-slate-50/60 p-3">
        <h3 className="px-1 pb-2 text-[14.5px] font-bold text-ink">{t('earn.career.actions_title')}</h3>
        <ul className="space-y-2">
          {career.actions.map((key) => {
            const a = ACTIONS[key];
            return (
              <li key={key}>
                <a href={a.href} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600">
                  <IconTile icon={a.icon} tone={a.tone} size="lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-ink">{t(`earn.action.${key}.title`)}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">{t(`earn.action.${key}.body`)}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      {open && (
        <Modal title={t('earn.career.title')} onClose={() => setOpen(false)}>
          <ul className="list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-ink">
            {explain.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </Modal>
      )}
    </SectionCard>
  );
}
