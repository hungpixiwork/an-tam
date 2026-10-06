import { describe, expect, it } from 'vitest';
import { formatCompactVND, formatVndFull } from '../shared/format';

describe('formatCompactVND & formatVndFull', () => {
  it('formatCompactVND rút gọn số tiền lớn cho các vùng hiển thị nhỏ', () => {
    expect(formatCompactVND(28_500_000)).toBe('28,5 triệu');
    expect(formatCompactVND(128_500_000)).toBe('128,5 triệu');
    expect(formatCompactVND(2_500_000_000)).toBe('2,5 tỷ');
    expect(formatCompactVND(150_000)).toBe('150 nghìn');
    expect(formatCompactVND(500)).toBe('500 đ');
    expect(formatCompactVND(0)).toBe('0 đ');
  });

  it('formatCompactVND hỗ trợ dấu âm và tùy chọn sign', () => {
    expect(formatCompactVND(-15_000_000)).toBe('-15 triệu');
    expect(formatCompactVND(15_000_000, { sign: true })).toBe('+15 triệu');
  });

  it('formatVndFull format đầy đủ số tiền', () => {
    expect(formatVndFull(28_500_000)).toBe('28.500.000đ');
    expect(formatVndFull(150_000)).toBe('150.000đ');
    expect(formatVndFull(-50_000)).toBe('-50.000đ');
    expect(formatVndFull(50_000, { sign: true })).toBe('+50.000đ');
  });
});
