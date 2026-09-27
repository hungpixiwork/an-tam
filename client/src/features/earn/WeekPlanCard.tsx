// Kế hoạch học tập 7 ngày — buổi học lấy từ Lịch AI (calendar_events loại 'skill'); bấm để đánh dấu đã học.

import { CalendarCheck, CircleCheck, Circle, LoaderCircle, CircleAlert } from 'lucide-react';
import type { EarnDashboard, LearningDay, LearningDayStatus } from '@shared/types/api';
import { SectionCard, cx } from '@/components/ui';
import { useMarkLearning } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { InfoTip, TAG_STYLE, decimal } from './shared';

const INTL: Record<string, string> = { vi: 'vi-VN', en: 'en-US', zh: 'zh-CN' };

function weekday(day: string, locale: string) {
  const d = new Date(`${day}T00:00:00Z`);
  if (locale === 'vi') return d.getUTCDay() === 0 ? 'Chủ nhật' : `Thứ ${d.getUTCDay() + 1}`;
  return new Intl.DateTimeFormat(INTL[locale] ?? 'en-US', { weekday: 'short', timeZone: 'UTC' }).format(d);
}

const STATUS_ICON: Record<LearningDayStatus, { icon: typeof Circle; cls: string }> = {
  done: { icon: CircleCheck, cls: 'text-white fill-success-500' },
  today: { icon: LoaderCircle, cls: 'text-accent-600' },
  planned: { icon: Circle, cls: 'text-ink-mute' },
  missed: { icon: CircleAlert, cls: 'text-warning-600' },
  free: { icon: Circle, cls: 'text-line' },
};

function DayCell({ day }: { day: LearningDay }) {
  const { t, locale } = useLocale();
  const mark = useMarkLearning();
  const style = day.status === 'done' ? 'bg-[#E3F5EA] border-[#C4E9D2]' : day.status === 'today' ? 'bg-[#E6F0FD] border-[#C9DDFB]' : day.tag ? TAG_STYLE[day.tag].cell : 'bg-slate-50 border-line';
  const { icon: Icon, cls } = STATUS_ICON[day.status];
  const done = day.status === 'done';
  const label = day.title ? t(done ? 'earn.week.mark_undo' : 'earn.week.mark_done', { title: day.title }) : t('earn.week.free');
  const body = (
    <>
      <Icon className={cx('h-[18px] w-[18px]', cls)} strokeWidth={2.2} aria-hidden />
      <span className="mt-1 line-clamp-3 break-words text-[10.5px] font-medium leading-[1.25] text-ink">{day.title ?? t('earn.week.free')}</span>
      <span className="mt-auto pt-1 text-[11px] text-ink-soft">{day.hours > 0 ? t('earn.week.hours', { n: decimal(day.hours, locale) }) : ''}</span>
      <span className="sr-only">{t(`earn.week.status.${day.status}`)}</span>
    </>
  );
  const cellCls = cx('relative flex h-[104px] w-full flex-col items-start rounded-lg border px-1.5 py-2 text-left', style);
  return (
    <li className="min-w-0">
      <p className="text-[12px] font-semibold text-ink">{weekday(day.date, locale)}</p>
      <p className="mb-1.5 text-[11px] text-ink-mute tabular-nums">{day.date.slice(8, 10)}/{day.date.slice(5, 7)}</p>
      {day.eventId ? (
        <button
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={done}
          disabled={mark.isPending}
          onClick={() => mark.mutate({ id: day.eventId!, done: !done })}
          className={cx(cellCls, 'transition hover:brightness-[0.98] hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600 disabled:opacity-70')}
        >
          {body}
        </button>
      ) : (
        <div className={cellCls}>{body}</div>
      )}
    </li>
  );
}

export function WeekPlanCard({ week }: { week: EarnDashboard['week'] }) {
  const { t, locale } = useLocale();
  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-1.5">
          {t('earn.week.title')}
          <InfoTip text={t('earn.week.info')} />
        </span>
      }
      subtitle={t('earn.week.summary', { done: decimal(week.doneHours, locale), planned: decimal(week.plannedHours, locale) })}
      icon={CalendarCheck}
      iconTone="blue"
      action={{ label: t('earn.week.open'), to: '/lich-ai' }}
      bodyClassName="-mt-1"
    >
      <ol className="no-scrollbar -mx-1 grid auto-cols-[minmax(64px,1fr)] grid-flow-col gap-1.5 overflow-x-auto px-1 pb-1">
        {week.days.map((d) => <DayCell key={d.date} day={d} />)}
      </ol>
    </SectionCard>
  );
}
