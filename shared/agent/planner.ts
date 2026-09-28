// Planner: ý định + dữ liệu người dùng → các bước (nhật ký) + hành động chờ duyệt cho 5 agent.
// Hàm thuần — mọi con số đến từ engine có sẵn (scheduler, budget, goals), không tự bịa.

import type { ActionIntegration, ActionRisk, AgentStepKind } from '../types/api/agent';
import type { Transaction, UserState } from '../types/domain';
import type { FinancialSignals, LifeChoiceEvaluation, LifeChoiceKind, LifeChoiceOptionInput } from '../types/api';
import type { DecisionSimulationResult } from '../types/api/decision';
import { evaluateLifeChoice, FEASIBILITY_WEIGHTS } from '../engine/lifeChoice';
import { allocateSavings } from '../engine/allocation';
import { addMonths } from '../engine/month';
import { addDays, planTasks, tasksFromState, weekdayIndex, type BillDue, type BusyEvent, type Proposal, type SchedTask } from '../engine/scheduler';
import { spendingAdvice } from '../engine/budget';
import { categoryOf } from '../engine/ledger';
import { formatVndFull } from '../format';
import { fold, type AlertParams, type Intent, type LifeKind, type LifeParams } from './intent';
import { ACTION_TYPES, validateAction, type ActionType } from './actions';
import { AGENT_KEYS, type AgentKey } from './tools';

export interface PlannerGoal {
  id: string;
  title: string;
  kind: string;
  currentAmount: number;
  targetAmount: number;
  monthlyContribution: number;
}

export interface PlannerContext {
  /** Giờ Việt Nam 'YYYY-MM-DDTHH:MM'. */
  now: string;
  /** Thứ Hai của tuần cần lập kế hoạch. */
  weekStart: string;
  /** Lịch hiện có từ weekStart − 7 tới weekStart + 7. */
  events: BusyEvent[];
  bills: BillDue[];
  /** Theo thứ tự ưu tiên. */
  goals: PlannerGoal[];
  focusSkill: string;
  skillHoursPerWeek: number;
  /** Giao dịch tháng gần nhất đủ dữ liệu (để tìm khoản có thể bớt). */
  recentTx: Pick<Transaction, 'kind' | 'amount' | 'category' | 'note' | 'valueTag'>[];
  /** Ngân sách tháng hiện hành (null = chưa đặt). */
  budgetLimit: number | null;
  /** Tổng chi tháng gần nhất. */
  lastMonthExpense: number;
  googleCalendarConnected: boolean;
  /** Ghi chú "Yêu cầu điều chỉnh" (đã che số). */
  note?: string;
}

export interface StepDraft { agent: AgentKey; kind: AgentStepKind; title: string; detail?: string }
export interface ActionDraft { type: ActionType; agent: AgentKey; title: string; payload: unknown; integration: ActionIntegration; risk: ActionRisk }
export interface PlanResult { agents: AgentKey[]; intents: Intent[]; steps: StepDraft[]; actions: ActionDraft[] }

const vnd = (n: number) => formatVndFull(n);
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const round100k = (n: number) => Math.floor(n / 100_000) * 100_000;
const round10k = (n: number) => Math.round(n / 10_000) * 10_000;

/** "không / bỏ / đừng …" trong ghi chú điều chỉnh → bỏ ý định tương ứng. */
const NEGATE: Record<Intent, RegExp> = {
  plan_week: /(khong|bo|dung)\s+(sap |xep )?lich/,
  save_more: /(khong|bo|dung)\s+(doi |sua )?(ngan sach|tiet kiem)/,
  learn_skill: /(khong|bo|dung)\s+(nhac |lich )?hoc/,
  follow_up_clients: /(khong|bo|dung)\s+(gui )?(email|mail|khach)/,
  review_goals: /(khong|bo|dung)\s+(doi |sua )?muc tieu/,
  life_decision: /(khong|bo|dung)\s+(luu )?(phuong an|ke hoach nay)/,
  set_alert: /(khong|bo|dung)\s+(dat )?canh bao/,
  ask_desk: /$^/,
  simulate_decision: /(khong|bo|dung)\s+(cap nhat|lui|doi)\s+(ke hoach|thoi diem|ngay bat dau)/,
};

export function applyNote(intents: Intent[], note?: string): Intent[] {
  if (!note) return intents;
  const t = fold(note);
  const kept = intents.filter((i) => !NEGATE[i].test(t));
  return kept.length ? kept : ['plan_week'];
}

const isClientMeeting = (e: BusyEvent) => e.category === 'work' && /khách|client/i.test(e.title) && !/follow|theo dõi/i.test(e.title);
const clientName = (title: string) => title.replace(/^(họp|gặp|call)\s+/i, '').trim();

/** Lập kế hoạch cho cả đội agent. */
export function planRun(ctx: PlannerContext, rawIntents: Intent[]): PlanResult {
  const intents = applyNote(rawIntents, ctx.note);
  const want = (i: Intent) => intents.includes(i);
  const weekEnd = addDays(ctx.weekStart, 7);
  const startAt = `${ctx.weekStart}T07:00` > ctx.now ? `${ctx.weekStart}T07:00` : ctx.now;
  const from = startAt.slice(0, 10);
  const horizon = Math.max(1, Math.round((Date.parse(`${weekEnd}T00:00Z`) - Date.parse(`${from}T00:00Z`)) / 86_400_000));
  const days = Array.from({ length: horizon }, (_, i) => addDays(from, i));
  const inWeek = ctx.events.filter((e) => e.startsAt >= `${from}T00:00` && e.startsAt < `${weekEnd}T00:00`);

  const steps: StepDraft[] = [];
  const actions: ActionDraft[] = [];
  const notes: StepDraft[] = [];
  const add = (type: ActionType, title: string, payload: unknown, integration?: ActionIntegration) => {
    const d = ACTION_TYPES[type];
    const valid = validateAction(type, payload);
    actions.push({ type, agent: d.agent, title, payload: valid, integration: integration ?? (d.integration === 'google_calendar_or_local' ? 'local' : d.integration), risk: d.risk });
  };

  /* ── Calendar + Skill + Planner: xếp lịch tuần bằng scheduler ── */
  const meetings = inWeek.filter(isClientMeeting);
  if (want('plan_week') || want('learn_skill') || want('follow_up_clients')) {
    const state = {
      now: startAt,
      horizonDays: horizon,
      events: ctx.events,
      bills: ctx.bills,
      goals: ctx.goals.map((g) => ({ title: g.title, kind: g.kind, currentAmount: g.currentAmount, targetAmount: g.targetAmount })),
      focusSkill: want('learn_skill') ? ctx.focusSkill : '',
      skillHoursPerWeek: ctx.skillHoursPerWeek,
      rules: { bill_reminder: true, skill_block: want('learn_skill'), weekly_review: want('plan_week') || want('save_more'), freelance_followup: want('follow_up_clients') && meetings.length === 0 },
      pendingKeys: [],
    };
    const tasks: SchedTask[] = tasksFromState(state).filter((t) => t.rule !== 'goal' || want('review_goals') || want('save_more'));
    // Theo dõi từng khách có buổi họp trong tuần: 30 phút vào chiều hôm sau
    if (want('follow_up_clients')) {
      for (const m of meetings) {
        const day = m.startsAt.slice(0, 10);
        const next = [addDays(day, 1), addDays(day, 2)].filter((d) => d < weekEnd);
        if (!next.length || ctx.events.some((e) => /follow|theo dõi/i.test(e.title) && e.title.includes(clientName(m.title)))) continue;
        tasks.push({
          key: `followup:${m.startsAt}`, rule: 'freelance_followup', category: 'work', priority: 'normal', sessions: 1,
          title: `Theo dõi ${clientName(m.title)}`,
          reason: `Sau buổi "${m.title}" ngày ${ddmm(day)}.`,
          wishes: [{ title: `Follow-up ${clientName(m.title)}`, dates: next, at: '16:30', earliest: '13:00', latest: '18:00', minutes: 30 }],
        });
      }
    }
    // Cân bằng: nửa buổi chiều thứ Bảy cho bản thân nếu còn trống
    const saturday = days.find((d) => weekdayIndex(d) === 5);
    if (want('plan_week') && saturday && !inWeek.some((e) => e.category === 'rest' && e.startsAt.startsWith(saturday))) {
      tasks.push({
        key: `rest:${saturday}`, rule: 'weekly_review', category: 'rest', priority: 'normal', sessions: 1,
        title: 'Thời gian cá nhân', reason: 'Giữ cân bằng giữa làm việc, học và nghỉ ngơi.',
        wishes: [{ title: 'Thời gian cá nhân', dates: [saturday], at: '14:00', earliest: '13:00', latest: '15:00', minutes: 180 }],
      });
    }
    const proposals: Proposal[] = planTasks(state, tasks);
    const events = proposals.flatMap((p) => p.events.map((e) => ({ ...e, note: 'Do An Tâm AI đề xuất' }))).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    if (events.length) {
      const where = ctx.googleCalendarConnected ? 'Google Calendar' : 'lịch An Tâm';
      add('calendar.create_events', `Tạo ${events.length} sự kiện vào ${where}`, {
        key: `agent:${ctx.weekStart}`, rule: 'agent', priority: 'goal',
        reason: proposals.map((p) => p.title).join(' · ').slice(0, 300),
        events,
      }, ctx.googleCalendarConnected ? 'google_calendar' : 'local');
      notes.push({ agent: 'calendar', kind: 'note', title: `Tạo lịch trình chi tiết ${days.length} ngày`, detail: `${events.length} buổi mới, không trùng lịch đã có` });
      const skillCount = proposals.filter((p) => p.rule === 'skill_block').reduce((s, p) => s + p.events.length, 0);
      if (skillCount) notes.push({ agent: 'skill', kind: 'note', title: `Đề xuất ${skillCount} buổi học ${ctx.focusSkill} phù hợp`, detail: 'Buổi tối Thứ 2 / Thứ 4 / Thứ 6' });
      const follow = proposals.filter((p) => p.rule === 'freelance_followup').length;
      if (follow) notes.push({ agent: 'calendar', kind: 'note', title: `Sắp xếp thời gian theo dõi ${follow} khách freelance` });
      if (proposals.some((p) => p.key.startsWith('rest:'))) notes.push({ agent: 'calendar', kind: 'note', title: 'Cân bằng thời gian cá nhân và nghỉ ngơi' });
    }
  }

  /* ── Cashflow: ngân sách tháng từ gợi ý tiết kiệm của engine budget ── */
  let saving = 0;
  if (want('save_more')) {
    const advice = spendingAdvice(ctx.recentTx);
    saving = advice.saving?.monthly ?? round10k(ctx.lastMonthExpense * 0.05);
    const current = ctx.budgetLimit ?? ctx.lastMonthExpense;
    const month = ctx.weekStart.slice(0, 7);
    if (current > 0 && saving > 0) {
      const limit = Math.max(100_000, round100k(current - saving));
      const focus = advice.focus ? categoryOf(advice.focus.category)?.label ?? advice.focus.category : null;
      const reason = focus
        ? `Chi ${focus.toLowerCase()} đang cao hơn mức phổ biến — bớt ${vnd(saving)}/tháng${advice.saving?.labels.length ? ` (${advice.saving.labels.join(', ')})` : ''}.`
        : `Giữ chi tiêu thấp hơn tháng trước ${vnd(saving)} để tiết kiệm thêm.`;
      add('budget.set', `Cập nhật ngân sách tháng ${month.slice(5)}/${month.slice(0, 4)}`, { month, limitBefore: ctx.budgetLimit, limit, saving, reason });
      // Nhật ký không ghi số tiền — số chỉ nằm trong bản xem trước của hành động
      notes.push({ agent: 'cashflow', kind: 'note', title: 'Phân bổ ngân sách theo kế hoạch', detail: focus ? `Bớt chi ${focus.toLowerCase()} theo gợi ý tiết kiệm` : 'Giữ chi tiêu thấp hơn tháng trước' });
    }
  }

  /* ── Skill: nhắc học mỗi sáng ── */
  if (want('learn_skill') && ctx.focusSkill.trim()) {
    add('reminder.create', 'Thêm nhắc nhở học kỹ năng hằng ngày', { title: `Nhắc: học ${ctx.focusSkill.trim()} 30 phút`, time: '07:30', dates: days, category: 'skill' });
  }

  /* ── Goal: chuyển phần tiết kiệm được sang mục tiêu ưu tiên nhất còn thiếu ── */
  const goal = ctx.goals.find((g) => g.currentAmount < g.targetAmount);
  if (want('review_goals') && goal) {
    const extra = saving > 0 ? saving : 0;
    if (extra > 0) {
      add('goal.update_progress', `Cập nhật tiến độ mục tiêu "${goal.title}"`, {
        goalId: goal.id, goalTitle: goal.title, monthlyBefore: goal.monthlyContribution, monthlyAfter: goal.monthlyContribution + extra,
        reason: `Để dành thêm ${vnd(extra)}/tháng từ ngân sách mới (đang đạt ${Math.round((goal.currentAmount / goal.targetAmount) * 100)}%).`,
      });
    }
    notes.push({ agent: 'goal', kind: 'note', title: `Rà soát mục tiêu "${goal.title}"`, detail: `Đạt ${Math.round((goal.currentAmount / goal.targetAmount) * 100)}%` });
  }

  /* ── Planner: email xác nhận lịch cho khách + báo cáo tổng kết tuần ── */
  if (want('follow_up_clients') && meetings.length) {
    const names = [...new Set(meetings.map((m) => clientName(m.title)))];
    add('gmail.send', 'Gửi email xác nhận lịch cho khách freelance', {
      recipients: names.slice(0, 10),
      subject: 'Xác nhận lịch làm việc tuần tới',
      body: meetings.map((m) => `${ddmm(m.startsAt.slice(0, 10))} ${m.startsAt.slice(11, 16)}–${m.endsAt.slice(11, 16)}: ${m.title}`).join('\n'),
    });
  }
  if (want('plan_week')) {
    const sunday = days.find((d) => weekdayIndex(d) === 6) ?? days[days.length - 1];
    add('notion.weekly_report', `Tạo báo cáo tổng kết vào Chủ nhật ${ddmm(sunday)}`, {
      title: `Tổng kết tuần ${ddmm(ctx.weekStart)}–${ddmm(addDays(ctx.weekStart, 6))}`,
      weekStart: ctx.weekStart,
      sections: ['Chi tiêu trong tuần', ...(want('learn_skill') ? [`Tiến độ học ${ctx.focusSkill}`] : []), ...(want('follow_up_clients') ? ['Khách freelance đã theo dõi'] : []), 'Tiến độ mục tiêu'],
    });
  }

  const agents = AGENT_KEYS.filter((k) => k === 'planner' || actions.some((a) => a.agent === k) || notes.some((n) => n.agent === k));
  steps.push(
    { agent: 'planner', kind: 'plan', title: 'Phân tích dữ liệu cá nhân', detail: 'Đọc mục tiêu, lịch hiện tại, thu chi, danh sách khách freelance' },
    { agent: 'planner', kind: 'plan', title: 'Các Agent bắt đầu phối hợp', detail: agents.join(',') },
    { agent: 'planner', kind: 'plan', title: 'Truy xuất dữ liệu từ MCP', detail: [ctx.googleCalendarConnected ? 'google_calendar' : 'calendar_local', 'ledger', 'goals'].join(',') },
    { agent: 'planner', kind: 'propose', title: actions.length ? `Lập kế hoạch tuần ${ddmm(ctx.weekStart)} (đã hoàn thành)` : 'Chưa có việc cần đề xuất', detail: `${actions.length} hành động chờ phê duyệt` },
    ...notes,
  );
  return { agents, intents, steps, actions };
}

/* ───────── Quyết định lớn / cảnh báo giá / hỏi về một mã ─────────
   Mọi con số từ engine (evaluateLifeChoice, allocateSavings). Nhật ký (steps) không ghi số tiền;
   câu trả lời (reply) và bản xem trước hành động mới có số. */

export interface SpecialPlan { steps: StepDraft[]; actions: ActionDraft[]; reply: string }

const LIFE_KIND: Record<LifeKind, LifeChoiceKind> = { study: 'study', startup: 'startup', sabbatical: 'sabbatical', career_switch: 'switch', other: 'custom' };
const DEFAULT_MONTHS: Record<LifeKind, number> = { study: 24, startup: 12, sabbatical: 6, career_switch: 6, other: 12 };
/** Phần trăm thu nhập còn giữ khi người dùng không nói rõ. */
const DEFAULT_INCOME_PCT: Record<LifeKind, number> = { study: 0, startup: 0, sabbatical: 0, career_switch: 80, other: 0 };
const LIFE_LABEL: Record<LifeKind, string> = { study: 'đi học', startup: 'khởi nghiệp', sabbatical: 'nghỉ ngơi', career_switch: 'đổi nghề', other: 'thực hiện kế hoạch' };
/** Chuẩn bị trong bao nhiêu tháng trước khi bắt đầu (để tính số cần để dành thêm mỗi tháng). */
export const LIFE_PREP_MONTHS = 12;

const ceil100k = (n: number) => Math.ceil(Math.max(0, n) / 100_000) * 100_000;
const decText = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const pctText = (n: number) => `${decText(n)}%`;

/** Tên phương án ngắn từ câu hỏi đã che: "Học thạc sĩ", "Du học", "Khởi nghiệp"… */
export function lifeTitle(maskedPrompt: string, kind: LifeKind): string {
  const t = fold(maskedPrompt);
  if (/du hoc/.test(t)) return 'Du học';
  if (/\bmba\b/.test(t)) return 'Học MBA';
  if (/thac si/.test(t)) return 'Học thạc sĩ';
  if (/tien si/.test(t)) return 'Học tiến sĩ';
  return { study: 'Đi học', startup: 'Khởi nghiệp', sabbatical: 'Nghỉ ngơi', career_switch: 'Đổi nghề', other: 'Kế hoạch mới' }[kind];
}

/** Tham số rút từ câu hỏi → phương án đầu vào của engine. */
export function lifeOption(state: UserState, life: LifeParams, title: string): LifeChoiceOptionInput {
  const dur = Math.min(120, Math.max(1, Math.round(life.durationMonths ?? DEFAULT_MONTHS[life.kind])));
  const pct = Math.min(100, Math.max(0, life.incomeDuringPct ?? DEFAULT_INCOME_PCT[life.kind]));
  const income = Math.max(0, state.profile.monthlyIncome);
  return {
    title: `${title} ${dur} tháng`,
    description: 'Do An Tâm AI tạo từ câu hỏi của bạn',
    cost: Math.max(0, Math.round(life.oneTimeCost ?? 0)),
    otherCost: Math.max(0, Math.round((life.monthlyCost ?? 0) * dur)),
    durationMonths: dur,
    monthsWithoutIncome: pct <= 0 ? dur : 0,
    monthlyIncomeDelta: pct <= 0 ? 0 : -Math.round((income * (1 - pct / 100)) / 1000) * 1000,
  };
}

export interface LifeDecisionContext { budgetLimit: number | null; lastMonthExpense: number; maskedPrompt: string; signals?: FinancialSignals }

export function planLifeDecision(state: UserState, life: LifeParams, ctx: LifeDecisionContext): SpecialPlan & { evaluation: LifeChoiceEvaluation } {
  const kind = LIFE_KIND[life.kind];
  const title = lifeTitle(ctx.maskedPrompt, life.kind);
  const option = lifeOption(state, life, title);
  const ev = evaluateLifeChoice(state, option, { kind, incomeUpliftPct: 0, prereqsDone: 0, prereqsTotal: 0, signals: ctx.signals });
  const dur = option.durationMonths;
  const label = `${title.charAt(0).toLowerCase()}${title.slice(1)} ${dur} tháng`;
  const affordable = ev.funding.shortfall === 0;

  // Mục tiêu bị lùi: phần góp cho mục tiêu không đủ trong thời gian thực hiện → tạm dừng tương ứng
  const goalsRatio = Math.min(1, Math.max(0, ev.parts.goals / FEASIBILITY_WEIGHTS.goals));
  const paused = Math.round(dur * (1 - goalsRatio));
  const delayed = paused > 0
    ? [...state.goals].filter((g) => g.kind !== 'education' && g.monthlyContribution > 0 && g.currentAmount < g.targetAmount).sort((a, b) => a.priority - b.priority).slice(0, 2)
    : [];

  // Số cần để dành thêm: phần thiếu + phần để quỹ dự phòng vẫn đủ sau khi thực hiện, chia cho thời gian chuẩn bị
  const E = Math.max(0, state.profile.monthlyExpense);
  const targetMonths = state.profile.emergencyTargetMonths || 6;
  const leftAfter = Math.max(0, ev.funding.liquid - Math.max(0, ev.costs.total - ev.funding.incomeCover));
  const need = ev.funding.shortfall + Math.max(0, targetMonths * E - leftAfter);
  const extra = ceil100k(need / LIFE_PREP_MONTHS);
  const savings = allocateSavings(state);
  const free = round100k(Math.max(0, savings.unallocated));
  // Bớt chi tối đa 15% ngân sách hiện tại — không đề xuất cắt chi quá sức
  const current = ctx.budgetLimit ?? ctx.lastMonthExpense;
  const cut = Math.min(Math.max(0, extra - free), round100k(Math.max(0, current) * 0.15));
  const reachable = Math.min(extra, free + cut);
  // Không đủ trong 12 tháng → với mức để dành hiện tại cần bao lâu
  const capacity = Math.max(0, savings.capacity);
  const prepMonths = reachable < extra && capacity > 0 ? Math.ceil(need / capacity) : null;

  const parts = [
    affordable
      ? `Bạn kham nổi kế hoạch ${label}: tổng chi khoảng ${vnd(ev.costs.total)}, tiền dùng được ngay ${vnd(ev.funding.liquid)} đủ trả.`
      : `Bạn chưa kham nổi kế hoạch ${label}: tổng chi khoảng ${vnd(ev.costs.total)}, còn thiếu ${vnd(ev.funding.shortfall)}.`,
    `Sau khi thực hiện, quỹ còn đủ sống ${decText(ev.monthsAfter)} tháng (hiện ${decText(ev.monthsBefore)} tháng).`,
    delayed.length
      ? `Mục tiêu ${delayed.map((g) => `"${g.title}"`).join(' và ')} lùi khoảng ${paused} tháng.`
      : 'Các mục tiêu khác vẫn giữ tiến độ.',
    extra <= 0
      ? 'Không cần để dành thêm.'
      : `Cần để dành thêm ${vnd(extra)}/tháng trong ${LIFE_PREP_MONTHS} tháng để bắt đầu mà vẫn giữ quỹ dự phòng ${targetMonths} tháng${
        reachable >= extra ? (cut > 0 ? '.' : ', phần tiền dư chưa chia hiện đủ cho khoản này.')
          : prepMonths ? `; với mức để dành hiện tại ${vnd(round100k(capacity))}/tháng thì cần khoảng ${prepMonths} tháng chuẩn bị.` : '.'}`,
  ];

  const actions: ActionDraft[] = [];
  const add = (type: ActionType, t: string, payload: unknown) => {
    const d = ACTION_TYPES[type];
    actions.push({ type, agent: d.agent, title: t, payload: validateAction(type, payload), integration: d.integration === 'google_calendar_or_local' ? 'local' : d.integration, risk: d.risk });
  };
  add('life_choice.create', `Lưu phương án "${option.title}" để theo dõi`, {
    title, kind, option,
    reason: `Điểm khả thi ${ev.feasibility}/100, ${affordable ? 'kham nổi' : 'chưa kham nổi'} với dữ liệu hiện tại.`,
  });
  if (reachable > 0) {
    const dates = Array.from({ length: 6 }, (_, i) => `${addMonths(state.today, i + 1)}-05`);
    add('reminder.create', `Nhắc để dành ${vnd(reachable)} mỗi tháng`, { title: `Để dành ${vnd(reachable)} cho kế hoạch ${LIFE_LABEL[life.kind]}`.slice(0, 80), time: '08:00', dates, category: 'finance' });
    if (cut > 0 && current > 0) {
      const month = addMonths(state.today, 1);
      add('budget.set', `Giảm ngân sách tháng ${month.slice(5)}/${month.slice(0, 4)} để chuẩn bị kế hoạch`, {
        month, limitBefore: ctx.budgetLimit, limit: Math.max(100_000, round100k(current - cut)), saving: cut,
        reason: `Bớt chi ${vnd(cut)}/tháng để chuẩn bị ${LIFE_LABEL[life.kind]}.`,
      });
    }
  }

  const steps: StepDraft[] = [
    { agent: 'planner', kind: 'plan', title: 'Hiểu câu hỏi: quyết định lớn', detail: label },
    { agent: 'goal', kind: 'note', title: 'Chấm điểm phương án bằng dữ liệu thật', detail: `Điểm khả thi ${ev.feasibility}/100` },
    { agent: 'cashflow', kind: 'note', title: affordable ? 'Tiền dùng được ngay đủ trả' : 'Tiền dùng được ngay chưa đủ', detail: `Quỹ còn đủ sống ${decText(ev.monthsAfter)} tháng sau khi thực hiện` },
    ...(delayed.length ? [{ agent: 'goal' as const, kind: 'note' as const, title: `${delayed.length} mục tiêu có thể lùi`, detail: `Khoảng ${paused} tháng` }] : []),
    { agent: 'planner', kind: 'propose', title: 'Đề xuất bước tiếp theo', detail: `${actions.length} hành động chờ phê duyệt` },
  ];
  // Căn cứ (sổ thu chi thật, kịch bản xấu) — có khi đã gộp dữ liệu tài chính
  if (ev.basis) parts.push(ev.basis);
  return { steps, actions, reply: parts.join(' '), evaluation: ev };
}

export const symbolLabel = (symbol: string) => (symbol === 'SJC' ? 'vàng SJC' : symbol === 'VNINDEX' ? 'VN-Index' : symbol);

/** Cảnh báo giá: 1 hành động chờ duyệt; đã đủ số cảnh báo của gói → chỉ trả lời, không đề xuất. */
const MODE_LABEL = { bull: 'lạc quan', base: 'cơ sở', bear: 'thận trọng' } as const;
const monthLabel = (m: string) => `T${Number(m.slice(5))}/${m.slice(0, 4)}`;

/**
 * Sau mô phỏng cú sốc kép: đọc kết quả engine → câu trả lời + 1 hành động chờ duyệt cập nhật kế hoạch của lựa chọn
 * (lùi tháng bắt đầu, thêm việc theo nhóm tài chính / công việc / quỹ thời gian). Số liệu lấy nguyên từ engine.
 */
export function planDecision(r: DecisionSimulationResult, startBefore: string | null, today: string): SpecialPlan {
  const s = r.selected;
  const steps: StepDraft[] = [
    { agent: 'planner', kind: 'plan', title: 'Nạp lựa chọn và dữ liệu tài chính', detail: `${r.choiceTitle} · ${r.optionTitle}` },
    { agent: 'cashflow', kind: 'note', title: 'Chạy mô phỏng cú sốc kép 24 tháng', detail: `Khung ${MODE_LABEL[r.mode]}: số tháng an toàn ${decText(r.impact.monthsSafe.before)} → ${decText(r.impact.monthsSafe.after)}` },
    { agent: 'goal', kind: 'note', title: 'Đo tác động lên mục tiêu', detail: r.impact.goalDelay ? `${r.impact.goalDelay.goalTitle} lùi ${r.impact.goalDelay.min}–${r.impact.goalDelay.max} tháng` : 'Chưa có mục tiêu lớn' },
  ];
  type PlanTask = { title: string; detail: string; category: 'finance' | 'career' | 'time'; priority: 'high' | 'mid' | 'low'; link?: string; action?: { type: string; payload: unknown } };
  const tasks: PlanTask[] = [];
  let startAfter: string | null = null;
  for (const st of r.steps) {
    const p = st.params;
    // Việc mang theo hành động 1 chạm + trang liên quan của đúng bước đó (áp dụng ngay từ "Agent đồng hành hôm nay")
    const extra = { link: st.to, ...(st.action && st.key !== 'delay_start' ? { action: st.action } : {}) };
    if (st.key === 'reduce_concentration') tasks.push({ title: `Giảm tài sản cùng ngành đang làm khoảng ${vnd(p.amount)}`, detail: `Đang chiếm ${p.sharePct}% tiền dùng được, nên giữ dưới ${p.capPct}%.`, category: 'finance', priority: 'high', ...extra });
    if (st.key === 'raise_reserve') tasks.push({ title: `Nâng quỹ dự phòng lên ${p.to} tháng chi phí`, detail: `Cần thêm khoảng ${vnd(p.amount)}.`, category: 'finance', priority: 'high', ...extra });
    if (st.key === 'cut_budget') tasks.push({ title: `Đặt ngân sách tháng sau ${vnd(p.amount)}`, detail: `Bớt khoảng ${vnd(p.saving)} để lấp quỹ nhanh hơn.`, category: 'finance', priority: 'mid', ...extra });
    if (st.key === 'side_income') tasks.push({ title: `Tạo nguồn làm thêm ${vnd(p.amount)}/tháng`, detail: 'Bù phần thu nhập có thể mất khi có cú sốc.', category: 'career', priority: 'mid', ...extra });
    if (st.key === 'delay_start') {
      startAfter = addMonths(startBefore ?? today, p.max);
      tasks.push({ title: `Dời lịch bắt đầu sang ${monthLabel(startAfter)}`, detail: `Lùi ${p.min}–${p.max} tháng để tích lũy lại quỹ.`, category: 'time', priority: 'mid', link: st.to });
    }
  }
  const reply = [
    `Với cú sốc kép (khung ${MODE_LABEL[r.mode]}), số tháng an toàn của bạn giảm từ ${decText(r.impact.monthsSafe.before)} xuống ${decText(r.impact.monthsSafe.after)} tháng`
      + `${s.shortfallMonth ? `, có thể hết tiền dùng được từ tháng thứ ${s.shortfallMonth}` : ''}.`,
    `Mức độ an toàn ${r.impact.safety.before} → ${r.impact.safety.after}/100; điểm khả thi của "${r.choiceTitle}" ${r.choiceImpact.feasibilityBefore} → ${r.choiceImpact.feasibilityAfter}.`,
    r.impact.goalDelay ? `Mục tiêu "${r.impact.goalDelay.goalTitle}" có thể lùi ${r.impact.goalDelay.min}–${r.impact.goalDelay.max} tháng.` : '',
    tasks.length ? `An Tâm đề xuất ${tasks.length} việc để kế hoạch bền hơn — bạn duyệt thì mới cập nhật.` : 'Kế hoạch hiện tại vẫn chịu được cú sốc này, chưa cần thay đổi.',
  ].filter(Boolean).join(' ');
  const actions: ActionDraft[] = [];
  if (tasks.length) {
    const d = ACTION_TYPES['life_choice.update_plan'];
    actions.push({
      type: 'life_choice.update_plan', agent: d.agent, integration: 'local', risk: d.risk,
      title: `Cập nhật kế hoạch "${r.choiceTitle}" sau mô phỏng`,
      payload: validateAction('life_choice.update_plan', {
        choiceId: r.choiceId, optionId: r.optionId, choiceTitle: r.choiceTitle.slice(0, 80), startBefore, startAfter, tasks: tasks.slice(0, 6),
        reason: `Số tháng an toàn còn ${decText(r.impact.monthsSafe.after)} tháng khi có cú sốc (khung ${MODE_LABEL[r.mode]}).`,
      }),
    });
    steps.push({ agent: 'goal', kind: 'propose', title: 'Đề xuất cập nhật kế hoạch', detail: `${tasks.length} việc${startAfter ? `, bắt đầu ${monthLabel(startAfter)}` : ''}` });
  }
  return { steps, actions, reply };
}

export function planAlert(alert: AlertParams, limit: { count: number | null; max: number }): SpecialPlan {
  const label = symbolLabel(alert.symbol);
  const verb = alert.direction === 'down' ? 'giảm' : 'tăng';
  const what = `${label} ${verb} từ ${pctText(alert.thresholdPct)} trở lên trong ngày`;
  if (limit.count !== null && limit.count >= limit.max) {
    return {
      steps: [{ agent: 'planner', kind: 'note', title: 'Đã đủ số cảnh báo giá của gói', detail: `Tối đa ${limit.max} cảnh báo` }],
      actions: [],
      reply: `Bạn đã đặt đủ ${limit.max} cảnh báo giá của gói hiện tại. Xóa bớt một cảnh báo hoặc nâng lên Gói Plus để được báo khi ${what}.`,
    };
  }
  const d = ACTION_TYPES['alert_rule.create'];
  const payload = validateAction('alert_rule.create', { symbol: alert.symbol, label, direction: alert.direction, thresholdPct: alert.thresholdPct });
  return {
    steps: [
      { agent: 'planner', kind: 'plan', title: 'Hiểu câu hỏi: đặt cảnh báo giá', detail: label },
      { agent: 'planner', kind: 'propose', title: 'Đề xuất cảnh báo giá', detail: '1 hành động chờ phê duyệt' },
    ],
    actions: [{ type: 'alert_rule.create', agent: d.agent, title: `Bật cảnh báo khi ${label} ${verb}`, payload, integration: 'local', risk: d.risk }],
    reply: `An Tâm sẽ báo bạn khi ${what}. Bấm duyệt để bật cảnh báo.`,
  };
}

/** Hỏi về một mã: ghi chú ảnh hưởng tới tài sản đang giữ (tất định), không khuyên mua / bán. */
export function planDesk(state: UserState, symbol: string | null): SpecialPlan {
  const steps: StepDraft[] = [{ agent: 'planner', kind: 'plan', title: 'Hiểu câu hỏi: hỏi về một mã', detail: symbol ? symbolLabel(symbol) : 'Chưa rõ mã' }];
  if (!symbol) return { steps, actions: [], reply: 'Bạn muốn hỏi về mã nào? Ví dụ: "có nên bán vàng không" hoặc "FPT giảm có sao không".' };
  const total = state.holdings.reduce((s, h) => s + Math.max(0, h.value), 0);
  const match = state.holdings.filter((h) => {
    const sym = (h as { symbol?: string | null }).symbol;
    if (sym) return sym.toUpperCase() === symbol;
    const n = fold(h.name);
    if (symbol === 'SJC') return /\bvang\b|\bsjc\b/.test(n);
    if (symbol === 'VNINDEX') return h.category === 'stock' || h.category === 'fund';
    return new RegExp(`\\b${symbol.toLowerCase()}\\b`).test(n);
  });
  const held = match.reduce((s, h) => s + Math.max(0, h.value), 0);
  const label = symbolLabel(symbol);
  steps.push({ agent: 'cashflow', kind: 'note', title: 'Đo ảnh hưởng tới tài sản đang giữ', detail: held > 0 ? `${match.length} khoản liên quan` : 'Không có khoản liên quan' });
  steps.push({ agent: 'planner', kind: 'note', title: 'Bàn đầu tư sẽ phân tích mã này' });
  const share = total > 0 ? (held / total) * 100 : 0;
  const reply = held > 0
    ? `Bạn đang giữ khoảng ${vnd(held)} liên quan tới ${label}, chiếm ${pctText(share)} tổng tài sản. Nếu ${label} giảm 10%, tài sản của bạn giảm khoảng ${vnd(Math.round(held * 0.1))}. An Tâm không khuyên mua hay bán, chỉ giúp bạn thấy mức ảnh hưởng tới quỹ dự phòng và mục tiêu.`
    : `Bạn chưa có khoản nào gắn với ${label} trong danh sách tài sản, nên biến động của mã này không ảnh hưởng trực tiếp tới tiền của bạn.`;
  return { steps, actions: [], reply };
}
