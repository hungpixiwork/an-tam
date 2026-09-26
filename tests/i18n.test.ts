import { describe, expect, it } from 'vitest';
import { t } from '../shared/i18n';
import { formatCurrency, formatMonthLocale, formatDurationLocale } from '../shared/format';

describe('i18n core', () => {
  it('t returns translations for each locale', () => {
    expect(t('vi', 'nav.overview')).toBe('Tổng quan');
    expect(t('en', 'nav.overview')).toBe('Overview');
    expect(t('zh', 'nav.overview')).toBe('财务概览');
  });

  it('t handles variable substitution', () => {
    expect(t('vi', 'home.greeting', { name: 'Hung' })).toBe('Chào bạn Hung');
    expect(t('en', 'home.greeting', { name: 'Hung' })).toBe('Hello Hung');
    expect(t('zh', 'home.greeting', { name: 'Hung' })).toBe('你好 Hung');
  });

  it('t returns key as fallback if missing', () => {
    expect(t('vi', 'missing.key')).toBe('missing.key');
  });
});

describe('i18n formatting', () => {
  it('formatCurrency', () => {
    expect(formatCurrency(10000000, 'VND')).toBe('10 triệu');
    expect(formatCurrency(10000, 'CNY')).toBe('1万');
    expect(formatCurrency(10000, 'USD')).toBe('$10,000');
  });

  it('formatMonthLocale', () => {
    expect(formatMonthLocale('2026-09', 'vi')).toBe('Tháng 9/2026');
    expect(formatMonthLocale('2026-09', 'en')).toBe('Sep 2026');
    expect(formatMonthLocale('2026-09', 'zh')).toBe('2026年9月');
  });

  it('formatDurationLocale', () => {
    expect(formatDurationLocale(54, 'vi')).toBe('4 năm 6 tháng');
    expect(formatDurationLocale(54, 'en')).toBe('4 years 6 months');
    expect(formatDurationLocale(54, 'zh')).toBe('4年6个月');
  });
});
