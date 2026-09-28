// Công cụ MCP của An Tâm: đọc qua route có sẵn (internal.ts), ghi DUY NHẤT qua propose_action (việc chờ duyệt).
// Mọi lượt gọi: chặn theo gói (shared/plans.ts `mcp`) → trừ 1 lượt AI loại 'mcp' → chạy → che dữ liệu → audit_log (actor 'mcp').
// Không có công cụ duyệt: người dùng duyệt trong app.

import { z } from 'zod';
import type { Env } from '../env';
import { PLANS } from '../../shared/plans';
import { ACTION_TYPES, isActionType, previewAction, validateAction } from '../../shared/agent/actions';
import { sanitizePrompt } from '../../shared/agent/sanitize';
import { batchWithAudit, maskSummary, writeAudit } from '../lib/audit';
import { consumeAi, userPlan } from '../lib/usage';
import { ACTION_TTL_MS } from '../agents/runner';
import { callRoute, RouteError } from './internal';

/** Props lưu trong grant OAuth (worker/mcp/authorize.ts → completeAuthorization). */
export interface McpProps { userId: string; clientName: string }

export const MCP_PLAN_ERROR = 'Tính năng MCP cần gói Plus';

export class ToolError extends Error {}

interface ToolCtx { env: Env; userId: string; clientName: string }

export interface ToolDef<S extends z.ZodObject = z.ZodObject> {
  name: string;
  description: string;
  input: S;
  /** true: công cụ tự ghi audit (cùng batch với lệnh ghi). */
  selfAudit?: boolean;
  run: (ctx: ToolCtx, args: z.infer<S>) => Promise<unknown>;
}

const tool = <S extends z.ZodObject>(d: ToolDef<S>) => d as unknown as ToolDef;
const q = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
  return s ? `?${s}` : '';
};

const month = z.string().regex(/^\d{4}-\d{2}$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const TYPE_TITLE: Record<string, string> = {
  'calendar.create_events': 'Thêm lịch',
  'budget.set': 'Đặt ngân sách tháng',
  'goal.update_progress': 'Đổi số để dành cho mục tiêu',
  'reminder.create': 'Tạo nhắc việc',
  'gmail.send': 'Gửi email',
  'sheets.update_budget': 'Cập nhật ngân sách trên Google Sheets',
  'notion.weekly_report': 'Tạo báo cáo tuần trên Notion',
};

export const TOOLS: ToolDef[] = [
  tool({
    name: 'get_overview',
    description:
      "Get the user's financial overview (same data as the app's home page): net worth, this month's income/expense, safety fund months, goals progress, alerts and suggestions. Money values are integer VND.",
    input: z.object({ rangeMonths: z.union([z.literal(6), z.literal(12)]).optional().describe('Net-worth chart range in months (6 or 12). Default 12.') }),
    run: ({ env, userId }, a) => callRoute(env, userId, `/overview${q({ range: a.rangeMonths })}`),
  }),
  tool({
    name: 'get_signals',
    description:
      "Get the user's combined financial profile: 3/6-month average income and its stability, fixed vs flexible spending, real monthly savings, cash available now, and how reliable the data is. Money values are integer VND.",
    input: z.object({}),
    run: ({ env, userId }) => callRoute(env, userId, '/signals'),
  }),
  tool({
    name: 'get_ledger',
    description: 'Get the income/expense ledger for one month: totals, change vs previous month, budget, spending by category, 6-month trend, recent transactions and upcoming bills. Money values are integer VND.',
    input: z.object({ month: month.optional().describe('Month as YYYY-MM. Default: current month (Vietnam time).') }),
    run: ({ env, userId }, a) => callRoute(env, userId, `/ledger/dashboard${q({ month: a.month })}`),
  }),
  tool({
    name: 'get_goals',
    description: "Get the user's savings goals with target, current amount, monthly contribution and projected completion. Money values are integer VND.",
    input: z.object({}),
    run: ({ env, userId }) => callRoute(env, userId, '/goals/summary'),
  }),
  tool({
    name: 'get_calendar_week',
    description: "Get the user's calendar for one week (Monday start): events, pending schedule proposals and Google Calendar sync status.",
    input: z.object({ week: day.optional().describe('Any date (YYYY-MM-DD) inside the wanted week. Default: this week.') }),
    run: ({ env, userId }, a) => callRoute(env, userId, `/calendar${q({ week: a.week })}`),
  }),
  tool({
    name: 'get_market',
    description:
      'Get Vietnamese market data relevant to the user: quotes for gold (SJC), VN-Index, USD and CNY rates plus every symbol the user holds, market breadth and recent news headlines. Prices are VND. This is information, not investment advice.',
    input: z.object({}),
    run: ({ env, userId }) => callRoute(env, userId, '/market'),
  }),
  tool({
    name: 'get_price_history',
    description:
      'Get daily price history and technical indicators (SMA20, SMA50, RSI14, drawdown from peak, volatility) for one symbol. Only symbols the user holds or the fixed market set (e.g. SJC, VNINDEX, USD, CNY) are allowed.',
    input: z.object({
      symbol: z.string().regex(/^[A-Za-z0-9]{1,12}$/).describe('Symbol, e.g. VNINDEX, SJC, FPT.'),
      days: z.number().int().min(5).max(365).optional().describe('Number of days, 5-365. Default 60.'),
    }),
    run: ({ env, userId }, a) => callRoute(env, userId, `/market/history/${a.symbol.toUpperCase()}${q({ days: a.days })}`),
  }),
  tool({
    name: 'evaluate_life_choice',
    description:
      "Evaluate a big life decision (study, caring for family, starting a business, switching careers, sabbatical) against the user's real finances: feasibility score, months the safety fund covers, impact on goals, risks. All money is integer VND.",
    input: z.object({
      option: z.object({
        title: z.string().min(2).max(80).describe('Short name of the option.'),
        description: z.string().max(200).optional(),
        cost: z.number().int().min(0).optional().describe('One-off cost in VND.'),
        otherCost: z.number().int().min(0).optional().describe('Other costs in VND.'),
        durationMonths: z.number().int().min(1).max(120).optional().describe('How long it lasts, in months. Default 12.'),
        monthsWithoutIncome: z.number().int().min(0).max(120).optional().describe('Months with no income during it (<= durationMonths).'),
        monthlyIncomeDelta: z.number().int().optional().describe('Change in monthly income in VND (negative = less).'),
      }),
      kind: z.enum(['study', 'care', 'startup', 'switch', 'sabbatical', 'custom']).optional(),
      incomeUpliftPct: z.number().int().min(-100).max(300).optional().describe('Expected income change afterwards, in percent.'),
    }),
    run: ({ env, userId }, a) => callRoute(env, userId, '/life-choices/evaluate', a),
  }),
  tool({
    name: 'what_if_allocate',
    description:
      "Simulate putting an amount into an asset type and see how the user's concentration risk and safety fund change. Presets: global_etf, vn_etf, tech_stock, bond, gold, real_estate. Money is integer VND. Not investment advice.",
    input: z.object({
      preset: z.enum(['global_etf', 'vn_etf', 'tech_stock', 'bond', 'gold', 'real_estate']),
      amount: z.number().int().positive().describe('Amount in VND.'),
      holdingMonths: z.number().int().min(1).max(600).describe('Planned holding period in months.'),
      fundedFrom: z.enum(['cash', 'new_money']).optional().describe('Use existing cash or new money. Default cash.'),
    }),
    run: ({ env, userId }, a) => callRoute(env, userId, '/portfolio/what-if', a),
  }),
  tool({
    name: 'list_pending_actions',
    description: 'List actions waiting for the user to approve in the An Tâm app (proposed by the in-app agents or by propose_action).',
    input: z.object({}),
    run: ({ env, userId }) => callRoute(env, userId, '/agent/actions?status=pending'),
  }),
  tool({
    name: 'propose_action',
    description:
      "Propose ONE action for the user to approve in the An Tâm app. Nothing is executed: it is saved as pending and the user approves or rejects it in the app (expires after 24h). Types and payloads: " +
      "'budget.set' {month:'YYYY-MM', limitBefore:int|null, limit:int, saving:int, reason}; " +
      "'goal.update_progress' {goalId, goalTitle, monthlyBefore:int, monthlyAfter:int, reason}; " +
      "'reminder.create' {title, time:'HH:MM', dates:['YYYY-MM-DD'], category:'finance'|'skill'|'work'|'rest'|'personal'}; " +
      "'calendar.create_events' {key, rule, reason, priority:'high'|'goal'|'normal', events:[{title, note, category, startsAt:'YYYY-MM-DDTHH:MM', endsAt}]}; " +
      "'sheets.update_budget' {month, limit:int}; 'notion.weekly_report' {title, weekStart:'YYYY-MM-DD', sections:[string]}; 'gmail.send' {recipients, subject, body}. Money is integer VND.",
    input: z.object({
      type: z.enum(Object.keys(ACTION_TYPES) as [string, ...string[]]),
      payload: z.record(z.string(), z.unknown()).describe('Payload matching the chosen type.'),
      note: z.string().max(300).optional().describe('Why you propose this, shown to the user.'),
    }),
    selfAudit: true,
    run: (ctx, a) => proposeAction(ctx, a.type, a.payload, a.note),
  }),
  // ── Điểm đăng ký run_desk(symbol) — Agent G thêm khi merge (worker/desk/*), chỉ đọc: ──
  // tool({ name: 'run_desk', description: '...', input: z.object({ symbol: ... }), run: ({ env, userId }, a) => ... }),
];

export async function proposeAction(ctx: ToolCtx, type: string, payload: unknown, note?: string): Promise<{ id: string; status: 'pending'; expiresAt: string }> {
  const { env, userId, clientName } = ctx;
  if (!isActionType(type)) throw new ToolError(`Unknown action type: ${type}`);
  let valid: unknown;
  try {
    valid = validateAction(type, payload);
  } catch (err) {
    throw new ToolError(`Invalid payload for ${type}: ${err instanceof z.ZodError ? err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') : String(err)}`);
  }
  const d = ACTION_TYPES[type];
  const preview = previewAction(type, valid);
  const reason = note?.trim() ? sanitizePrompt(note.trim()).slice(0, 200) : null;
  if (reason) preview.lines = [...preview.lines, `Lý do (${clientName}): ${reason}`];
  const id = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + ACTION_TTL_MS).toISOString();
  const title = `${TYPE_TITLE[type] ?? type} (đề xuất từ ${clientName})`.slice(0, 120);
  await batchWithAudit(
    env.DB,
    [
      env.DB.prepare(
        `INSERT INTO agent_actions (id, user_id, run_id, source, agent, type, title, payload_json, preview_json, integration, risk, status, requires_approval, created_at, updated_at, expires_at)
         VALUES (?, ?, NULL, 'mcp', ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?, ?)`,
      ).bind(id, userId, d.agent, type, title, JSON.stringify(valid), JSON.stringify(preview), d.integration === 'google_calendar_or_local' ? 'local' : d.integration, d.risk, now.toISOString(), now.toISOString(), expires),
    ],
    {
      userId, actor: 'mcp', agent: 'mcp', action: 'mcp.propose_action', entityType: 'agent_action', entityId: id, actionId: id,
      summaryMasked: maskSummary(`${clientName} đề xuất "${TYPE_TITLE[type] ?? type}" — chờ bạn duyệt`), dataLabel: 'Đề xuất qua MCP', status: 'completed',
    },
    { salt: env.AUDIT_HASH_SALT },
  );
  return { id, status: 'pending', expiresAt: expires };
}

/* ───────── Che dữ liệu nhạy cảm trước khi trả ra ngoài ───────── */

const SECRET_KEY = /email|account_?no|accountnumber|password|token|phone|payout_account/i;
const EMAIL = /[\p{L}\d._%+-]+@[\p{L}\d.-]+\.[\p{L}]{2,}/giu;
/** Dãy ≥ 9 chữ số (có thể cách bằng khoảng trắng / gạch) — số tài khoản, số thẻ, số điện thoại. */
const LONG_DIGITS = /\d(?:[\s-]?\d){8,}/g;

export function redact(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(EMAIL, '[email]').replace(LONG_DIGITS, '[đã ẩn]');
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([k]) => !SECRET_KEY.test(k)).map(([k, v]) => [k, redact(v)]));
  }
  return value;
}

/* ───────── Chạy một công cụ: gói → lượt → chạy → audit ───────── */

export async function runTool(env: Env, props: McpProps, name: string, args: unknown): Promise<unknown> {
  const def = TOOLS.find((t) => t.name === name);
  if (!def) throw new ToolError(`Unknown tool: ${name}`);
  const { userId, clientName } = props;
  const { plan } = await userPlan(env.DB, userId);
  if (!PLANS[plan].mcp) throw new ToolError(MCP_PLAN_ERROR);
  const quota = await consumeAi(env, userId, 'mcp');
  if (!quota.allowed) throw new ToolError(`Đã hết ${quota.limit} lượt AI hôm nay, thử lại vào ngày mai`);

  const audit = (status: 'completed' | 'failed') =>
    writeAudit(env.DB, {
      userId, actor: 'mcp', agent: 'mcp', action: `mcp.${name}`, entityType: 'mcp_tool', entityId: name,
      summaryMasked: maskSummary(`${clientName} gọi công cụ ${name}${status === 'failed' ? ' (lỗi)' : ''}`), dataLabel: 'Dữ liệu tài chính (qua MCP)', status,
    }, { salt: env.AUDIT_HASH_SALT });

  try {
    const parsed = def.input.safeParse(args ?? {});
    if (!parsed.success) throw new ToolError(`Invalid arguments: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    const data = redact(await def.run({ env, userId, clientName }, parsed.data));
    if (!def.selfAudit) await audit('completed');
    return data;
  } catch (err) {
    await audit('failed');
    if (err instanceof ToolError) throw err;
    if (err instanceof RouteError) throw new ToolError(err.message);
    console.error('mcp tool', name, err);
    throw new ToolError('Internal error');
  }
}
