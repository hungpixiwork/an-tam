import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Filter, Sparkles, Trash2 } from 'lucide-react';
import type { CalendarCategory, CalendarEvent, CalendarWeek } from '@shared/types/api';
import { Button, Modal, Segmented, WEEK_CATEGORY_STYLES, WeekGrid, cx, type WeekEvent } from '@/components/ui';
import { useCalendarMonth, useDeleteCalendarEvent, useUpdateCalendarEvent } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { CATEGORIES, CATEGORY_ICON, addDays, addMonthsTo, ddmm, monthLabel, rangeLabel, weekStartOf, weekdayShort } from './util';

export type CalendarView = 'day' | 'week' | 'month';

interface Props {
  data: CalendarWeek;
  anchor: string;
  view: CalendarView;
  onAnchor: (day: string) => void;
  onView: (v: CalendarView) => void;
}

const iconBtn = 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600';

/** Khối lịch: thanh công cụ (Hôm nay ‹ › · khoảng ngày · Ngày/Tuần/Tháng · Bộ lọc) + lưới + chú giải. */
export function WeekCalendarCard({ data, anchor, view, onAnchor, onView }: Props) {
  const { t, locale } = useLocale();
  const [hidden, setHidden] = useState<CalendarCategory[]>([]);
  const [open, setOpen] = useState<CalendarEvent | null>(null);
  const shown = data.events.filter((e) => !hidden.includes(e.category));

  const step = (dir: 1 | -1) => onAnchor(view === 'day' ? addDays(anchor, dir) : view === 'week' ? addDays(weekStartOf(anchor), dir * 7) : addMonthsTo(anchor, dir));
  const label = view === 'month' ? monthLabel(anchor, locale) : view === 'day' ? rangeLabel(anchor, anchor, locale) : rangeLabel(data.weekStart, data.weekEnd, locale);

  const days = useMemo(() => {
    const list = view === 'day' ? [anchor] : Array.from({ length: 7 }, (_, i) => addDays(data.weekStart, i));
    return list.map((date) => ({ date, label: weekdayShort(date, locale), sub: ddmm(date), isToday: date === data.today }));
  }, [view, anchor, data.weekStart, data.today, locale]);

  const events: WeekEvent[] = shown
    .map((e) => ({ e, di: days.findIndex((d) => d.date === e.startsAt.slice(0, 10)) }))
    .filter(({ di }) => di >= 0)
    .map(({ e, di }) => ({
      id: e.id,
      dayIndex: di,
      start: e.startsAt.slice(11, 16),
      end: e.endsAt.slice(0, 10) > e.startsAt.slice(0, 10) ? '23:59' : e.endsAt.slice(11, 16),
      title: e.done ? <span className="line-through decoration-ink-soft/60">{e.title}</span> : e.title,
      ariaLabel: `${e.title} ${e.startsAt.slice(11, 16)}–${e.endsAt.slice(11, 16)}`,
      category: e.category,
      icon: e.source === 'agent' ? Sparkles : CATEGORY_ICON[e.category],
    }));

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card md:p-5" aria-label={t('calendar.grid_label')}>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={() => onAnchor(data.today)} className="h-10 rounded-xl border border-line bg-white px-3.5 text-[13.5px] font-semibold text-ink hover:bg-slate-50">
          {t('calendar.today')}
        </button>
        <div className="flex gap-1.5">
          <button type="button" className={iconBtn} onClick={() => step(-1)} aria-label={t('calendar.prev')}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" className={iconBtn} onClick={() => step(1)} aria-label={t('calendar.next')}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <h3 className="ml-1 min-w-0 flex-1 text-[17px] font-bold text-ink md:text-[19px]" aria-live="polite">{label}</h3>
        <Segmented<CalendarView>
          value={view}
          onChange={onView}
          label={t('calendar.view_label')}
          className="w-full sm:w-[240px]"
          options={[
            { value: 'day', label: t('calendar.view.day') },
            { value: 'week', label: t('calendar.view.week') },
            { value: 'month', label: t('calendar.view.month') },
          ]}
        />
        <FilterButton hidden={hidden} onChange={setHidden} />
      </div>

      {view === 'month' ? (
        <MonthGrid anchor={anchor} today={data.today} hidden={hidden} onPick={(day) => { onAnchor(day); onView('day'); }} />
      ) : (
        <WeekGrid
          days={days}
          events={events}
          startHour={7}
          endHour={22}
          hourHeight={48}
          ariaLabel={label}
          onEventClick={(ev) => setOpen(data.events.find((e) => e.id === ev.id) ?? null)}
          legend={CATEGORIES.map((c) => ({ category: c, label: t(`calendar.cat.${c}`) }))}
        />
      )}
      {view !== 'month' && data.events.length === 0 && <p className="mt-2 text-center text-[13px] text-ink-soft">{t('calendar.empty_week')}</p>}
      {open && <EventModal event={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function FilterButton({ hidden, onChange }: { hidden: CalendarCategory[]; onChange: (v: CalendarCategory[]) => void }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cx('inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-[13.5px] font-semibold', hidden.length ? 'border-accent-200 bg-accent-50 text-accent-700' : 'border-line bg-white text-ink hover:bg-slate-50')}
      >
        <Filter className="h-4 w-4" aria-hidden />
        {t('calendar.filter')}
        {hidden.length > 0 && <span className="text-[12px]">({CATEGORIES.length - hidden.length})</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-line bg-white p-3 shadow-lift">
          <p className="mb-2 text-[12.5px] font-semibold text-ink-soft">{t('calendar.filter_title')}</p>
          {CATEGORIES.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-[13.5px] text-ink hover:bg-slate-50">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#1E6FD9]"
                checked={!hidden.includes(c)}
                onChange={(e) => onChange(e.target.checked ? hidden.filter((x) => x !== c) : [...hidden, c])}
              />
              <span className={cx('h-2.5 w-2.5 rounded-full', WEEK_CATEGORY_STYLES[c].dot)} aria-hidden />
              {t(`calendar.cat.${c}`)}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function MonthGrid({ anchor, today, hidden, onPick }: { anchor: string; today: string; hidden: CalendarCategory[]; onPick: (day: string) => void }) {
  const { t, locale } = useLocale();
  const month = anchor.slice(0, 7);
  const { data } = useCalendarMonth(month, true);
  const first = `${month}-01`;
  const start = weekStartOf(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const byDay = new Map((data?.days ?? []).map((d) => [d.date, d.counts]));
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="grid grid-cols-7 border-b border-line bg-slate-50">
        {cells.slice(0, 7).map((d) => (
          <p key={d} className="py-2 text-center text-[12.5px] font-bold text-ink">{weekdayShort(d, locale)}</p>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const counts = byDay.get(d) ?? {};
          const cats = CATEGORIES.filter((c) => !hidden.includes(c) && counts[c]);
          const total = cats.reduce((s, c) => s + (counts[c] ?? 0), 0);
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPick(d)}
              className={cx('flex min-h-[84px] flex-col items-start gap-1.5 border-b border-l border-line p-2 text-left hover:bg-accent-50/60', d.slice(0, 7) !== month && 'bg-slate-50/60 text-ink-soft', d === today && 'bg-accent-50')}
            >
              <span className={cx('text-[13px] font-semibold', d === today && 'text-accent-600')}>{Number(d.slice(8))}</span>
              {total > 0 && (
                <span className="flex flex-wrap items-center gap-1">
                  {cats.map((c) => <span key={c} className={cx('h-2 w-2 rounded-full', WEEK_CATEGORY_STYLES[c].dot)} aria-hidden />)}
                  <span className="text-[11.5px] text-ink-soft">{t('calendar.month_more', { n: total })}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EventModal({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const { t, locale } = useLocale();
  const update = useUpdateCalendarEvent();
  const remove = useDeleteCalendarEvent();
  const Icon = CATEGORY_ICON[event.category];
  const readOnly = event.source === 'google';
  return (
    <Modal title={event.title} onClose={onClose}>
      <div className="space-y-2 text-[14px] text-ink">
        <p className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-ink-soft" aria-hidden />
          {t(`calendar.cat.${event.category}`)} · {rangeLabel(event.startsAt.slice(0, 10), event.startsAt.slice(0, 10), locale)} · {event.startsAt.slice(11, 16)} – {event.endsAt.slice(11, 16)}
        </p>
        {event.note && <p className="text-ink-soft">{event.note}</p>}
        <p className="text-[12.5px] text-ink-soft">{t(`calendar.source.${event.source}`)}</p>
      </div>
      {!readOnly && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" icon={Check} disabled={update.isPending} onClick={() => update.mutate({ id: event.id, done: !event.done }, { onSuccess: onClose })}>
            {event.done ? t('calendar.event.mark_undone') : t('calendar.event.mark_done')}
          </Button>
          <Button size="sm" variant="danger" icon={Trash2} disabled={remove.isPending} onClick={() => remove.mutate(event.id, { onSuccess: onClose })}>
            {t('calendar.event.delete')}
          </Button>
        </div>
      )}
    </Modal>
  );
}
