// Lộ trình kỹ năng → thu nhập kỳ vọng: kỹ năng (skill_plan_items) · thời gian học · thu nhập thêm từ cơ hội cùng nhóm.

import type { ReactNode } from 'react';
import { CircleCheck, CircleDollarSign, Clock3, Redo2, Sprout, Star, Clock, type LucideIcon } from 'lucide-react';
import type { RoadmapItem } from '@shared/types/api';
import { SectionCard, cx } from '@/components/ui';
import { useLocale } from '@/app/locale';
import { InfoTip, millions } from './shared';

function Column({ icon: Icon, title, head, body, wide, children }: { icon: LucideIcon; title: string; head: string; body: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cx('min-w-0 overflow-hidden rounded-xl border', wide ? 'flex-[1.25]' : 'flex-1', body)}>
      <div className={cx('flex items-center gap-2.5 px-3.5 py-2.5', head)}>
        <Icon className="h-6 w-6 shrink-0" strokeWidth={2} aria-hidden />
        <h3 className="text-[14.5px] font-bold text-ink">{title}</h3>
      </div>
      <ul className="space-y-1 bg-white px-3.5 py-2.5">{children}</ul>
    </div>
  );
}

const Arrow = () => (
  <span className="hidden shrink-0 items-center text-accent-600 md:flex" aria-hidden>
    <Redo2 className="h-5 w-5" />
  </span>
);

export function RoadmapCard({ items }: { items: RoadmapItem[] }) {
  const { t, locale } = useLocale();
  return (
    <SectionCard
      as="section"
      title={
        <span id="lo-trinh" className="inline-flex scroll-mt-24 items-center gap-1.5">
          {t('earn.road.title')}
          <InfoTip text={t('earn.road.info')} />
        </span>
      }
      icon={Sprout}
      iconTone="green"
      iconTile
      action={{ label: t('earn.road.personal'), to: '/lich-ai' }}
      bodyClassName="-mt-1"
    >
      {items.length === 0 ? (
        <p className="text-[13.5px] text-ink-soft">{t('earn.road.empty')}</p>
      ) : (
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:gap-2">
          <Column icon={CircleCheck} title={t('earn.road.skills')} head="bg-[#EAF7EF] text-success-600" body="border-[#D3EEDC]">
            {items.map((s) => (
              <li key={s.id} className="flex h-8 items-center gap-2 text-[13px] text-ink">
                <CircleCheck className={cx('h-4 w-4 shrink-0', s.status === 'done' ? 'text-success-600' : 'text-success-500/80')} aria-hidden />
                <span className="truncate">{s.name}</span>
              </li>
            ))}
          </Column>
          <Arrow />
          <Column icon={Clock3} title={t('earn.road.time')} head="bg-[#EAF2FE] text-accent-600" body="border-[#D6E5FB]">
            {items.map((s) => (
              <li key={s.id} className="flex h-8 items-center gap-2 text-[13px]">
                <Clock className="h-4 w-4 shrink-0 text-accent-600" aria-hidden />
                <span className="shrink-0 font-semibold text-ink">{t('earn.road.months', { a: s.monthsMin, b: s.monthsMax })}</span>
                <span className="truncate text-ink-soft">({t(`earn.stage.${s.stage}`)})</span>
              </li>
            ))}
          </Column>
          <Arrow />
          <Column icon={CircleDollarSign} title={t('earn.road.income')} head="bg-[#FFF4E2] text-amber-500" body="border-[#FBE3BD]" wide>
            {items.map((s) => (
              <li key={s.id} className="flex h-8 items-center gap-2 text-[13px]">
                <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
                {s.incomeMax > 0 ? (
                  <>
                    <span className="shrink-0 font-semibold text-ink">{t('earn.range_long', { a: millions(s.incomeMin, locale), b: millions(s.incomeMax, locale) })}</span>
                    {s.source && <span className="truncate text-[10.5px] text-ink-mute">{t('earn.road.from', { name: s.source.toLowerCase() })}</span>}
                  </>
                ) : (
                  <span className="text-ink-mute">—</span>
                )}
              </li>
            ))}
          </Column>
        </div>
      )}
    </SectionCard>
  );
}
