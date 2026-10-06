import { describe, it, expect } from 'vitest';
import {
  calculatePeaceScore,
  calculateHumanCapital,
  calculateRunway,
  parseVietnameseTransaction,
  createGoogleCalendarLink,
  getOpenAITools,
  getAnthropicTools,
  createAnTamTools,
  analyzeSpendingIntent,
} from '../src/index';

describe('antam-ai (Hung Pixi SDK) Unit Tests', () => {
  it('1. Tính đúng Điểm An Tâm (Peace Score)', () => {
    const res = calculatePeaceScore({
      cash: 60_000_000,
      essentialMonthlyExpense: 10_000_000,
      targetMonths: 6,
      goalCompletionAverage: 0.5,
      volatileAssetsRatio: 0.3,
      postDebtSavingsRatio: 0.2,
    });
    expect(res.total).toBe(85);
    expect(res.level).toBe('stable');
    expect(res.factors.emergency.score).toBe(30);
  });

  it('2. Tính đúng Vốn con người & Runway', () => {
    const hc = calculateHumanCapital(25_000_000, 30, 60, 'technology');
    expect(hc).toBeGreaterThan(5_000_000_000);

    const runway = calculateRunway(90_000_000, 15_000_000);
    expect(runway).toBe(6);
  });

  it('3. Bóc tách câu lệnh tiếng Việt tự nhiên (NLP)', () => {
    const t1 = parseVietnameseTransaction('Ăn phở bún bò 45k');
    expect(t1).not.toBeNull();
    expect(t1?.amount).toBe(45000);
    expect(t1?.category).toBe('food');
    expect(t1?.kind).toBe('expense');

    const t2 = parseVietnameseTransaction('Nhận lương tháng này 25 triệu');
    expect(t2).not.toBeNull();
    expect(t2?.amount).toBe(25000000);
    expect(t2?.kind).toBe('income');
    expect(t2?.category).toBe('salary');

    const t3 = parseVietnameseTransaction('Đổ xăng 80k thiết yếu');
    expect(t3?.valueTag).toBe('essential');
  });

  it('4. Phân tích ý định chi tiêu (Spending Intent)', () => {
    const summary = analyzeSpendingIntent([
      { id: '1', amount: 5000000, category: 'housing', kind: 'expense', occurredOn: '2026-10-01', valueTag: 'essential' },
      { id: '2', amount: 2000000, category: 'education', kind: 'expense', occurredOn: '2026-10-02', valueTag: 'growth' },
      { id: '3', amount: 500000, category: 'shopping', kind: 'expense', occurredOn: '2026-10-03', valueTag: 'regret' },
    ]);
    expect(summary.totalExpense).toBe(7500000);
    expect(summary.topTag).toBe('essential');
    expect(summary.healthScore).toBeGreaterThan(60);
  });

  it('5. Tạo link Google Calendar 1-chạm chuẩn xác', () => {
    const url = createGoogleCalendarLink({
      title: 'Hạn nợ thẻ',
      startsAt: '2026-10-15T09:00:00+07:00',
      durationMinutes: 30,
    });
    expect(url).toContain('calendar.google.com');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('H%E1%BA%A1n+n%E1%BB%A3+th%E1%BA%BB');
  });

  it('6. Cung cấp đầy đủ Multi-Agent Tools schema', () => {
    const openAITools = getOpenAITools();
    expect(openAITools.length).toBeGreaterThanOrEqual(4);
    expect(openAITools[0].type).toBe('function');

    const anthropicTools = getAnthropicTools();
    expect(anthropicTools.length).toBeGreaterThanOrEqual(4);
    expect(anthropicTools[0].input_schema).toBeDefined();

    const aiSdkTools = createAnTamTools({ apiKey: 'test_token' });
    expect(aiSdkTools.anTamOverview).toBeDefined();
    expect(aiSdkTools.anTamLedger).toBeDefined();
  });
});
