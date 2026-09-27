import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './core';

/* ───────── Lưới lịch tuần ───────── */

export type WeekCategory = 'finance' | 'skill' | 'work' | 'rest' | 'personal';

export interface WeekCategoryStyle {
  /** Class nền + viền trái + chữ của khối sự kiện. */
  block: string;
  /** Class màu chấm chú giải / icon. */
  dot: string;
}

/** Màu mặc định theo loại (mockup Lịch AI): tài chính xanh lá, kỹ năng tím, công việc xanh dương, nghỉ ngơi hồng, cá nhân vàng. */
export const WEEK_CATEGORY_STYLES: Record<WeekCategory, WeekCategoryStyle> = {
  finance: { block: 'bg-success-50 border-success-500 text-success-600', dot: 'bg-success-500' },
  skill: { block: 'bg-violet-50 border-violet-500 text-violet-600', dot: 'bg-violet-500' },
  work: { block: 'bg-accent-50 border-accent-500 text-accent-700', dot: 'bg-accent-500' },
  rest: { block: 'bg-rose-50 border-rose-500 text-rose-600', dot: 'bg-rose-500' },
  personal: { block: 'bg-amber-50 border-amber-500 text-amber-600', dot: 'bg-amber-500' },
};

export interface WeekDay {
  /** YYYY-MM-DD. */
  date: string;
  /** Nhãn cột, ví dụ "Th 2". */
  label: ReactNode;
  /** Dòng phụ, ví dụ "23/09". */
  sub?: ReactNode;
  isToday?: boolean;
}

export interface WeekEvent {
  id: string;
  dayIndex: number;
  /** 'HH:MM' (24h). */
  start: string;
  end: string;
  title: ReactNode;
  category: WeekCategory | (string & {});
  icon?: LucideIcon;
  /** Nhãn đọc cho trình đọc màn hình (mặc định ghép từ title nếu là chuỗi). */
  ariaLabel?: string;
}

export interface WeekGridProps {
  days: WeekDay[];
  events: WeekEvent[];
  startHour?: number;
  endHour?: number;
  /** Ghi đè/bổ sung màu theo loại. */
  categoryStyles?: Partial<Record<string, WeekCategoryStyle>>;
  onEventClick?: (event: WeekEvent) => void;
  /** Chú giải dưới lưới. */
  legend?: { category: string; label: ReactNode }[];
  /** Chiều cao 1 giờ (px). */
  hourHeight?: number;
  /** Cột hôm nay (nếu không đánh dấu isToday trên day). */
  todayIndex?: number;
  ariaLabel?: string;
  className?: string;
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

/** Chia làn cho các sự kiện chồng giờ trong cùng ngày: trả về {lane, lanes} theo id. */
export function layoutDayEvents(events: WeekEvent[]): Map<string, { lane: number; lanes: number }> {
  const sorted = [...events].sort((a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(b.end) - toMinutes(a.end));
  const out = new Map<string, { lane: number; lanes: number }>();
  let cluster: { ev: WeekEvent; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, laneEnds.length);
    cluster.forEach(({ ev, lane }) => out.set(ev.id, { lane, lanes }));
    cluster = [];
    laneEnds = [];
  };
  for (const ev of sorted) {
    const s = toMinutes(ev.start);
    const e = Math.max(s + 15, toMinutes(ev.end));
    if (s >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(e);
    } else laneEnds[lane] = e;
    cluster.push({ ev, lane });
    clusterEnd = Math.max(clusterEnd, e);
  }
  flush();
  return out;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Lịch tuần với khối sự kiện định vị tuyệt đối, tô màu theo loại, cột hôm nay nổi bật; cuộn ngang trên màn nhỏ. */
export function WeekGrid({ days, events, startHour = 7, endHour = 22, categoryStyles, onEventClick, legend, hourHeight = 48, todayIndex, ariaLabel, className }: WeekGridProps) {
  const styles: Record<string, WeekCategoryStyle> = { ...WEEK_CATEGORY_STYLES, ...(categoryStyles as Record<string, WeekCategoryStyle>) };
  const hours = Array.from({ length: Math.max(1, endHour - startHour) + 1 }, (_, i) => startHour + i);
  const bodyHeight = (endHour - startHour) * hourHeight;
  const rangeStart = startHour * 60;
  const rangeEnd = endHour * 60;
  const isToday = (i: number) => days[i]?.isToday ?? i === todayIndex;
  const cols = `56px repeat(${days.length}, minmax(96px, 1fr))`;

  return (
    <div className={cx('min-w-0', className)}>
      <div className="overflow-x-auto rounded-xl border border-line" role="region" aria-label={ariaLabel} tabIndex={0}>
        <div style={{ minWidth: 56 + days.length * 96 }}>
          {/* Header ngày */}
          <div className="grid border-b border-line bg-white" style={{ gridTemplateColumns: cols }}>
            <div />
            {days.map((d, i) => (
              <div key={d.date} className={cx('border-l border-line px-1 py-2 text-center', isToday(i) && 'bg-accent-50')} aria-current={isToday(i) ? 'date' : undefined}>
                <p className={cx('text-[13px] font-bold', isToday(i) ? 'text-accent-600' : 'text-ink')}>{d.label}</p>
                {d.sub && <p className={cx('text-[12px]', isToday(i) ? 'text-accent-600' : 'text-ink-soft')}>{d.sub}</p>}
              </div>
            ))}
          </div>

          {/* Thân lưới */}
          <div className="relative grid bg-white" style={{ gridTemplateColumns: cols, height: bodyHeight + 12 }}>
            {/* Cột giờ */}
            <div className="relative">
              {hours.map((h, i) => (
                <span key={h} className="absolute right-2 -translate-y-1/2 text-[11.5px] text-ink-soft tabular-nums" style={{ top: i * hourHeight + 6 }}>
                  {pad(h)}:00
                </span>
              ))}
            </div>
            {days.map((d, di) => {
              const dayEvents = events.filter((e) => e.dayIndex === di);
              const lanes = layoutDayEvents(dayEvents);
              return (
                <div key={d.date} className={cx('relative border-l border-line', isToday(di) && 'bg-accent-50/50')}>
                  {hours.map((h, i) => (
                    <span key={h} className="absolute inset-x-0 border-t border-dashed border-line" style={{ top: i * hourHeight + 6 }} aria-hidden />
                  ))}
                  {dayEvents.map((ev) => {
                    const s = Math.max(rangeStart, toMinutes(ev.start));
                    const e = Math.min(rangeEnd, Math.max(toMinutes(ev.end), s + 15));
                    if (e <= rangeStart || s >= rangeEnd) return null;
                    const top = ((s - rangeStart) / 60) * hourHeight + 6;
                    const height = Math.max(22, ((e - s) / 60) * hourHeight - 3);
                    const { lane, lanes: n } = lanes.get(ev.id) ?? { lane: 0, lanes: 1 };
                    const st = styles[ev.category] ?? WEEK_CATEGORY_STYLES.work;
                    const Icon = ev.icon;
                    const label = ev.ariaLabel ?? `${typeof ev.title === 'string' ? ev.title : ''} ${ev.start}–${ev.end}`;
                    const compact = height < 40;
                    const content = (
                      <>
                        <span className="flex min-w-0 items-start gap-1 font-semibold leading-tight text-ink">
                          {Icon && <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />}
                          <span className={cx('min-w-0', compact ? 'truncate' : 'line-clamp-2')}>{ev.title}</span>
                        </span>
                        {!compact && <span className="mt-0.5 block text-[11px] text-ink-soft tabular-nums">{ev.start} – {ev.end}</span>}
                      </>
                    );
                    const cls = cx('absolute overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left text-[11.5px] shadow-sm', st.block);
                    const pos = { top, height, left: `calc(${(lane / n) * 100}% + 3px)`, width: `calc(${100 / n}% - 6px)` };
                    return onEventClick ? (
                      <button key={ev.id} type="button" onClick={() => onEventClick(ev)} aria-label={label} className={cx(cls, 'hover:brightness-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600')} style={pos}>
                        {content}
                      </button>
                    ) : (
                      <div key={ev.id} className={cls} style={pos} aria-label={label} role="note">
                        {content}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {legend && legend.length > 0 && (
        <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {legend.map((l) => (
            <li key={l.category} className="flex items-center gap-2 text-[12.5px] text-ink">
              <span className={cx('h-2.5 w-2.5 rounded-full', (styles[l.category] ?? WEEK_CATEGORY_STYLES.work).dot)} aria-hidden />
              {l.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
