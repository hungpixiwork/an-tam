import { describe, expect, it } from 'vitest';
import { autoSchedule, freeSlots } from '../shared/engine/scheduler';

describe('scheduler — khung trống & tự xếp lịch', () => {
  it('trừ sự kiện đã có, bỏ khung quá ngắn và giờ đã qua', () => {
    const events = [
      { startsAt: '2026-09-28T08:00', endsAt: '2026-09-28T09:00' },
      { startsAt: '2026-09-28T09:15', endsAt: '2026-09-28T12:00' },
    ];
    expect(freeSlots(['2026-09-28'], events, { dayStart: '07:00', dayEnd: '14:00', minMinutes: 30 })).toEqual([
      { date: '2026-09-28', start: '07:00', end: '08:00' },
      { date: '2026-09-28', start: '12:00', end: '14:00' },
    ]);
    expect(freeSlots(['2026-09-28'], events, { dayEnd: '14:00', notBefore: '2026-09-28T12:10' })).toEqual([{ date: '2026-09-28', start: '12:30', end: '14:00' }]);
  });

  it('nhắc hóa đơn trước 2 ngày lúc 9:00, không trùng lịch, không tạo lại đề xuất đang chờ', () => {
    const state = {
      now: '2026-09-28T08:00',
      events: [
        { title: 'Đóng phí thẻ tín dụng', category: 'personal' as const, startsAt: '2026-10-02T08:00', endsAt: '2026-10-02T09:00' },
        { title: 'Họp', category: 'work' as const, startsAt: '2026-09-30T09:00', endsAt: '2026-09-30T10:00' },
      ],
      bills: [], goals: [], focusSkill: '', skillHoursPerWeek: 0,
      rules: { weekly_review: false, bill_reminder: true, skill_block: false, freelance_followup: false },
      pendingKeys: [],
    };
    const [p] = autoSchedule(state);
    expect(p.title).toBe('Thêm lịch đóng phí thẻ tín dụng');
    expect(p.events).toEqual([{ title: 'Nhắc: đóng phí thẻ tín dụng', category: 'finance', startsAt: '2026-09-30T08:30', endsAt: '2026-09-30T09:00' }]); // 9:00 bận → khung gần nhất (ưu tiên sớm hơn)
    expect(autoSchedule({ ...state, pendingKeys: [p.key] })).toEqual([]);
  });
});
