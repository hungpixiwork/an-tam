// Lựa chọn cuộc đời B1. Mount: /api/life-choices
// Danh sách + CRUD (Tổng quan dùng lựa chọn ghim), mẫu tình huống, đánh giá / so sánh phương án,
// điều kiện tiên quyết, kế hoạch hành động. Điểm khả thi tính khi đọc (shared/engine/lifeChoice.ts), không lưu.

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type {
  LifeChoice, LifeChoiceCompare, LifeChoiceDetail, LifeChoiceKind, LifeChoiceOptionInput, LifeChoicePrereq, LifeChoiceTask,
} from '../../shared/types/api';
import type { UserState } from '../../shared/types/domain';
import type { FinancialSignals } from '../../shared/types/api/signals';
import { autoPrereq, evaluateLifeChoice, previewLifeChoice } from '../../shared/engine/lifeChoice';
import { LIFE_CHOICE_TEMPLATES, lifeChoiceTemplate } from '../../shared/data/life-choice-templates';
import { ApiError, notFound, ok } from '../lib/http';
import { body, money } from '../lib/validate';
import { loadUserState } from '../lib/state';
import { loadSignals } from './signals';
import { addMonths, monthsBetween } from '../../shared/engine/month';

const KINDS = ['study', 'care', 'startup', 'switch', 'sabbatical', 'custom'] as const;
const TEMPLATE_KEYS = ['study', 'care', 'startup', 'switch', 'sabbatical'] as const;
const TASK_CATEGORIES = ['finance', 'career', 'time'] as const;
/** Danh mục thu nhập tính là "làm thêm" (sổ thu chi). */
const SIDE_INCOME_CATEGORIES = ['freelance', 'business'];

const choiceSchema = z
  .object({
    title: z.string().trim().min(2, 'Tên lựa chọn quá ngắn').max(80),
    description: z.string().trim().max(200).default(''),
    icon: z.string().trim().max(40).default('graduation-cap'),
    cost: money.default(0),
    steps: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
    currentStep: z.number().int().min(0).default(0),
    pinned: z.boolean().default(false),
    kind: z.enum(KINDS).optional(),
    outcome: z.string().trim().max(200).optional(),
    incomeUpliftPct: z.number().int().min(-100).max(300).optional(),
    template: z.enum(TEMPLATE_KEYS).optional(),
  })
  .refine((c) => c.currentStep <= c.steps.length || c.template, { message: 'Mốc hiện tại vượt quá số mốc', path: ['currentStep'] });

const patchSchema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(200).optional(),
  icon: z.string().trim().max(40).optional(),
  cost: money.optional(),
  steps: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  currentStep: z.number().int().min(0).optional(),
  pinned: z.boolean().optional(),
  status: z.enum(['active', 'done', 'archived']).optional(),
  outcome: z.string().trim().max(200).optional(),
  incomeUpliftPct: z.number().int().min(-100).max(300).optional(),
});

const optionSchema = z
  .object({
    title: z.string().trim().min(2, 'Tên phương án quá ngắn').max(80),
    description: z.string().trim().max(200).default(''),
    cost: money.default(0),
    otherCost: money.default(0),
    durationMonths: z.number().int().min(1).max(120).default(12),
    monthsWithoutIncome: z.number().int().min(0).max(120).default(0),
    monthlyIncomeDelta: z.number().int().min(-10_000_000_000).max(10_000_000_000).default(0),
    cutPct: z.number().min(0).max(0.9).optional(),
    startMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Tháng không hợp lệ').nullable().optional(),
  })
  .refine((o) => o.monthsWithoutIncome <= o.durationMonths, { message: 'Số tháng không có thu nhập vượt quá thời gian thực hiện', path: ['monthsWithoutIncome'] });

const optionPatchSchema = z.object({
  selected: z.literal(true).optional(),
  title: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(200).optional(),
  cost: money.optional(),
  otherCost: money.optional(),
  durationMonths: z.number().int().min(1).max(120).optional(),
  monthsWithoutIncome: z.number().int().min(0).max(120).optional(),
  monthlyIncomeDelta: z.number().int().optional(),
  cutPct: z.number().min(0).max(0.9).optional(),
  startMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Tháng không hợp lệ').nullable().optional(),
});

const prereqSchema = z.object({ title: z.string().trim().min(2, 'Nội dung quá ngắn').max(120), done: z.boolean().default(false) });
const prereqPatchSchema = z.object({ title: z.string().trim().min(2).max(120).optional(), done: z.boolean().optional() });
const taskSchema = z.object({
  title: z.string().trim().min(2, 'Tên việc quá ngắn').max(80),
  detail: z.string().trim().max(160).default(''),
  priority: z.enum(['high', 'mid', 'low']).default('mid'),
  category: z.enum(TASK_CATEGORIES).default('finance'),
  today: z.boolean().default(false),
});
const taskPatchSchema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  detail: z.string().trim().max(160).optional(),
  priority: z.enum(['high', 'mid', 'low']).optional(),
  category: z.enum(TASK_CATEGORIES).optional(),
  today: z.boolean().optional(),
  done: z.boolean().optional(),
});

const evaluateSchema = z.union([
  z.object({ choiceId: z.string().min(1), optionId: z.string().min(1).optional() }),
  z.object({
    option: optionSchema,
    kind: z.enum(KINDS).default('custom'),
    incomeUpliftPct: z.number().int().min(-100).max(300).default(0),
    prereqsDone: z.number().int().min(0).default(0),
    prereqsTotal: z.number().int().min(0).default(0),
  }),
]);
const compareSchema = z.union([
  z.object({ choiceId: z.string().min(1) }),
  z.object({
    options: z.array(optionSchema).min(2).max(4),
    kind: z.enum(KINDS).default('custom'),
    incomeUpliftPct: z.number().int().min(-100).max(300).default(0),
  }),
]);

export interface Row {
  id: string; title: string; description: string; icon: string; cost: number;
  steps_json: string; current_step: number; pinned: number; status: LifeChoice['status'];
  kind: LifeChoiceKind; outcome: string; income_uplift_pct: number;
}
interface OptionRow {
  id: string; title: string; description: string; cost: number; other_cost: number; duration_months: number;
  months_without_income: number; monthly_income_delta: number; selected: number;
  cut_pct: number | null; start_month: string | null;
}
interface PrereqRow { id: string; title: string; done: number; auto_key: string | null }
interface TaskRow {
  id: string; title: string; detail: string; priority: LifeChoiceTask['priority']; done: number;
  category: LifeChoiceTask['category']; today: number;
}

const toChoice = (r: Row): LifeChoice => {
  let steps: string[] = [];
  try {
    const parsed = JSON.parse(r.steps_json);
    if (Array.isArray(parsed)) steps = parsed.map(String);
  } catch {
    /* dữ liệu hỏng → coi như chưa có mốc */
  }
  return {
    id: r.id, title: r.title, description: r.description, icon: r.icon, cost: r.cost,
    steps, currentStep: Math.min(r.current_step, steps.length), pinned: r.pinned === 1, status: r.status,
    kind: r.kind ?? 'custom', outcome: r.outcome ?? '', incomeUpliftPct: r.income_uplift_pct ?? 0,
  };
};
const toOptionInput = (o: OptionRow): LifeChoiceOptionInput => ({
  title: o.title, description: o.description, cost: o.cost, otherCost: o.other_cost, durationMonths: o.duration_months,
  monthsWithoutIncome: o.months_without_income, monthlyIncomeDelta: o.monthly_income_delta,
  ...(o.cut_pct !== null && o.cut_pct !== undefined ? { cutPct: o.cut_pct } : {}),
  startMonth: o.start_month ?? null,
});

export const SELECT = 'SELECT id, title, description, icon, cost, steps_json, current_step, pinned, status, kind, outcome, income_uplift_pct FROM life_choices';

/** Lựa chọn được ghim (hoặc lựa chọn đang theo đuổi mới nhất) để hiện ở Tổng quan. */
export async function loadPinnedLifeChoice(db: D1Database, userId: string): Promise<LifeChoice | null> {
  const row = await db.prepare(`${SELECT} WHERE user_id = ? AND status = 'active' ORDER BY pinned DESC, created_at DESC LIMIT 1`).bind(userId).first<Row>();
  return row ? toChoice(row) : null;
}

export async function ownChoice(db: D1Database, id: string, userId: string): Promise<Row> {
  const row = await db.prepare(`${SELECT} WHERE id = ? AND user_id = ?`).bind(id, userId).first<Row>();
  if (!row) throw notFound('Không tìm thấy lựa chọn');
  return row;
}

/** Điều kiện tiên quyết (điều kiện tự kiểm tra lấy trạng thái từ dữ liệu tài chính). */
const toPrereqs = (rows: PrereqRow[], state: UserState): LifeChoicePrereq[] =>
  rows.map((p) => {
    if (!p.auto_key) return { id: p.id, title: p.title, done: p.done === 1, autoKey: null };
    const a = autoPrereq(state, p.auto_key);
    return { id: p.id, title: p.title, done: a.done, autoKey: p.auto_key, params: a.params };
  });

export async function loadDetail(db: D1Database, row: Row, userId: string, cached?: { state: Awaited<ReturnType<typeof loadUserState>>; signals: FinancialSignals }): Promise<LifeChoiceDetail> {
  const [options, prereqs, tasks] = await db.batch([
    db.prepare('SELECT * FROM life_choice_options WHERE choice_id = ? ORDER BY order_idx, rowid').bind(row.id),
    db.prepare('SELECT id, title, done, auto_key FROM life_choice_prereqs WHERE choice_id = ? ORDER BY order_idx, rowid').bind(row.id),
    db.prepare('SELECT id, title, detail, priority, done, category, today FROM life_choice_tasks WHERE choice_id = ? ORDER BY order_idx, rowid').bind(row.id),
  ]);
  const state = cached?.state ?? await loadUserState(db, userId);
  const choice = toChoice(row);
  const pre = toPrereqs(prereqs.results as unknown as PrereqRow[], state);
  const signals = cached?.signals ?? await loadSignals(db, userId, state);
  const ctx = { kind: choice.kind, incomeUpliftPct: choice.incomeUpliftPct, prereqsDone: pre.filter((p) => p.done).length, prereqsTotal: pre.length, signals };
  const opts = (options.results as unknown as OptionRow[]).map((o) => ({
    id: o.id, selected: o.selected === 1, ...toOptionInput(o), evaluation: evaluateLifeChoice(state, toOptionInput(o), ctx),
  }));
  if (opts.length && !opts.some((o) => o.selected)) opts[0].selected = true;
  const best = opts.reduce<(typeof opts)[number] | null>((b, o) => (!b || o.evaluation.feasibility > b.evaluation.feasibility ? o : b), null);
  return {
    ...choice,
    monthlyIncome: state.profile.monthlyIncome,
    monthlyExpense: state.profile.monthlyExpense,
    options: opts,
    prereqs: pre,
    tasks: (tasks.results as unknown as TaskRow[]).map((t) => ({
      id: t.id, title: t.title, detail: t.detail, priority: t.priority, category: t.category ?? 'finance', today: t.today === 1, done: t.done === 1,
    })),
    recommendedOptionId: best?.id ?? null,
  };
}

const insertOption = (db: D1Database, choiceId: string, o: LifeChoiceOptionInput, idx: number, selected: boolean) =>
  db.prepare(
    `INSERT INTO life_choice_options (id, choice_id, title, description, cost, other_cost, duration_months, months_without_income, monthly_income_delta, selected, order_idx, cut_pct, start_month)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(), choiceId, o.title, o.description ?? '', o.cost, o.otherCost, o.durationMonths, o.monthsWithoutIncome, o.monthlyIncomeDelta,
    selected ? 1 : 0, idx, o.cutPct ?? null, o.startMonth ?? null,
  );

export interface NewLifeChoice {
  title: string; description?: string; icon?: string; cost?: number; steps?: string[]; currentStep?: number; pinned?: boolean;
  kind?: LifeChoiceKind; outcome?: string; incomeUpliftPct?: number; template?: (typeof TEMPLATE_KEYS)[number];
}

/**
 * Lệnh ghi một lựa chọn mới (+ phương án / điều kiện / việc cần làm từ mẫu nếu có).
 * `options` có giá trị → dùng thay cho phương án của mẫu (agent tạo từ câu hỏi của người dùng).
 */
export function lifeChoiceInsertStatements(db: D1Database, userId: string, id: string, v: NewLifeChoice, options?: LifeChoiceOptionInput[]): D1PreparedStatement[] {
  const tpl = v.template ? lifeChoiceTemplate(v.template) : undefined;
  const steps = v.steps?.length ? v.steps : (tpl?.steps ?? []);
  const icon = v.icon ?? 'graduation-cap';
  const insert = db.prepare(
    `INSERT INTO life_choices (id, user_id, title, description, icon, cost, steps_json, current_step, pinned, kind, outcome, income_uplift_pct)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, userId, v.title, v.description || tpl?.description || '', tpl && icon === 'graduation-cap' ? tpl.icon : icon, v.cost || tpl?.cost || 0,
    JSON.stringify(steps), Math.min(v.currentStep ?? 0, steps.length), v.pinned ? 1 : 0,
    v.kind ?? tpl?.key ?? 'custom', v.outcome ?? tpl?.outcome ?? '', v.incomeUpliftPct ?? tpl?.incomeUpliftPct ?? 0,
  );
  const stmts = [...(v.pinned ? [db.prepare('UPDATE life_choices SET pinned = 0 WHERE user_id = ?').bind(userId)] : []), insert];
  if (options) options.forEach((o, i) => stmts.push(insertOption(db, id, o, i, i === 0)));
  if (tpl) {
    // Học phí người dùng nhập áp cho mọi phương án của mẫu
    if (!options) tpl.options.forEach((o, i) => stmts.push(insertOption(db, id, v.cost ? { ...o, cost: v.cost } : o, i, i === 0)));
    tpl.prereqs.forEach((p, i) =>
      stmts.push(db.prepare('INSERT INTO life_choice_prereqs (id, choice_id, title, auto_key, order_idx) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, p.title, p.autoKey ?? null, i)),
    );
    tpl.tasks.forEach((t, i) =>
      stmts.push(db.prepare('INSERT INTO life_choice_tasks (id, choice_id, title, detail, priority, category, order_idx) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, t.title, t.detail, t.priority, t.category ?? 'finance', i)),
    );
  }
  return stmts;
}

/** Thu nhập làm thêm trung bình 3 tháng gần nhất + số tháng đã chuẩn bị từ lúc tạo lựa chọn. */
async function choiceProgress(db: D1Database, userId: string, choiceId: string, today: string) {
  const [side, created] = await db.batch([
    db.prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
      WHERE user_id = ? AND kind = 'income' AND category IN (${SIDE_INCOME_CATEGORIES.map(() => '?').join(', ')}) AND occurred_on >= ? AND occurred_on < ?`)
      .bind(userId, ...SIDE_INCOME_CATEGORIES, `${addMonths(today, -3)}-01`, `${today}-01`),
    db.prepare('SELECT substr(created_at, 1, 7) AS month FROM life_choices WHERE id = ?').bind(choiceId),
  ]);
  const total = Number((side.results[0] as { total?: number } | undefined)?.total ?? 0);
  const month = (created.results[0] as { month?: string } | undefined)?.month;
  return { sideIncome: Math.round(total / 3), elapsedMonths: month ? Math.max(0, monthsBetween(month, today)) : 0 };
}

const nextIdx = async (db: D1Database, table: string, choiceId: string) =>
  ((await db.prepare(`SELECT COALESCE(MAX(order_idx), -1) + 1 AS n FROM ${table} WHERE choice_id = ?`).bind(choiceId).first<{ n: number }>())?.n ?? 0);

export const lifeChoices = new Hono<AppEnv>()
  // Đường dẫn tĩnh (templates, evaluate, compare) khai báo trước '/:id'
  .get('/templates', (c) => ok(c, LIFE_CHOICE_TEMPLATES))
  .post('/evaluate', body(evaluateSchema), async (c) => {
    const v = c.req.valid('json');
    const db = c.env.DB;
    const userId = c.get('userId');
    if ('choiceId' in v) {
      const detail = await loadDetail(db, await ownChoice(db, v.choiceId, userId), userId);
      const opt = v.optionId ? detail.options.find((o) => o.id === v.optionId) : detail.options.find((o) => o.selected);
      if (!opt) throw notFound('Không tìm thấy phương án');
      return ok(c, opt.evaluation);
    }
    const state = await loadUserState(db, userId);
    return ok(c, evaluateLifeChoice(state, v.option, { ...v, signals: await loadSignals(db, userId, state) }));
  })
  .post('/compare', body(compareSchema), async (c) => {
    const v = c.req.valid('json');
    const db = c.env.DB;
    const userId = c.get('userId');
    let result: LifeChoiceCompare['options'];
    if ('choiceId' in v) {
      const detail = await loadDetail(db, await ownChoice(db, v.choiceId, userId), userId);
      result = detail.options.map(({ id: _id, selected: _s, ...o }) => o);
    } else {
      const state = await loadUserState(db, userId);
      const signals = await loadSignals(db, userId, state);
      result = v.options.map((o) => ({ ...o, evaluation: evaluateLifeChoice(state, o, { kind: v.kind, incomeUpliftPct: v.incomeUpliftPct, prereqsDone: 0, prereqsTotal: 0, signals }) }));
    }
    const recommendedIndex = result.reduce((b, o, i) => (o.evaluation.feasibility > result[b].evaluation.feasibility ? i : b), 0);
    return ok<LifeChoiceCompare>(c, { options: result, recommendedIndex });
  })
  .get('/', async (c) => {
    const { results } = await c.env.DB.prepare(`${SELECT} WHERE user_id = ? ORDER BY pinned DESC, created_at DESC`).bind(c.get('userId')).all<Row>();
    return ok(c, results.map(toChoice));
  })
  .post('/', body(choiceSchema), async (c) => {
    const v = c.req.valid('json');
    const db = c.env.DB;
    const userId = c.get('userId');
    const id = crypto.randomUUID();
    await db.batch(lifeChoiceInsertStatements(db, userId, id, v));
    return ok(c, { id }, 201);
  })
  .get('/:id/preview', async (c) => {
    const mode = z.enum(['bull', 'base', 'bear']).safeParse(c.req.query('mode') ?? 'base');
    if (!mode.success) throw new ApiError(400, 'invalid_input', 'Kịch bản không hợp lệ');
    const db = c.env.DB;
    const userId = c.get('userId');
    const row = await ownChoice(db, c.req.param('id'), userId);
    const state = await loadUserState(db, userId);
    if (state.profile.monthlyExpense <= 0) throw new ApiError(422, 'missing_data', 'Cần nhập chi tiêu hàng tháng để tính kịch bản');
    const signals = await loadSignals(db, userId, state);
    const detail = await loadDetail(db, row, userId, { state, signals });
    const option = detail.options.find((o) => o.selected) ?? detail.options[0];
    if (!option) throw new ApiError(422, 'missing_data', 'Lựa chọn chưa có phương án để phân tích');
    const { id: optionId, evaluation: _evaluation, selected: _selected, ...input } = option;
    return ok(c, previewLifeChoice(state, optionId, input, {
      kind: detail.kind, incomeUpliftPct: detail.incomeUpliftPct,
      prereqsDone: detail.prereqs.filter((p) => p.done).length,
      prereqsTotal: detail.prereqs.length, signals,
    }, mode.data, await choiceProgress(db, userId, row.id, state.today)));
  })
  .get('/:id', async (c) => {
    const db = c.env.DB;
    const userId = c.get('userId');
    return ok(c, await loadDetail(db, await ownChoice(db, c.req.param('id'), userId), userId));
  })
  .patch('/:id', body(patchSchema), async (c) => {
    const v = c.req.valid('json');
    const userId = c.get('userId');
    const id = c.req.param('id');
    const row = await ownChoice(c.env.DB, id, userId);
    const steps = v.steps ?? toChoice(row).steps;
    if ((v.currentStep ?? row.current_step) > steps.length) throw new ApiError(400, 'invalid_input', 'Mốc hiện tại vượt quá số mốc');
    const cols: Record<string, unknown> = {
      title: v.title, description: v.description, icon: v.icon, cost: v.cost,
      steps_json: v.steps ? JSON.stringify(v.steps) : undefined, current_step: v.currentStep,
      pinned: v.pinned === undefined ? undefined : v.pinned ? 1 : 0, status: v.status,
      outcome: v.outcome, income_uplift_pct: v.incomeUpliftPct,
    };
    const entries = Object.entries(cols).filter(([, x]) => x !== undefined);
    if (!entries.length) return ok(c, null);
    const update = c.env.DB.prepare(`UPDATE life_choices SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`).bind(...entries.map(([, x]) => x), id, userId);
    await c.env.DB.batch(v.pinned ? [c.env.DB.prepare('UPDATE life_choices SET pinned = 0 WHERE user_id = ?').bind(userId), update] : [update]);
    return ok(c, null);
  })
  .delete('/:id', async (c) => {
    const res = await c.env.DB.prepare('DELETE FROM life_choices WHERE id = ? AND user_id = ?').bind(c.req.param('id'), c.get('userId')).run();
    if (!res.meta.changes) throw notFound('Không tìm thấy lựa chọn');
    return ok(c, null);
  })
  /* ───────── Phương án ───────── */
  .post('/:id/options', body(optionSchema), async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');
    await ownChoice(db, id, c.get('userId'));
    const count = (await db.prepare('SELECT COUNT(*) AS n FROM life_choice_options WHERE choice_id = ?').bind(id).first<{ n: number }>())?.n ?? 0;
    if (count >= 4) throw new ApiError(400, 'invalid_input', 'Tối đa 4 phương án');
    await insertOption(db, id, c.req.valid('json'), await nextIdx(db, 'life_choice_options', id), count === 0).run();
    return ok(c, null, 201);
  })
  .patch('/:id/options/:optionId', body(optionPatchSchema), async (c) => {
    const v = c.req.valid('json');
    const db = c.env.DB;
    const id = c.req.param('id');
    const optionId = c.req.param('optionId');
    await ownChoice(db, id, c.get('userId'));
    const cur = await db.prepare('SELECT * FROM life_choice_options WHERE id = ? AND choice_id = ?').bind(optionId, id).first<OptionRow>();
    if (!cur) throw notFound('Không tìm thấy phương án');
    if ((v.monthsWithoutIncome ?? cur.months_without_income) > (v.durationMonths ?? cur.duration_months)) {
      throw new ApiError(400, 'invalid_input', 'Số tháng không có thu nhập vượt quá thời gian thực hiện');
    }
    const cols: Record<string, unknown> = {
      title: v.title, description: v.description, cost: v.cost, other_cost: v.otherCost, duration_months: v.durationMonths,
      months_without_income: v.monthsWithoutIncome, monthly_income_delta: v.monthlyIncomeDelta, selected: v.selected ? 1 : undefined,
      cut_pct: v.cutPct, start_month: v.startMonth,
    };
    const entries = Object.entries(cols).filter(([, x]) => x !== undefined);
    const stmts = [];
    if (v.selected) stmts.push(db.prepare('UPDATE life_choice_options SET selected = 0 WHERE choice_id = ?').bind(id));
    if (entries.length) stmts.push(db.prepare(`UPDATE life_choice_options SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ? AND choice_id = ?`).bind(...entries.map(([, x]) => x), optionId, id));
    if (stmts.length) await db.batch(stmts);
    return ok(c, null);
  })
  .delete('/:id/options/:optionId', async (c) => {
    const id = c.req.param('id');
    await ownChoice(c.env.DB, id, c.get('userId'));
    const res = await c.env.DB.prepare('DELETE FROM life_choice_options WHERE id = ? AND choice_id = ?').bind(c.req.param('optionId'), id).run();
    if (!res.meta.changes) throw notFound('Không tìm thấy phương án');
    return ok(c, null);
  })
  /* ───────── Điều kiện tiên quyết ───────── */
  .post('/:id/prereqs', body(prereqSchema), async (c) => {
    const v = c.req.valid('json');
    const db = c.env.DB;
    const id = c.req.param('id');
    await ownChoice(db, id, c.get('userId'));
    const pid = crypto.randomUUID();
    await db.prepare('INSERT INTO life_choice_prereqs (id, choice_id, title, done, order_idx) VALUES (?, ?, ?, ?, ?)')
      .bind(pid, id, v.title, v.done ? 1 : 0, await nextIdx(db, 'life_choice_prereqs', id)).run();
    return ok(c, { id: pid }, 201);
  })
  .patch('/:id/prereqs/:prereqId', body(prereqPatchSchema), async (c) => {
    const v = c.req.valid('json');
    const db = c.env.DB;
    const id = c.req.param('id');
    await ownChoice(db, id, c.get('userId'));
    const cur = await db.prepare('SELECT auto_key FROM life_choice_prereqs WHERE id = ? AND choice_id = ?').bind(c.req.param('prereqId'), id).first<{ auto_key: string | null }>();
    if (!cur) throw notFound('Không tìm thấy điều kiện');
    if (cur.auto_key && v.done !== undefined) throw new ApiError(400, 'invalid_input', 'Điều kiện này được tự kiểm tra từ dữ liệu tài chính của bạn');
    const cols: Record<string, unknown> = { title: v.title, done: v.done === undefined ? undefined : v.done ? 1 : 0 };
    const entries = Object.entries(cols).filter(([, x]) => x !== undefined);
    if (entries.length) await db.prepare(`UPDATE life_choice_prereqs SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ? AND choice_id = ?`).bind(...entries.map(([, x]) => x), c.req.param('prereqId'), id).run();
    return ok(c, null);
  })
  .delete('/:id/prereqs/:prereqId', async (c) => {
    const id = c.req.param('id');
    await ownChoice(c.env.DB, id, c.get('userId'));
    const res = await c.env.DB.prepare('DELETE FROM life_choice_prereqs WHERE id = ? AND choice_id = ?').bind(c.req.param('prereqId'), id).run();
    if (!res.meta.changes) throw notFound('Không tìm thấy điều kiện');
    return ok(c, null);
  })
  /* ───────── Kế hoạch hành động ───────── */
  .post('/:id/tasks', body(taskSchema), async (c) => {
    const v = c.req.valid('json');
    const db = c.env.DB;
    const id = c.req.param('id');
    await ownChoice(db, id, c.get('userId'));
    const tid = crypto.randomUUID();
    await db.prepare('INSERT INTO life_choice_tasks (id, choice_id, title, detail, priority, category, today, order_idx) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(tid, id, v.title, v.detail, v.priority, v.category, v.today ? 1 : 0, await nextIdx(db, 'life_choice_tasks', id)).run();
    return ok(c, { id: tid }, 201);
  })
  .patch('/:id/tasks/:taskId', body(taskPatchSchema), async (c) => {
    const v = c.req.valid('json');
    const db = c.env.DB;
    const id = c.req.param('id');
    await ownChoice(db, id, c.get('userId'));
    const cols: Record<string, unknown> = {
      title: v.title, detail: v.detail, priority: v.priority, category: v.category,
      today: v.today === undefined ? undefined : v.today ? 1 : 0, done: v.done === undefined ? undefined : v.done ? 1 : 0,
    };
    const entries = Object.entries(cols).filter(([, x]) => x !== undefined);
    if (!entries.length) return ok(c, null);
    const res = await db.prepare(`UPDATE life_choice_tasks SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ? AND choice_id = ?`).bind(...entries.map(([, x]) => x), c.req.param('taskId'), id).run();
    if (!res.meta.changes) throw notFound('Không tìm thấy việc cần làm');
    return ok(c, null);
  })
  .delete('/:id/tasks/:taskId', async (c) => {
    const id = c.req.param('id');
    await ownChoice(c.env.DB, id, c.get('userId'));
    const res = await c.env.DB.prepare('DELETE FROM life_choice_tasks WHERE id = ? AND choice_id = ?').bind(c.req.param('taskId'), id).run();
    if (!res.meta.changes) throw notFound('Không tìm thấy việc cần làm');
    return ok(c, null);
  });
