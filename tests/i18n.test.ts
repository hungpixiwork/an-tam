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

describe('i18n key parity', () => {
  it('all locales have matching key sets', async () => {
    const { default: vi } = await import('../shared/i18n/vi');
    const { default: en } = await import('../shared/i18n/en');
    const { default: zh } = await import('../shared/i18n/zh');

    const viKeys = Object.keys(vi).sort();
    const enKeys = Object.keys(en).sort();
    const zhKeys = Object.keys(zh).sort();

    const missingInEn = viKeys.filter((k) => !enKeys.includes(k));
    const missingInZh = viKeys.filter((k) => !zhKeys.includes(k));
    const extraInEn = enKeys.filter((k) => !viKeys.includes(k));
    const extraInZh = zhKeys.filter((k) => !viKeys.includes(k));

    expect(missingInEn, `Missing in EN: ${missingInEn.join(', ')}`).toEqual([]);
    expect(missingInZh, `Missing in ZH: ${missingInZh.join(', ')}`).toEqual([]);
    expect(extraInEn, `Extra in EN: ${extraInEn.join(', ')}`).toEqual([]);
    expect(extraInZh, `Extra in ZH: ${extraInZh.join(', ')}`).toEqual([]);
  });

  it('translates spending tags correctly', () => {
    expect(t('vi', 'spending.tag.essential')).toBe('Thiết yếu');
    expect(t('en', 'spending.tag.essential')).toBe('Essential');
    expect(t('zh', 'spending.tag.essential')).toBe('生活必需');

    expect(t('vi', 'spending.tag.regret')).toBe('Không đáng');
    expect(t('en', 'spending.tag.regret')).toBe('Regret / Waste');
    expect(t('zh', 'spending.tag.regret')).toBe('冲动浪费');
  });

  it('translates ledger and earn keys correctly', () => {
    expect(t('vi', 'ledger.quick_title')).toBe('Ghi nhanh một khoản');
    expect(t('en', 'ledger.quick_title')).toBe('Quick Record');
    expect(t('zh', 'ledger.quick_title')).toBe('记一笔');

    expect(t('vi', 'earn.hero_eyebrow')).toBe('Tăng thu nhập');
    expect(t('en', 'earn.hero_eyebrow')).toBe('Income Growth');
    expect(t('zh', 'earn.hero_eyebrow')).toBe('增收进阶');
  });
});
