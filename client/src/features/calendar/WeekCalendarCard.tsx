import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Filter, Plus, Sparkles, Trash2, CalendarPlus } from 'lucide-react';
import type { CalendarCategory, CalendarEvent, CalendarWeek } from '@shared/types/api';
import { Button, Modal, Segmented, WEEK_CATEGORY_STYLES, WeekGrid, cx, type WeekEvent } from '@/components/ui';
import { useCalendarMonth, useDeleteCalendarEvent, useUpdateCalendarEvent, useAutoSchedule } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { CATEGORIES, CATEGORY_ICON, addDays, addMonthsTo, ddmm, monthLabel, rangeLabel, weekStartOf, weekdayShort } from './util';
import { QuickCreateModal } from './QuickCreateModal';

export type CalendarView = 'day' | 'week' | 'month';

interface Props {
  data: CalendarWeek;
  anchor: string;
  view: CalendarView;
  onAnchor: (day: string) => void;
  onView: (v: CalendarView) => void;
}

export function WeekCalendarCard({ data, anchor, view, onAnchor, onView }: Props) {
  const { t, locale } = useLocale();
  const [hidden, setHidden] = useState<CalendarCategory[]>([]);
  const [open, setOpen] = useState<CalendarEvent | null>(null);
  const [quickCreate, setQuickCreate] = useState<{ open: boolean; date?: string; hour?: number }>({ open: false });
  const autoSchedule = useAutoSchedule();

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
    <div className="min-w-0" aria-label={t('calendar.grid_label')}>
      {/* ── Toolbar: Date Navigation + View Switcher + Filter + Action ── */}
      <div className="mb-3 space-y-2.5">
        {/* Row 1: Date Navigation & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onAnchor(data.today)}
              className="h-8.5 rounded-xl border border-line bg-white px-3 text-[12.5px] font-bold text-ink hover:bg-slate-50 transition-colors shadow-xs"
            >
              {t('calendar.today')}
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-line bg-white text-ink hover:bg-slate-50 transition-colors shadow-xs"
                onClick={() => step(-1)}
                aria-label={t('calendar.prev')}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-line bg-white text-ink hover:bg-slate-50 transition-colors shadow-xs"
                onClick={() => step(1)}
                aria-label={t('calendar.next')}
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <h2 className="ml-1 text-[15px] sm:text-[17px] font-bold text-ink whitespace-nowrap" aria-live="polite">
              {label}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => autoSchedule.mutate(data.weekStart)}
              disabled={autoSchedule.isPending}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#D7EFE2] bg-[#F1FAF5] px-3 py-1.5 text-[12.5px] font-bold text-primary-700 hover:bg-[#E3F5EB] transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary-600" />
              {autoSchedule.isPending ? 'AI đang xếp…' : 'Nhờ AI xếp lịch'}
            </button>
            <Button
              size="sm"
              icon={Plus}
              onClick={() => setQuickCreate({ open: true })}
              className="hidden sm:inline-flex h-8.5 px-3 text-[12.5px]"
            >
              Thêm lịch
            </Button>
          </div>
        </div>

        {/* Row 2: View Switcher (Ngày / Tuần / Tháng) + Filter Button */}
        <div className="flex items-center justify-between gap-2">
          <Segmented<CalendarView>
            value={view}
            onChange={onView}
            label={t('calendar.view_label')}
            className="flex-1 sm:max-w-[240px]"
            options={[
              { value: 'day', label: t('calendar.view.day') },
              { value: 'week', label: t('calendar.view.week') },
              { value: 'month', label: t('calendar.view.month') },
            ]}
          />
          <div className="flex items-center gap-2">
            <FilterButton hidden={hidden} onChange={setHidden} />
          </div>
        </div>
      </div>

      {/* ── Main Calendar Canvas ── */}
      {view === 'month' ? (
        <MonthGrid anchor={anchor} today={data.today} hidden={hidden} onPick={(day) => { onAnchor(day); onView('day'); }} />
      ) : (
        <WeekGrid
          days={days}
          events={events}
          startHour={7}
          endHour={22}
          hourHeight={52}
          ariaLabel={label}
          onEventClick={(ev) => setOpen(data.events.find((e) => e.id === ev.id) ?? null)}
          onSlotClick={(date, hour) => setQuickCreate({ open: true, date, hour })}
          legend={CATEGORIES.map((c) => ({ category: c, label: t(`calendar.cat.${c}`) }))}
        />
      )}

      {view !== 'month' && data.events.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-white p-6 text-center text-[13px] text-ink-soft">
          <p>{t('calendar.empty_week')}</p>
          <button
            type="button"
            onClick={() => setQuickCreate({ open: true })}
            className="mt-2 inline-flex items-center gap-1.5 font-bold text-primary-700 hover:text-primary-800"
          >
            <CalendarPlus className="h-4 w-4" /> Thêm sự kiện đầu tiên
          </button>
        </div>
      )}

      {/* ── Floating Action Button (FAB) on Mobile ── */}
      <button
        type="button"
        onClick={() => setQuickCreate({ open: true })}
        aria-label="Thêm lịch mới"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary-700 text-white shadow-[0_4px_16px_rgba(25,118,210,0.35)] transition-transform active:scale-95 sm:hidden"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      {/* ── Quick Create Modal ── */}
      {quickCreate.open && (
        <QuickCreateModal
          initialDate={quickCreate.date}
          initialHour={quickCreate.hour}
          weekStart={data.weekStart}
          onClose={() => setQuickCreate({ open: false })}
        />
      )}

      {/* ── Event Detail Modal ── */}
      {open && <EventModal event={open} onClose={() => setOpen(null)} />}
    </div>
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
        className={cx(
          'inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[12.5px] font-semibold transition-colors shadow-xs',
          hidden.length ? 'border-primary-300 bg-primary-50 text-primary-800' : 'border-line bg-white text-ink hover:bg-slate-50',
        )}
      >
        <Filter className="h-3.5 w-3.5" aria-hidden />
        {t('calendar.filter')}
        {hidden.length > 0 && <span className="ml-0.5 rounded-full bg-primary-600 px-1.5 py-0.2 text-[10px] text-white">{CATEGORIES.length - hidden.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-line bg-white p-3 shadow-lift">
          <p className="mb-2 text-[12px] font-bold text-ink-soft uppercase tracking-wider">{t('calendar.filter_title')}</p>
          {CATEGORIES.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-ink hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-primary-600"
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
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs">
      <div className="grid grid-cols-7 border-b border-line bg-slate-50/80">
        {cells.slice(0, 7).map((d) => (
          <p key={d} className="py-2 text-center text-[12px] font-bold text-ink-soft uppercase">{weekdayShort(d, locale)}</p>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const counts = byDay.get(d) ?? {};
          const cats = CATEGORIES.filter((c) => !hidden.includes(c) && counts[c]);
          const total = cats.reduce((s, c) => s + (counts[c] ?? 0), 0);
          const isCurrentDay = d === today;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPick(d)}
              className={cx(
                'flex min-h-[88px] flex-col items-start gap-1 border-b border-l border-line/60 p-2 text-left hover:bg-slate-50 transition-colors',
                d.slice(0, 7) !== month && 'bg-slate-50/40 text-ink-soft/60',
                isCurrentDay && 'bg-primary-50/20',
              )}
            >
              {isCurrentDay ? (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-[12px] font-bold text-white">
                  {Number(d.slice(8))}
                </span>
              ) : (
                <span className="text-[13px] font-semibold text-ink">{Number(d.slice(8))}</span>
              )}
              {total > 0 && (
                <span className="mt-auto flex flex-wrap items-center gap-1">
                  {cats.map((c) => <span key={c} className={cx('h-2 w-2 rounded-full', WEEK_CATEGORY_STYLES[c].dot)} aria-hidden />)}
                  <span className="text-[11px] font-medium text-ink-soft">{t('calendar.month_more', { n: total })}</span>
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
    <Modal title={event.title} onClose={onClose} className="max-w-md">
      <div className="space-y-3 text-[14px] text-ink">
        <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3">
          <Icon className="h-5 w-5 text-primary-700" aria-hidden />
          <div>
            <p className="font-bold text-ink">{t(`calendar.cat.${event.category}`)}</p>
            <p className="text-[12.5px] text-ink-soft">
              {rangeLabel(event.startsAt.slice(0, 10), event.startsAt.slice(0, 10), locale)} · <b className="text-ink">{event.startsAt.slice(11, 16)} – {event.endsAt.slice(11, 16)}</b>
            </p>
          </div>
        </div>

        {event.note && (
          <div className="rounded-xl border border-line p-3">
            <p className="text-[12px] font-bold text-ink-soft uppercase tracking-wider mb-1">Ghi chú</p>
            <p className="text-[13.5px] leading-relaxed text-ink">{event.note}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-[12.5px] text-ink-soft px-1">
          <span>Nguồn: {t(`calendar.source.${event.source}`)}</span>
          {event.source === 'agent' && (
            <span className="inline-flex items-center gap-1 font-bold text-primary-700">
              <Sparkles className="h-3.5 w-3.5" /> AI đề xuất
            </span>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="mt-5 flex flex-wrap justify-end gap-2.5 border-t border-line pt-3">
          <Button
            size="sm"
            variant="danger"
            icon={Trash2}
            disabled={remove.isPending}
            onClick={() => remove.mutate(event.id, { onSuccess: onClose })}
          >
            {t('calendar.event.delete')}
          </Button>
          <Button
            size="sm"
            icon={Check}
            disabled={update.isPending}
            onClick={() => update.mutate({ id: event.id, done: !event.done }, { onSuccess: onClose })}
          >
            {event.done ? t('calendar.event.mark_undone') : t('calendar.event.mark_done')}
          </Button>
        </div>
      )}
    </Modal>
  );
}

