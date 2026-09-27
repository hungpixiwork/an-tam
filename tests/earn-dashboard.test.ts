import { describe, expect, it } from 'vitest';
import { incomeSources, learningWeek, opportunityFit } from '../shared/engine/earnDashboard';
import { exposureLevelFor } from '../shared/engine/humanCapital';
import type { SkillItem } from '../shared/types/api';

const skill = (over: Partial<SkillItem>): SkillItem => ({
  id: 's', name: 'Phân tích dữ liệu', tag: 'data', stage: 'foundation', status: 'learning', monthsMin: 1, monthsMax: 3, hoursPerWeek: 2, progress: 0, ...over,
});

describe('trang Tăng thu nhập', () => {
  it('gộp nguồn thu: lương + thưởng, làm thêm + kinh doanh, đầu tư', () => {
    const r = incomeSources([
      { category: 'salary', amount: 20_000_000 }, { category: 'bonus', amount: 2_000_000 },
      { category: 'freelance', amount: 3_000_000 }, { category: 'business', amount: 1_000_000 },
      { category: 'invest_income', amount: 2_500_000 },
    ]);
    expect(r.total).toBe(28_500_000);
    expect(r.sources).toEqual([{ key: 'salary', amount: 22_000_000 }, { key: 'side', amount: 4_000_000 }, { key: 'invest', amount: 2_500_000 }]);
  });

  it('kế hoạch 7 ngày từ hôm qua: trạng thái + giờ đã học; mức phù hợp theo kỹ năng; bảng ILO', () => {
    const w = learningWeek('2026-09-28', [
      { id: 'a', title: 'Excel nâng cao', note: 'Phân tích dữ liệu', startsAt: '2026-09-27T20:00', endsAt: '2026-09-27T22:00', done: true },
      { id: 'b', title: 'SQL', note: '', startsAt: '2026-09-28T20:00', endsAt: '2026-09-28T21:30', done: false },
      { id: 'c', title: 'Dự án', note: '', startsAt: '2026-09-30T20:00', endsAt: '2026-09-30T21:00', done: false },
    ], [skill({})]);
    expect(w.days.map((d) => d.status)).toEqual(['done', 'today', 'free', 'planned', 'free', 'free', 'free']);
    expect(w.doneHours).toBe(2);
    expect(w.plannedHours).toBe(4.5);
    expect(opportunityFit('data', [skill({ progress: 60 })])).toBe('high');
    expect(opportunityFit('data', [skill({ progress: 10 })])).toBe('medium');
    expect(opportunityFit('nocode', [skill({})])).toBe('low');
    expect(exposureLevelFor('4110')).toBe(4);
    expect(exposureLevelFor('2511')).toBe(2);
    expect(exposureLevelFor(undefined)).toBe(2);
  });
});
