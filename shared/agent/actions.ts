// Danh mục hành động agent được phép đề xuất. Mỗi loại: agent phụ trách, tích hợp, mức rủi ro,
// schema payload (kiểm tra cả lúc tạo lẫn lúc thực thi) và bản xem trước cho người duyệt.

import { z } from 'zod';
import type { ActionIntegration, ActionPreview, ActionRisk } from '../types/api/agent';
import type { AgentKey } from './tools';
import { formatVndFull } from '../format';

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
const category = z.enum(['finance', 'skill', 'work', 'rest', 'personal']);
const money = z.number().int().nonnegative().max(100_000_000_000);

export const calendarEventsPayload = z.object({
  key: z.string().max(120),
  rule: z.string().max(40),
  reason: z.string().max(300),
  priority: z.enum(['high', 'goal', 'normal']),
  events: z
    .array(z.object({ title: z.string().min(1).max(80), note: z.string().max(120).default(''), category, startsAt: localDateTime, endsAt: localDateTime }))
    .min(1)
    .max(20),
});

export const budgetPayload = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  limitBefore: money.nullable(),
  limit: money.min(1),
  saving: money,
  reason: z.string().max(300),
});

export const goalPayload = z.object({
  goalId: z.string().min(1),
  goalTitle: z.string().max(120),
  monthlyBefore: money,
  monthlyAfter: money,
  reason: z.string().max(300),
});

export const reminderPayload = z.object({
  title: z.string().min(1).max(80),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(14),
  category,
});

export const gmailPayload = z.object({
  recipients: z.array(z.string().max(80)).min(1).max(10),
  subject: z.string().max(150),
  body: z.string().max(2000),
});

export const sheetsPayload = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), limit: money.min(1) });

export const notionPayload = z.object({
  title: z.string().max(150),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sections: z.array(z.string().max(200)).max(10),
});

/** Phương án ngã rẽ lớn (cùng khuôn với POST /api/life-choices/:id/options). */
export const lifeChoicePayload = z.object({
  title: z.string().min(2).max(80),
  kind: z.enum(['study', 'care', 'startup', 'switch', 'sabbatical', 'custom']),
  option: z.object({
    title: z.string().min(2).max(80),
    description: z.string().max(200).default(''),
    cost: money,
    otherCost: money,
    durationMonths: z.number().int().min(1).max(120),
    monthsWithoutIncome: z.number().int().min(0).max(120),
    monthlyIncomeDelta: z.number().int().min(-10_000_000_000).max(10_000_000_000),
  }).refine((o) => o.monthsWithoutIncome <= o.durationMonths, { message: 'Số tháng không có thu nhập vượt quá thời gian thực hiện' }),
  reason: z.string().max(300),
});

/** Luật cảnh báo giá (bảng alert_rules). */
export const alertRulePayload = z.object({
  symbol: z.string().regex(/^[A-Z][A-Z0-9]{1,9}$/),
  label: z.string().max(40),
  direction: z.enum(['down', 'up']),
  thresholdPct: z.number().positive().max(100),
});

export interface ActionDef<S extends z.ZodTypeAny = z.ZodTypeAny> {
  agent: AgentKey;
  integration: ActionIntegration | 'google_calendar_or_local';
  risk: ActionRisk;
  schema: S;
  preview: (p: z.infer<S>) => ActionPreview;
}

const vnd = (n: number) => formatVndFull(n);
const hhmm = (s: string) => s.slice(11, 16);
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

const pctText = (n: number) => `${String(Math.round(n * 10) / 10).replace('.', ',')}%`;

const def = <S extends z.ZodTypeAny>(d: ActionDef<S>) => d;

export const ACTION_TYPES = {
  'calendar.create_events': def({
    agent: 'calendar', integration: 'google_calendar_or_local', risk: 'low', schema: calendarEventsPayload,
    preview: (p) => ({ lines: p.events.map((e) => `${ddmm(e.startsAt.slice(0, 10))} ${hhmm(e.startsAt)}–${hhmm(e.endsAt)} · ${e.title}`) }),
  }),
  'budget.set': def({
    agent: 'cashflow', integration: 'local', risk: 'mid', schema: budgetPayload,
    preview: (p) => ({ before: p.limitBefore === null ? null : vnd(p.limitBefore), after: vnd(p.limit), lines: [p.reason] }),
  }),
  'goal.update_progress': def({
    agent: 'goal', integration: 'local', risk: 'mid', schema: goalPayload,
    preview: (p) => ({ before: `${vnd(p.monthlyBefore)}/tháng`, after: `${vnd(p.monthlyAfter)}/tháng`, lines: [p.reason] }),
  }),
  'reminder.create': def({
    agent: 'skill', integration: 'local', risk: 'low', schema: reminderPayload,
    preview: (p) => {
      const range = `${ddmm(p.dates[0])}–${ddmm(p.dates[p.dates.length - 1])}`;
      // Ngày cách nhau đúng 1 ngày → nhắc mỗi ngày; còn lại (vd mùng 5 hằng tháng) → số lần nhắc
      const daily = p.dates.every((d, i) => i === 0 || Date.parse(d) - Date.parse(p.dates[i - 1]) === 86_400_000);
      return { lines: [daily ? `${p.time} mỗi ngày · ${p.dates.length} ngày (${range})` : `${p.time} · ${p.dates.length} lần nhắc (${range})`] };
    },
  }),
  'gmail.send': def({
    agent: 'planner', integration: 'gmail', risk: 'high', schema: gmailPayload,
    preview: (p) => ({ lines: [`Tới: ${p.recipients.join(', ')}`, `Tiêu đề: ${p.subject}`] }),
  }),
  'sheets.update_budget': def({
    agent: 'cashflow', integration: 'google_sheets', risk: 'mid', schema: sheetsPayload,
    preview: (p) => ({ after: vnd(p.limit), lines: [`Tháng ${p.month.slice(5)}/${p.month.slice(0, 4)}`] }),
  }),
  'life_choice.create': def({
    agent: 'goal', integration: 'local', risk: 'low', schema: lifeChoicePayload,
    preview: (p) => ({
      after: p.option.title,
      lines: [
        `Thời gian: ${p.option.durationMonths} tháng`,
        ...(p.option.cost ? [`Chi phí chính: ${vnd(p.option.cost)}`] : []),
        ...(p.option.otherCost ? [`Chi phí khác trong thời gian thực hiện: ${vnd(p.option.otherCost)}`] : []),
        p.option.monthsWithoutIncome ? `${p.option.monthsWithoutIncome} tháng không có thu nhập` : p.option.monthlyIncomeDelta < 0 ? `Thu nhập giảm ${vnd(-p.option.monthlyIncomeDelta)}/tháng` : 'Vẫn giữ thu nhập',
        p.reason,
      ],
    }),
  }),
  'alert_rule.create': def({
    agent: 'planner', integration: 'local', risk: 'low', schema: alertRulePayload,
    preview: (p) => ({ after: `Báo khi ${p.label} ${p.direction === 'down' ? 'giảm' : 'tăng'} từ ${pctText(p.thresholdPct)} trở lên`, lines: ['Chỉ báo tin, không tự mua bán'] }),
  }),
  'notion.weekly_report': def({
    agent: 'planner', integration: 'notion', risk: 'low', schema: notionPayload,
    preview: (p) => ({ lines: p.sections }),
  }),
} as const;

export type ActionType = keyof typeof ACTION_TYPES;
export const isActionType = (t: string): t is ActionType => t in ACTION_TYPES;

/** Kiểm tra payload theo schema của loại hành động; lỗi → throw (không lưu / không chạy). */
export function validateAction<T extends ActionType>(type: T, payload: unknown): z.infer<(typeof ACTION_TYPES)[T]['schema']> {
  return (ACTION_TYPES[type].schema as z.ZodTypeAny).parse(payload) as z.infer<(typeof ACTION_TYPES)[T]['schema']>;
}

export function previewAction(type: ActionType, payload: unknown): ActionPreview {
  const d = ACTION_TYPES[type] as ActionDef;
  return d.preview(d.schema.parse(payload));
}
