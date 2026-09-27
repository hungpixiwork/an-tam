// Lịch AI — tìm khung giờ trống và tự xếp việc từ dữ liệu người dùng (thuần, không I/O).
// Giờ là giờ Việt Nam dạng 'YYYY-MM-DDTHH:MM' (khớp calendar_events).

import type { CalendarCategory } from '../types/api/calendar';

export type RuleKey = 'weekly_review' | 'bill_reminder' | 'skill_block' | 'freelance_followup';
export const RULE_KEYS: RuleKey[] = ['weekly_review', 'bill_reminder', 'skill_block', 'freelance_followup'];

export interface BusyEvent { title: string; category: CalendarCategory; startsAt: string; endsAt: string }
export interface Slot { date: string; start: string; end: string }

const pad = (n: number) => String(n).padStart(2, '0');
export const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
export const fromMin = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** Cộng `n` ngày vào 'YYYY-MM-DD'. */
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** Thứ Hai của tuần chứa `day`. */
export const weekStartOf = (day: string) => {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay() || 7;
  return addDays(day, 1 - dow);
};
/** 0 = Thứ Hai … 6 = Chủ nhật. */
export const weekdayIndex = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
const ddmm = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

export interface FreeSlotOptions {
  dayStart?: string;
  dayEnd?: string;
  /** Bỏ khung ngắn hơn số phút này. */
  minMinutes?: number;
  /** Không xếp trước thời điểm này ('YYYY-MM-DDTHH:MM'). */
  notBefore?: string;
}

/** Khung trống trong từng ngày `days` (07:00–22:00 mặc định) sau khi trừ các sự kiện đã có. */
export function freeSlots(days: string[], events: Pick<BusyEvent, 'startsAt' | 'endsAt'>[], opts: FreeSlotOptions = {}): Slot[] {
  const dayStart = toMin(opts.dayStart ?? '07:00');
  const dayEnd = toMin(opts.dayEnd ?? '22:00');
  const minLen = opts.minMinutes ?? 30;
  const out: Slot[] = [];
  for (const date of days) {
    let from = dayStart;
    if (opts.notBefore) {
      const nbDay = opts.notBefore.slice(0, 10);
      if (date < nbDay) continue;
      if (date === nbDay) from = Math.max(from, Math.ceil(toMin(opts.notBefore.slice(11, 16)) / 30) * 30);
    }
    const busy = events
      .filter((e) => e.startsAt.slice(0, 10) <= date && e.endsAt.slice(0, 10) >= date)
      .map((e) => [e.startsAt.slice(0, 10) < date ? 0 : toMin(e.startsAt.slice(11, 16)), e.endsAt.slice(0, 10) > date ? 24 * 60 : toMin(e.endsAt.slice(11, 16))] as const)
      .sort((a, b) => a[0] - b[0]);
    let cursor = from;
    for (const [s, e] of busy) {
      if (s - cursor >= minLen && cursor < dayEnd) out.push({ date, start: fromMin(cursor), end: fromMin(Math.min(s, dayEnd)) });
      cursor = Math.max(cursor, e);
    }
    if (dayEnd - cursor >= minLen) out.push({ date, start: fromMin(cursor), end: fromMin(dayEnd) });
  }
  return out.filter((s) => toMin(s.end) - toMin(s.start) >= minLen);
}

/* ───────── Việc cần xếp ───────── */

export interface BillDue { name: string; dueDate: string; amount?: number }
export interface GoalBrief { title: string; kind: string; currentAmount: number; targetAmount: number }

export interface ScheduleState {
  /** Bắt đầu cửa sổ xếp lịch ('YYYY-MM-DDTHH:MM', thường là "bây giờ"). */
  now: string;
  /** Số ngày tính từ ngày của `now`. */
  horizonDays?: number;
  events: BusyEvent[];
  bills: BillDue[];
  goals: GoalBrief[];
  focusSkill: string;
  skillHoursPerWeek: number;
  rules: Record<RuleKey, boolean>;
  /** Khóa đề xuất đang chờ duyệt — không tạo lại. */
  pendingKeys: string[];
}

export interface SessionWish {
  title: string;
  /** Ngày ưu tiên (YYYY-MM-DD) — lấy ngày đầu còn trống. */
  dates: string[];
  /** Giờ muốn bắt đầu; không trống thì lấy khung trống gần nhất trong [earliest, latest]. */
  at: string;
  earliest: string;
  latest: string;
  minutes: number;
}

export interface SchedTask {
  key: string;
  rule: RuleKey | 'goal';
  title: string;
  reason: string;
  category: CalendarCategory;
  priority: 'high' | 'goal' | 'normal';
  /** Mỗi phần tử = 1 sự kiện; xếp đủ `sessions` sự kiện. */
  wishes: SessionWish[];
  sessions: number;
}

const has = (events: BusyEvent[], re: RegExp, from: string, to: string) => events.some((e) => re.test(e.title) && e.startsAt >= from && e.startsAt < to);
const DEADLINE = /^(đóng|thanh toán|trả)\s/i;

/** Danh sách việc AI nên xếp trong cửa sổ, suy ra từ hóa đơn, mục tiêu, kỹ năng và quy tắc đang bật. */
export function tasksFromState(s: ScheduleState): SchedTask[] {
  const today = s.now.slice(0, 10);
  const horizon = s.horizonDays ?? 7;
  const days = Array.from({ length: horizon }, (_, i) => addDays(today, i));
  const end = addDays(today, horizon);
  const tasks: SchedTask[] = [];

  // 1) Nhắc đóng hóa đơn trước 2 ngày: hóa đơn định kỳ + sự kiện hạn nộp đã có trong lịch ("Đóng …")
  if (s.rules.bill_reminder) {
    const dues: BillDue[] = [
      ...s.bills,
      ...s.events.filter((e) => DEADLINE.test(e.title)).map((e) => ({ name: e.title.replace(DEADLINE, ''), dueDate: e.startsAt.slice(0, 10) })),
    ];
    const seen = new Set<string>();
    for (const b of dues) {
      const remind = addDays(b.dueDate, -2);
      const key = `bill:${b.name.toLowerCase()}:${b.dueDate}`;
      if (remind <= today || remind >= end || seen.has(key)) continue;
      seen.add(key);
      if (has(s.events, new RegExp(`nhắc.*${b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'), `${today}T00:00`, `${b.dueDate}T23:59`)) continue;
      tasks.push({
        key, rule: 'bill_reminder', category: 'finance', priority: 'high', sessions: 1,
        title: `Thêm lịch đóng ${b.name}`,
        reason: `Hạn thanh toán ${ddmm(b.dueDate)}. AI đề xuất thêm nhắc nhở vào ${ddmm(remind)} lúc 9:00.`,
        wishes: [{ title: `Nhắc: đóng ${b.name}`, dates: [remind], at: '09:00', earliest: '08:00', latest: '12:00', minutes: 30 }],
      });
    }
  }

  // 2) Chặn giờ học kỹ năng: 3 buổi tối T2 / T4 / T6 (lấy tuần kế tiếp nếu đã qua)
  if (s.rules.skill_block && s.focusSkill.trim() && s.skillHoursPerWeek > 0) {
    const skill = s.focusSkill.trim();
    const minutes = Math.min(90, Math.max(60, Math.round((s.skillHoursPerWeek * 60) / 3 / 30) * 30));
    const pick = days.filter((d) => [0, 2, 4].includes(weekdayIndex(d)));
    const alreadyLearning = s.events.filter((e) => e.category === 'skill' && e.title.toLowerCase().includes(skill.toLowerCase()) && e.startsAt >= `${today}T00:00` && e.startsAt < `${end}T00:00`).length;
    if (alreadyLearning < 3 && pick.length) {
      tasks.push({
        key: `skill:${skill.toLowerCase()}:${pick[0]}`, rule: 'skill_block', category: 'skill', priority: 'goal', sessions: Math.min(3, pick.length),
        title: `Chặn thời gian học kỹ năng ${skill}`,
        reason: `Dựa trên mục tiêu "Nâng cao kỹ năng" của bạn, AI đề xuất ${Math.min(3, pick.length)} buổi/tuần vào ${pick.map((d) => (weekdayIndex(d) === 6 ? 'CN' : `T${weekdayIndex(d) + 2}`)).join(', ')} lúc 19:00.`,
        wishes: pick.slice(0, 3).map((d) => ({ title: `Học kỹ năng ${skill}`, dates: [d], at: '19:00', earliest: '18:00', latest: '21:00', minutes })),
      });
    }
  }

  // 3) Tổng kết chi tiêu cuối tuần (Chủ nhật 9:00)
  if (s.rules.weekly_review) {
    const sunday = days.find((d) => weekdayIndex(d) === 6);
    if (sunday && !has(s.events, /tổng kết|review/i, `${sunday}T00:00`, `${sunday}T23:59`)) {
      tasks.push({
        key: `review:${sunday}`, rule: 'weekly_review', category: 'finance', priority: 'normal', sessions: 1,
        title: 'Tổng kết chi tiêu tuần',
        reason: `Chủ nhật ${ddmm(sunday)} chưa có lịch xem lại chi tiêu. AI đề xuất 9:00, 45 phút.`,
        wishes: [{ title: 'Tổng kết chi tiêu tuần', dates: [sunday], at: '09:00', earliest: '08:00', latest: '12:00', minutes: 45 }],
      });
    }
  }

  // 4) Nhắn lại khách: buổi gặp khách gần nhất đã qua ≥ 3 ngày mà chưa có lịch follow-up sau đó
  if (s.rules.freelance_followup) {
    const meetings = s.events.filter((e) => e.category === 'work' && /khách/i.test(e.title) && !/follow/i.test(e.title) && e.startsAt < s.now).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    const last = meetings[0];
    if (last && !s.events.some((e) => /follow/i.test(e.title) && e.startsAt > last.startsAt)) {
      const due = addDays(last.startsAt.slice(0, 10), 3);
      const target = due > today ? due : addDays(today, 1);
      if (target < end) {
        tasks.push({
          key: `followup:${last.startsAt}`, rule: 'freelance_followup', category: 'work', priority: 'normal', sessions: 1,
          title: 'Follow-up khách freelance',
          reason: `"${last.title}" ngày ${ddmm(last.startsAt.slice(0, 10))} chưa có phản hồi. AI đề xuất nhắn lại vào ${ddmm(target)}.`,
          wishes: [{ title: 'Follow-up khách freelance', dates: [target, addDays(target, 1)], at: '14:00', earliest: '09:00', latest: '17:00', minutes: 30 }],
        });
      }
    }
  }

  // 5) Mục tiêu tài chính: cả cửa sổ chưa có lúc nào xem lại tiền → 30 phút rà soát mục tiêu ưu tiên nhất còn thiếu
  const goal = s.goals.find((g) => g.currentAmount < g.targetAmount);
  if (goal && !s.events.some((e) => e.category === 'finance' && e.startsAt >= `${today}T00:00` && e.startsAt < `${end}T00:00`)) {
    tasks.push({
      key: `goal:${goal.title.toLowerCase()}:${today}`, rule: 'goal', category: 'finance', priority: 'goal', sessions: 1,
      title: `Rà soát mục tiêu "${goal.title}"`,
      reason: `Tuần này chưa có lịch xem lại tiền. Mục tiêu "${goal.title}" đạt ${Math.round((goal.currentAmount / goal.targetAmount) * 100)}%.`,
      wishes: [{ title: `Rà soát ${goal.title}`, dates: days.slice(1, 4), at: '20:00', earliest: '19:00', latest: '21:30', minutes: 30 }],
    });
  }

  return tasks.filter((t) => !s.pendingKeys.includes(t.key));
}

/* ───────── Xếp vào khung trống ───────── */

export interface PlannedEvent { title: string; category: CalendarCategory; startsAt: string; endsAt: string }
export interface Proposal { key: string; rule: SchedTask['rule']; title: string; reason: string; priority: SchedTask['priority']; events: PlannedEvent[] }

/** Đặt từng buổi vào khung trống gần giờ mong muốn nhất; buổi đã đặt được tính là bận cho buổi sau. */
export function planTasks(s: ScheduleState, tasks: SchedTask[]): Proposal[] {
  const today = s.now.slice(0, 10);
  const busy: Pick<BusyEvent, 'startsAt' | 'endsAt'>[] = [...s.events];
  const out: Proposal[] = [];
  for (const t of tasks) {
    const placed: PlannedEvent[] = [];
    for (const w of t.wishes) {
      for (const date of w.dates) {
        const slots = freeSlots([date], busy, { dayStart: w.earliest, dayEnd: fromMin(toMin(w.latest) + w.minutes), minMinutes: w.minutes, notBefore: date === today ? s.now : undefined });
        const want = toMin(w.at);
        let best: number | null = null;
        for (const sl of slots) {
          const start = Math.min(Math.max(want, toMin(sl.start)), toMin(sl.end) - w.minutes);
          if (start < toMin(sl.start) || start > toMin(w.latest)) continue;
          if (best === null || Math.abs(start - want) < Math.abs(best - want)) best = start;
        }
        if (best === null) continue;
        const ev = { title: w.title, category: t.category, startsAt: `${date}T${fromMin(best)}`, endsAt: `${date}T${fromMin(best + w.minutes)}` };
        placed.push(ev);
        busy.push(ev);
        break;
      }
    }
    if (placed.length) out.push({ key: t.key, rule: t.rule, title: t.title, reason: t.reason, priority: t.priority, events: placed });
  }
  return out;
}

/** Cả luồng: việc cần làm → đề xuất có giờ cụ thể. */
export const autoSchedule = (s: ScheduleState): Proposal[] => planTasks(s, tasksFromState(s));
