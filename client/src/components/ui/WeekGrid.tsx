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
  onSlotClick?: (date: string, hour: number) => void;
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

/** Lịch tuần chuẩn Google Calendar: week strip với badge ngày hôm nay, vạch chỉ giờ hiện tại đỏ, event góc bo nhẹ. */
export function WeekGrid({
  days,
  events,
  startHour = 7,
  endHour = 22,
  categoryStyles,
  onEventClick,
  onSlotClick,
  legend,
  hourHeight = 48,
  todayIndex,
  ariaLabel,
  className,
}: WeekGridProps) {
  const styles: Record<string, WeekCategoryStyle> = { ...WEEK_CATEGORY_STYLES, ...(categoryStyles as Record<string, WeekCategoryStyle>) };
  const hours = Array.from({ length: Math.max(1, endHour - startHour) + 1 }, (_, i) => startHour + i);
  const bodyHeight = (endHour - startHour) * hourHeight;
  const rangeStart = startHour * 60;
  const rangeEnd = endHour * 60;
  const isToday = (i: number) => days[i]?.isToday ?? i === todayIndex;
  const cols = `44px repeat(${days.length}, minmax(88px, 1fr))`;

  // Tính giờ hiện tại theo giờ Việt Nam
  const now = new Date(Date.now() + 7 * 3_600_000);
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const showCurrentTime = currentMinutes >= rangeStart && currentMinutes <= rangeEnd;
  const currentTimeTop = ((currentMinutes - rangeStart) / 60) * hourHeight + 6;

  return (
    <div className={cx('min-w-0 select-none', className)}>
      <div className="overflow-x-auto rounded-xl border border-line/80 bg-white" role="region" aria-label={ariaLabel} tabIndex={0}>
        <div style={{ minWidth: 44 + days.length * 88 }}>
          {/* Header ngày / Week Strip */}
          <div className="sticky top-0 z-10 grid border-b border-line bg-white/95 backdrop-blur-none" style={{ gridTemplateColumns: cols }}>
            <div className="flex items-center justify-center text-[10px] font-semibold text-ink-mute">GMT+7</div>
            {days.map((d, i) => {
              const active = isToday(i);
              const dayNum = d.date.slice(8, 10);
              return (
                <div key={d.date} className={cx('border-l border-line/60 py-2 text-center', active && 'bg-primary-50/30')} aria-current={active ? 'date' : undefined}>
                  <p className={cx('text-[11px] font-bold uppercase tracking-wider', active ? 'text-primary-700' : 'text-ink-soft')}>
                    {d.label}
                  </p>
                  <div className="mt-0.5 flex justify-center">
                    {active ? (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-700 text-[14px] font-bold text-white shadow-sm">
                        {Number(dayNum)}
                      </span>
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center text-[14px] font-semibold text-ink">
                        {Number(dayNum)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Thân lưới */}
          <div className="relative grid bg-white" style={{ gridTemplateColumns: cols, height: bodyHeight + 12 }}>
            {/* Cột giờ */}
            <div className="relative">
              {hours.map((h, i) => (
                <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] font-medium text-ink-mute tabular-nums" style={{ top: i * hourHeight + 6 }}>
                  {pad(h)}:00
                </span>
              ))}
            </div>

            {/* Các cột ngày */}
            {days.map((d, di) => {
              const dayEvents = events.filter((e) => e.dayIndex === di);
              const lanes = layoutDayEvents(dayEvents);
              const active = isToday(di);

              return (
                <div key={d.date} className={cx('relative border-l border-line/60', active && 'bg-primary-50/15')}>
                  {/* Đường kẻ giờ ngang */}
                  {hours.map((h, i) => (
                    <button
                      key={h}
                      type="button"
                      tabIndex={-1}
                      onClick={() => onSlotClick?.(d.date, h)}
                      aria-label={`Thêm lịch ngày ${d.date} lúc ${h}:00`}
                      className="absolute inset-x-0 border-t border-line/50 hover:bg-slate-50/60 transition-colors"
                      style={{ top: i * hourHeight + 6, height: hourHeight }}
                    />
                  ))}

                  {/* Vạch chỉ giờ hiện tại */}
                  {active && showCurrentTime && (
                    <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: currentTimeTop }}>
                      <span className="h-2.5 w-2.5 -ml-1 rounded-full bg-danger-500 shadow-sm" />
                      <span className="h-[2px] flex-1 bg-danger-500" />
                    </div>
                  )}

                  {/* Sự kiện trong ngày */}
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
                    const compact = height < 36;
                    const tight = height < 54;

                    const content = (
                      <div className="flex h-full flex-col justify-between overflow-hidden">
                        <span className="flex min-w-0 items-start gap-1 font-semibold leading-tight text-ink">
                          {Icon && <Icon className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />}
                          <span className={cx('min-w-0 text-[11.5px]', compact ? 'truncate' : tight ? 'line-clamp-1' : 'line-clamp-2')}>
                            {ev.title}
                          </span>
                        </span>
                        {!compact && <span className="mt-0.5 block text-[10.5px] font-medium text-ink-soft tabular-nums">{ev.start} – {ev.end}</span>}
                      </div>
                    );

                    const cls = cx('absolute z-10 overflow-hidden rounded-md border-l-[3.5px] px-1.5 py-1 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-transform active:scale-[0.98]', st.block);
                    const pos = { top, height, left: `calc(${(lane / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)` };

                    return onEventClick ? (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(ev);
                        }}
                        aria-label={label}
                        className={cx(cls, 'hover:brightness-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600')}
                        style={pos}
                      >
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
