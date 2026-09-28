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
import { autoPrereq, evaluateLifeChoice } from '../../shared/engine/lifeChoice';
import { LIFE_CHOICE_TEMPLATES, lifeChoiceTemplate } from '../../shared/data/life-choice-templates';
import { ApiError, notFound, ok } from '../lib/http';
import { body, money } from '../lib/validate';
import { loadUserState } from '../lib/state';

const KINDS = ['study', 'care', 'startup', 'switch', 'sabbatical', 'custom'] as const;
const TEMPLATE_KEYS = ['study', 'care', 'startup', 'switch', 'sabbatical'] as const;

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
});

const prereqSchema = z.object({ title: z.string().trim().min(2, 'Nội dung quá ngắn').max(120), done: z.boolean().default(false) });
const prereqPatchSchema = z.object({ title: z.string().trim().min(2).max(120).optional(), done: z.boolean().optional() });
const taskSchema = z.object({
  title: z.string().trim().min(2, 'Tên việc quá ngắn').max(80),
  detail: z.string().trim().max(160).default(''),
  priority: z.enum(['high', 'mid', 'low']).default('mid'),
});
const taskPatchSchema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  detail: z.string().trim().max(160).optional(),
  priority: z.enum(['high', 'mid', 'low']).optional(),
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

interface Row {
  id: string; title: string; description: string; icon: string; cost: number;
  steps_json: string; current_step: number; pinned: number; status: LifeChoice['status'];
  kind: LifeChoiceKind; outcome: string; income_uplift_pct: number;
}
interface OptionRow {
  id: string; title: string; description: string; cost: number; other_cost: number; duration_months: number;
  months_without_income: number; monthly_income_delta: number; selected: number;
}
interface PrereqRow { id: string; title: string; done: number; auto_key: string | null }
interface TaskRow { id: string; title: string; detail: string; priority: LifeChoiceTask['priority']; done: number }

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
});

const SELECT = 'SELECT id, title, description, icon, cost, steps_json, current_step, pinned, status, kind, outcome, income_uplift_pct FROM life_choices';

/** Lựa chọn được ghim (hoặc lựa chọn đang theo đuổi mới nhất) để hiện ở Tổng quan. */
export async function loadPinnedLifeChoice(db: D1Database, userId: string): Promise<LifeChoice | null> {
  const row = await db.prepare(`${SELECT} WHERE user_id = ? AND status = 'active' ORDER BY pinned DESC, created_at DESC LIMIT 1`).bind(userId).first<Row>();
  return row ? toChoice(row) : null;
}

async function ownChoice(db: D1Database, id: string, userId: string): Promise<Row> {
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

async function loadDetail(db: D1Database, row: Row, userId: string): Promise<LifeChoiceDetail> {
  const [options, prereqs, tasks] = await db.batch([
    db.prepare('SELECT * FROM life_choice_options WHERE choice_id = ? ORDER BY order_idx, rowid').bind(row.id),
    db.prepare('SELECT id, title, done, auto_key FROM life_choice_prereqs WHERE choice_id = ? ORDER BY order_idx, rowid').bind(row.id),
    db.prepare('SELECT id, title, detail, priority, done FROM life_choice_tasks WHERE choice_id = ? ORDER BY order_idx, rowid').bind(row.id),
  ]);
  const state = await loadUserState(db, userId);
  const choice = toChoice(row);
  const pre = toPrereqs(prereqs.results as unknown as PrereqRow[], state);
  const ctx = { kind: choice.kind, incomeUpliftPct: choice.incomeUpliftPct, prereqsDone: pre.filter((p) => p.done).length, prereqsTotal: pre.length };
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
    tasks: (tasks.results as unknown as TaskRow[]).map((t) => ({ id: t.id, title: t.title, detail: t.detail, priority: t.priority, done: t.done === 1 })),
    recommendedOptionId: best?.id ?? null,
  };
}

const insertOption = (db: D1Database, choiceId: string, o: LifeChoiceOptionInput, idx: number, selected: boolean) =>
  db.prepare(
    `INSERT INTO life_choice_options (id, choice_id, title, description, cost, other_cost, duration_months, months_without_income, monthly_income_delta, selected, order_idx)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), choiceId, o.title, o.description ?? '', o.cost, o.otherCost, o.durationMonths, o.monthsWithoutIncome, o.monthlyIncomeDelta, selected ? 1 : 0, idx);

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
    return ok(c, evaluateLifeChoice(state, v.option, v));
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
      result = v.options.map((o) => ({ ...o, evaluation: evaluateLifeChoice(state, o, { kind: v.kind, incomeUpliftPct: v.incomeUpliftPct, prereqsDone: 0, prereqsTotal: 0 }) }));
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
    const tpl = v.template ? lifeChoiceTemplate(v.template) : undefined;
    const steps = v.steps.length ? v.steps : (tpl?.steps ?? []);
    const insert = db.prepare(
      `INSERT INTO life_choices (id, user_id, title, description, icon, cost, steps_json, current_step, pinned, kind, outcome, income_uplift_pct)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, userId, v.title, v.description || tpl?.description || '', tpl && v.icon === 'graduation-cap' ? tpl.icon : v.icon, v.cost || tpl?.cost || 0,
      JSON.stringify(steps), Math.min(v.currentStep, steps.length), v.pinned ? 1 : 0,
      v.kind ?? tpl?.key ?? 'custom', v.outcome ?? tpl?.outcome ?? '', v.incomeUpliftPct ?? tpl?.incomeUpliftPct ?? 0,
    );
    const stmts = [...(v.pinned ? [db.prepare('UPDATE life_choices SET pinned = 0 WHERE user_id = ?').bind(userId)] : []), insert];
    if (tpl) {
      // Học phí người dùng nhập áp cho mọi phương án của mẫu
      tpl.options.forEach((o, i) => stmts.push(insertOption(db, id, v.cost ? { ...o, cost: v.cost } : o, i, i === 0)));
      tpl.prereqs.forEach((p, i) =>
        stmts.push(db.prepare('INSERT INTO life_choice_prereqs (id, choice_id, title, auto_key, order_idx) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, p.title, p.autoKey ?? null, i)),
      );
      tpl.tasks.forEach((t, i) =>
        stmts.push(db.prepare('INSERT INTO life_choice_tasks (id, choice_id, title, detail, priority, order_idx) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, t.title, t.detail, t.priority, i)),
      );
    }
    await db.batch(stmts);
    return ok(c, { id }, 201);
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
    await db.prepare('INSERT INTO life_choice_tasks (id, choice_id, title, detail, priority, order_idx) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(tid, id, v.title, v.detail, v.priority, await nextIdx(db, 'life_choice_tasks', id)).run();
    return ok(c, { id: tid }, 201);
  })
  .patch('/:id/tasks/:taskId', body(taskPatchSchema), async (c) => {
    const v = c.req.valid('json');
    const db = c.env.DB;
    const id = c.req.param('id');
    await ownChoice(db, id, c.get('userId'));
    const cols: Record<string, unknown> = { title: v.title, detail: v.detail, priority: v.priority, done: v.done === undefined ? undefined : v.done ? 1 : 0 };
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
