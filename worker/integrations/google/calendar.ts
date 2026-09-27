// Google Calendar API v3 — đọc lịch chính (chỉ đọc) và ghi vào lịch phụ "An Tâm" do ứng dụng tạo.

import type { CalendarCategory } from '../../../shared/types/api';
import { ApiError } from '../../lib/http';

const BASE = 'https://www.googleapis.com/calendar/v3';
export const TZ = 'Asia/Ho_Chi_Minh';
export const APP_CALENDAR_NAME = 'An Tâm';

async function gcal<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (res.status === 401) throw new ApiError(409, 'reconnect_required', 'Phiên Google đã hết hạn, vui lòng kết nối lại');
  if (res.status === 403) throw new ApiError(403, 'google_forbidden', 'Google chưa cấp đủ quyền cho lịch này');
  if (!res.ok) throw new ApiError(502, 'google_error', `Google Calendar trả lỗi (${res.status})`);
  return (res.status === 204 ? null : await res.json()) as T;
}

interface GEventTime { dateTime?: string; date?: string }
interface GEvent { id: string; status?: string; summary?: string; description?: string; start: GEventTime; end: GEventTime }

export interface PulledEvent { googleId: string; title: string; startsAt: string; endsAt: string; category: CalendarCategory }

/** '2026-09-22T08:00:00+07:00' / '2026-09-22' → giờ Việt Nam 'YYYY-MM-DDTHH:MM'. */
export function toVnLocal(t: GEventTime, fallback: string): string {
  if (t.dateTime) return new Date(Date.parse(t.dateTime) + 7 * 3_600_000).toISOString().slice(0, 16);
  if (t.date) return `${t.date}T${fallback}`;
  return '';
}

/** Đoán loại từ tiêu đề để tô màu trên lưới tuần. */
export function guessCategory(title: string): CalendarCategory {
  const s = title.toLowerCase();
  if (/(đóng|thanh toán|hóa đơn|chi tiêu|tiền|bank|pay|budget)/.test(s)) return 'finance';
  if (/(học|khóa|course|class|đọc sách|study)/.test(s)) return 'skill';
  if (/(gym|chạy|yoga|nghỉ|gia đình|phim|ăn tối|family|run)/.test(s)) return 'rest';
  if (/(mục tiêu|cá nhân|goal)/.test(s)) return 'personal';
  return 'work';
}

/** Sự kiện của lịch chính trong khoảng [fromDay, toDay) — giờ Việt Nam. */
export async function listPrimaryEvents(token: string, fromDay: string, toDay: string): Promise<PulledEvent[]> {
  const q = new URLSearchParams({
    timeMin: `${fromDay}T00:00:00+07:00`,
    timeMax: `${toDay}T00:00:00+07:00`,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
    timeZone: TZ,
  });
  const data = await gcal<{ items?: GEvent[] }>(token, `/calendars/primary/events?${q}`);
  return (data.items ?? [])
    .filter((e) => e.status !== 'cancelled')
    .map((e) => {
      const title = (e.summary ?? '(Không có tiêu đề)').slice(0, 80);
      return { googleId: e.id, title, startsAt: toVnLocal(e.start, '07:00'), endsAt: toVnLocal(e.end, '07:30'), category: guessCategory(title) };
    })
    .filter((e) => e.startsAt && e.endsAt > e.startsAt);
}

/** Tạo lịch phụ "An Tâm" (scope calendar.app.created) — trả id lịch. */
export async function createAppCalendar(token: string): Promise<string> {
  const cal = await gcal<{ id: string }>(token, '/calendars', { method: 'POST', body: JSON.stringify({ summary: APP_CALENDAR_NAME, description: 'Lịch do An Tâm AI tạo sau khi bạn phê duyệt', timeZone: TZ }) });
  return cal.id;
}

/** Kiểm tra lịch phụ còn tồn tại (người dùng có thể đã xóa trên Google). */
export async function appCalendarExists(token: string, calendarId: string): Promise<boolean> {
  try {
    await gcal(token, `/calendars/${encodeURIComponent(calendarId)}`);
    return true;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 502)) return false;
    throw err;
  }
}

export async function insertAppEvent(token: string, calendarId: string, ev: { title: string; note: string; startsAt: string; endsAt: string }): Promise<string> {
  const created = await gcal<{ id: string }>(token, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify({
      summary: ev.title,
      description: ev.note ? `${ev.note}\n— An Tâm AI` : '— An Tâm AI',
      start: { dateTime: `${ev.startsAt}:00`, timeZone: TZ },
      end: { dateTime: `${ev.endsAt}:00`, timeZone: TZ },
      reminders: { useDefault: true },
    }),
  });
  return created.id;
}
