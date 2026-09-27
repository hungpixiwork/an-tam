// Tiện ích tháng 'YYYY-MM'.

export const monthIndex = (month: string): number => {
  const [y, m] = month.split('-').map(Number);
  return y * 12 + (m - 1);
};

export const monthFromIndex = (index: number): string => {
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
};

export const monthsBetween = (from: string, to: string): number => monthIndex(to) - monthIndex(from);

export const addMonths = (month: string, delta: number): string => monthFromIndex(monthIndex(month) + delta);

export const currentMonth = (date = new Date()): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

/** Giờ Việt Nam (UTC+7) — ngày 'YYYY-MM-DD' của thời điểm `date`. */
export const vnDate = (date = new Date()): string => new Date(date.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

/** Tuần ISO 'YYYY-Www' của ngày 'YYYY-MM-DD'. */
export function isoWeek(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** `count` tuần ISO gần nhất, kết thúc ở tuần chứa `day` (cũ → mới). */
export function recentIsoWeeks(day: string, count: number): string[] {
  const base = new Date(`${day}T00:00:00Z`).getTime();
  return Array.from({ length: count }, (_, i) => isoWeek(new Date(base - (count - 1 - i) * 7 * 86_400_000).toISOString().slice(0, 10)));
}
