import { expect, test } from 'vitest';
import { formatDuration, formatMonth, formatPct, formatVnd } from '../shared/format';

test('formatVnd', () => {
  expect(formatVnd(1_240_000_000)).toBe('1,24 tỷ');
  expect(formatVnd(1_000_000_000)).toBe('1 tỷ');
  expect(formatVnd(1_000_000_000, { axis: true })).toBe('1,0 tỷ');
  expect(formatVnd(180_000_000)).toBe('180 triệu');
  expect(formatVnd(18_000_000, { sign: true })).toBe('+18 triệu');
  expect(formatVnd(3_500_000)).toBe('3,5 triệu');
  expect(formatVnd(-230_000_000)).toBe('-230 triệu');
  expect(formatVnd(850_000)).toBe('850 nghìn');
  expect(formatVnd(20_000_000_000)).toBe('20 tỷ');
  expect(formatVnd(10_000_000)).toBe('10 triệu');
});

test('formatPct / formatMonth / formatDuration', () => {
  expect(formatPct(0.061)).toBe('6%');
  expect(formatPct(0.5)).toBe('50%');
  expect(formatPct(1)).toBe('100%');
  expect(formatPct(-0.015, 1)).toBe('-1,5%');
  expect(formatMonth('2030-08')).toBe('Tháng 8/2030');
  expect(formatDuration(59)).toBe('4 năm 11 tháng');
  expect(formatDuration(8)).toBe('8 tháng');
});
