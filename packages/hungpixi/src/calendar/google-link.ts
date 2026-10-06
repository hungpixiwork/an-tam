export interface CalendarEventPayload {
  title: string;
  description?: string;
  location?: string;
  startsAt: string; // ISO string '2026-10-15T09:00:00+07:00'
  durationMinutes?: number;
}

/**
 * Định dạng chuỗi ISO sang UTC format dạng 'YYYYMMDDTHHmmssZ' cho Google Calendar
 */
function toGoogleTime(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Sinh link 1-chạm thêm sự kiện vào Google Calendar trên điện thoại/máy tính mà không cần OAuth token.
 */
export function createGoogleCalendarLink(event: CalendarEventPayload): string {
  const start = new Date(event.startsAt);
  const duration = event.durationMinutes || 60;
  const end = new Date(start.getTime() + duration * 60_000);

  const dates = `${toGoogleTime(start.toISOString())}/${toGoogleTime(end.toISOString())}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates,
    details: event.description || 'Tạo bởi An Tâm AI Agent',
  });

  if (event.location) {
    params.set('location', event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export const FINANCIAL_REMINDER_TEMPLATES = {
  CREDIT_CARD_DUE: (cardName: string, amount: number, dueDate: string): CalendarEventPayload => ({
    title: `[An Tâm AI] Hạn thanh toán ${cardName}`,
    description: `Thanh toán số dư để tránh phí phạt và lãi suất cao. Số tiền cần trả: ${amount.toLocaleString('vi-VN')} đ`,
    startsAt: `${dueDate}T09:00:00+07:00`,
    durationMinutes: 30,
  }),
  QUARTERLY_CHECKUP: (date: string): CalendarEventPayload => ({
    title: '[An Tâm AI] Checkup tài chính quý (30 phút)',
    description: 'Thảnh thơi nhìn lại dòng tiền, kiểm tra quỹ an toàn và điều chỉnh danh mục.',
    startsAt: `${date}T10:00:00+07:00`,
    durationMinutes: 30,
  }),
  SAVINGS_TOPUP: (targetMonth: string, amount: number): CalendarEventPayload => ({
    title: '[An Tâm AI] Nạp quỹ dự phòng an toàn định kỳ',
    description: `Góp ${amount.toLocaleString('vi-VN')} đ vào tài khoản tiết kiệm an toàn.`,
    startsAt: `${targetMonth}-05T08:30:00+07:00`,
    durationMinutes: 15,
  }),
};
