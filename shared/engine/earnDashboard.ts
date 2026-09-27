// Trang "Tăng thu nhập & kỹ năng": nguồn thu từ sổ thu chi, cơ hội phù hợp, lộ trình kỹ năng,
// kế hoạch học tuần này (lịch loại 'skill') và các hành động nghề nghiệp gợi ý. Hàm thuần — không đụng DB.

import type {
  CareerActionKey, CareerBand, HumanCapitalResult, IncomeSource, IncomeSourceKey, LearningDay,
  Opportunity, OpportunityFit, RoadmapItem, SkillItem, SkillTag,
} from '../types/api';

/* ───────── Nguồn thu ───────── */

const SOURCE_OF: Record<string, IncomeSourceKey> = {
  salary: 'salary', bonus: 'salary', freelance: 'side', business: 'side', invest_income: 'invest',
};
const SOURCE_ORDER: IncomeSourceKey[] = ['salary', 'side', 'invest', 'other'];

/** Gộp giao dịch thu theo nhóm nguồn (bỏ nhóm bằng 0), theo thứ tự lương → làm thêm → đầu tư → khác. */
export function incomeSources(incomes: { category: string; amount: number }[]): { total: number; sources: IncomeSource[] } {
  const sum = new Map<IncomeSourceKey, number>();
  for (const t of incomes) {
    const key = SOURCE_OF[t.category] ?? 'other';
    sum.set(key, (sum.get(key) ?? 0) + t.amount);
  }
  const sources = SOURCE_ORDER.filter((k) => (sum.get(k) ?? 0) > 0).map((key) => ({ key, amount: sum.get(key)! }));
  return { total: sources.reduce((s, x) => s + x.amount, 0), sources };
}

/* ───────── Cơ hội ───────── */

/** Kỹ năng cùng nhóm đã xong / tiến độ ≥ 50% → phù hợp cao; đang học → phù hợp; chưa có → ít phù hợp. */
export function opportunityFit(tag: SkillTag, skills: SkillItem[]): OpportunityFit {
  const same = skills.filter((s) => s.tag === tag);
  if (same.some((s) => s.status === 'done' || s.progress >= 50)) return 'high';
  return same.length ? 'medium' : 'low';
}

const FIT_RANK: Record<OpportunityFit, number> = { high: 0, medium: 1, low: 2 };

export function rankOpportunities<T extends Omit<Opportunity, 'fit'>>(opps: T[], skills: SkillItem[]): (T & { fit: OpportunityFit })[] {
  return opps
    .map((o, i) => ({ ...o, fit: opportunityFit(o.tag, skills), i }))
    .sort((a, b) => FIT_RANK[a.fit] - FIT_RANK[b.fit] || a.i - b.i)
    .map(({ i: _i, ...o }) => o as T & { fit: OpportunityFit });
}

/** Lộ trình: mỗi kỹ năng kèm thu nhập thêm kỳ vọng từ cơ hội làm thêm cùng nhóm. */
export function roadmap(skills: SkillItem[], freelance: Omit<Opportunity, 'fit'>[]): RoadmapItem[] {
  return skills.map((s) => {
    const o = freelance.find((x) => x.tag === s.tag);
    return { ...s, incomeMin: o?.incomeMin ?? 0, incomeMax: o?.incomeMax ?? 0, source: o?.title ?? null };
  });
}

/* ───────── Kế hoạch học tuần này ───────── */

export interface SkillEvent { id: string; title: string; note: string; startsAt: string; endsAt: string; done: boolean }

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const hoursOf = (e: SkillEvent) => Math.max(0, minutes(e.endsAt.slice(11, 16)) - minutes(e.startsAt.slice(11, 16))) / 60;
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Cửa sổ 7 ngày của kế hoạch học: bắt đầu từ hôm qua (thấy ngay buổi vừa học và các buổi sắp tới). */
export const learningWindowStart = (today: string): string => addDays(today, -1);
export const learningWindowEnd = (today: string): string => addDays(today, 5);

/** Từ khóa nhận nhóm kỹ năng khi tên buổi học không ghi đúng tên kỹ năng. */
const TAG_WORDS: [SkillTag, RegExp][] = [
  ['data', /dữ liệu|excel|sql|power bi|data/],
  ['ai_automation', /\bai\b|tự động/],
  ['nocode', /no-?code|website|webflow|portfolio/],
];

function tagOf(e: SkillEvent, skills: SkillItem[]): SkillTag | null {
  const text = `${e.title} ${e.note}`.toLowerCase();
  return skills.find((s) => text.includes(s.name.toLowerCase()))?.tag ?? TAG_WORDS.find(([, re]) => re.test(text))?.[0] ?? null;
}

/** 7 ngày từ hôm qua; trạng thái mỗi ngày theo buổi học trong lịch. */
export function learningWeek(today: string, events: SkillEvent[], skills: SkillItem[]) {
  const start = learningWindowStart(today);
  let plannedHours = 0;
  let doneHours = 0;
  const days: LearningDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const list = events.filter((e) => e.startsAt.slice(0, 10) === date).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const hours = Math.round(list.reduce((s, e) => s + hoursOf(e), 0) * 10) / 10;
    plannedHours += hours;
    doneHours += list.filter((e) => e.done).reduce((s, e) => s + hoursOf(e), 0);
    const allDone = list.length > 0 && list.every((e) => e.done);
    const status: LearningDay['status'] = !list.length ? 'free' : allDone ? 'done' : date === today ? 'today' : date < today ? 'missed' : 'planned';
    const first = list.find((e) => !e.done) ?? list[0];
    return { date, status, eventId: first?.id ?? null, title: first?.title ?? null, hours, tag: first ? tagOf(first, skills) : null };
  });
  return { days, plannedHours: Math.round(plannedHours * 10) / 10, doneHours: Math.round(doneHours * 10) / 10 };
}

/* ───────── Giá trị nghề nghiệp ───────── */

export const careerBand = (score: number): CareerBand => (score >= 80 ? 'great' : score >= 65 ? 'good' : score >= 50 ? 'fair' : 'weak');

/** Tối đa 3 hành động, ưu tiên theo tình trạng thật của người dùng. */
export function careerActions(hc: HumanCapitalResult, sources: IncomeSource[], skills: SkillItem[]): CareerActionKey[] {
  const total = sources.reduce((s, x) => s + x.amount, 0);
  const side = sources.find((s) => s.key === 'side')?.amount ?? 0;
  const out: CareerActionKey[] = [];
  if (!skills.length) out.push('start_learning');
  if (hc.exposureLevel !== 'low') out.push('reduce_risk');
  if (total === 0 || side / total < 0.25) out.push('boost_income');
  out.push('personal_brand');
  return out.slice(0, 3);
}
