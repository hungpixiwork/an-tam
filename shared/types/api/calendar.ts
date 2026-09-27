// Lịch AI — sự kiện lịch (màn Tổng quan dùng "hôm nay", màn Lịch AI mở rộng theo tuần).

export type CalendarCategory = 'finance' | 'skill' | 'work' | 'rest' | 'personal';
export type CalendarSource = 'local' | 'google' | 'agent';

export interface CalendarEvent {
  id: string;
  title: string;
  note: string;
  category: CalendarCategory;
  /** Giờ Việt Nam 'YYYY-MM-DDTHH:MM'. */
  startsAt: string;
  endsAt: string;
  source: CalendarSource;
  done: boolean;
}

export interface CalendarEventInput {
  title: string;
  note?: string;
  category: CalendarCategory;
  startsAt: string;
  endsAt: string;
}
