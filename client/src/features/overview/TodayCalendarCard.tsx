import { CalendarDays, Check } from 'lucide-react';
import type { CalendarCategory, CalendarEvent } from '@shared/types/api';
import { ButtonLink, EmptyState, MenuButton, SectionCard, cx } from '@/components/ui';
import { useUpdateCalendarEvent } from '@/lib/queries';
import { useLocale } from '@/app/locale';

const DOT: Record<CalendarCategory, string> = {
  finance: 'bg-success-500',
  skill: 'bg-accent-600',
  work: 'bg-warning-500',
  rest: 'bg-sky-500',
  personal: 'bg-violet-500',
};

const INTL: Record<string, string> = { vi: 'vi-VN', en: 'en-US', zh: 'zh-CN' };

/** "Thứ Bảy, 27 tháng 9, 2026" theo ngôn ngữ đang chọn. */
function longDate(day: string, locale: string) {
  const text = new Intl.DateTimeFormat(INTL[locale] ?? 'vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function TodayCalendarCard({ date, events }: { date: string; events: CalendarEvent[] }) {
  const { t, locale } = useLocale();
  const update = useUpdateCalendarEvent();

  return (
    <SectionCard
      title={t('overview.cal.title')}
      icon={CalendarDays}
      iconTone="blue"
      action={{ label: t('overview.cal.view_full'), to: '/lich-ai' }}
      className="flex flex-col"
    >
      <div className="-mt-1 mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex h-7 items-center rounded-full bg-accent-50 px-3 text-[12.5px] font-semibold text-accent-700">{longDate(date, locale)}</span>
        {events.length > 0 && (
          <span className="inline-flex h-7 items-center rounded-full bg-accent-50 px-3 text-[12.5px] font-semibold text-accent-700">{t('overview.cal.count', { n: events.length })}</span>
        )}
      </div>
      {events.length === 0 ? (
        <EmptyState
          compact
          icon={CalendarDays}
          title={t('overview.cal.empty_title')}
          body={t('overview.cal.empty_body')}
          action={
            <ButtonLink to="/lich-ai" variant="soft" size="sm" arrow>
              {t('overview.cal.open')}
            </ButtonLink>
          }
        />
      ) : (
        <ul className="space-y-1.5">
          {events.map((e) => (
            <li key={e.id} className="grid grid-cols-[78px_1fr_auto] items-center sm:grid-cols-[104px_1fr_auto] rounded-xl border border-line bg-white">
              <span className="self-stretch border-r border-line py-2.5 pl-3 text-[12.5px] font-medium tabular-nums text-ink-soft">
                {e.startsAt.slice(11, 16)} – {e.endsAt.slice(11, 16)}
              </span>
              <div className="flex min-w-0 items-start gap-2.5 px-3 py-2">
                <span className={cx('mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full', e.done ? 'bg-slate-300' : DOT[e.category])} role="img" aria-label={t(`overview.cal.category.${e.category}`)} />
                <div className="min-w-0">
                  <p className={cx('flex items-center gap-1.5 text-[13.5px] font-semibold sm:truncate', e.done ? 'text-ink-mute line-through' : 'text-ink')}>
                    {e.title}
                    {e.done && <Check className="h-3.5 w-3.5 shrink-0 text-success-600" aria-label={t('overview.cal.done')} />}
                  </p>
                  {e.note && <p className="text-[12px] text-ink-soft sm:truncate">{e.note}</p>}
                </div>
              </div>
              <MenuButton
                className="pr-2"
                label={t('overview.sugg.menu')}
                items={[{ label: t(e.done ? 'overview.cal.mark_undone' : 'overview.cal.mark_done'), onSelect: () => update.mutate({ id: e.id, done: !e.done }) }]}
              />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
