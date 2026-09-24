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
