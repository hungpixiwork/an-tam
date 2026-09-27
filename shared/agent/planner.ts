// Planner: ý định + dữ liệu người dùng → các bước (nhật ký) + hành động chờ duyệt cho 5 agent.
// Hàm thuần — mọi con số đến từ engine có sẵn (scheduler, budget, goals), không tự bịa.

import type { ActionIntegration, ActionRisk, AgentStepKind } from '../types/api/agent';
import type { Transaction } from '../types/domain';
import { addDays, planTasks, tasksFromState, weekdayIndex, type BillDue, type BusyEvent, type Proposal, type SchedTask } from '../engine/scheduler';
import { spendingAdvice } from '../engine/budget';
import { categoryOf } from '../engine/ledger';
import { formatVndFull } from '../format';
import { fold, type Intent } from './intent';
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
