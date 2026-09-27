// Lựa chọn cuộc đời B1 (Wave 2 · F). Mount: /api/life-choices
// Đã có: danh sách + CRUD lựa chọn (dùng ở màn Tổng quan). Còn lại (mẫu, đánh giá, so sánh, điều kiện, việc cần làm) — màn Lựa chọn.

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { LifeChoice } from '../../shared/types/api';
import { ApiError, notFound, ok } from '../lib/http';
import { body, money } from '../lib/validate';

/** Stub Wave 0 — thay bằng handler thật; giữ nguyên đường dẫn (đã mount trong worker/index.ts). */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

const choiceSchema = z
  .object({
    title: z.string().trim().min(2, 'Tên lựa chọn quá ngắn').max(80),
    description: z.string().trim().max(200).default(''),
    icon: z.string().trim().max(40).default('graduation-cap'),
    cost: money.default(0),
    steps: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
    currentStep: z.number().int().min(0).default(0),
    pinned: z.boolean().default(false),
  })
  .refine((c) => c.currentStep <= c.steps.length, { message: 'Mốc hiện tại vượt quá số mốc', path: ['currentStep'] });

const patchSchema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(200).optional(),
  icon: z.string().trim().max(40).optional(),
  cost: money.optional(),
  steps: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  currentStep: z.number().int().min(0).optional(),
  pinned: z.boolean().optional(),
  status: z.enum(['active', 'done', 'archived']).optional(),
});

interface Row {
  id: string; title: string; description: string; icon: string; cost: number;
  steps_json: string; current_step: number; pinned: number; status: LifeChoice['status'];
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
  };
};

const SELECT = 'SELECT id, title, description, icon, cost, steps_json, current_step, pinned, status FROM life_choices';

/** Lựa chọn được ghim (hoặc lựa chọn đang theo đuổi mới nhất) để hiện ở Tổng quan. */
export async function loadPinnedLifeChoice(db: D1Database, userId: string): Promise<LifeChoice | null> {
  const row = await db.prepare(`${SELECT} WHERE user_id = ? AND status = 'active' ORDER BY pinned DESC, created_at DESC LIMIT 1`).bind(userId).first<Row>();
  return row ? toChoice(row) : null;
}

export const lifeChoices = new Hono<AppEnv>()
  // Đường dẫn tĩnh (templates, evaluate, compare) khai báo trước '/:id'
  .get('/templates', todo)
  .post('/evaluate', todo)
  .post('/compare', todo)
  .get('/', async (c) => {
    const { results } = await c.env.DB.prepare(`${SELECT} WHERE user_id = ? ORDER BY pinned DESC, created_at DESC`).bind(c.get('userId')).all<Row>();
    return ok(c, results.map(toChoice));
  })
  .post('/', body(choiceSchema), async (c) => {
    const v = c.req.valid('json');
    const userId = c.get('userId');
    const id = crypto.randomUUID();
    const insert = c.env.DB.prepare(
      'INSERT INTO life_choices (id, user_id, title, description, icon, cost, steps_json, current_step, pinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(id, userId, v.title, v.description, v.icon, v.cost, JSON.stringify(v.steps), v.currentStep, v.pinned ? 1 : 0);
    // Chỉ một lựa chọn được ghim
    await c.env.DB.batch(v.pinned ? [c.env.DB.prepare('UPDATE life_choices SET pinned = 0 WHERE user_id = ?').bind(userId), insert] : [insert]);
    return ok(c, { id }, 201);
  })
  .get('/:id', async (c) => {
    const row = await c.env.DB.prepare(`${SELECT} WHERE id = ? AND user_id = ?`).bind(c.req.param('id'), c.get('userId')).first<Row>();
    if (!row) throw notFound('Không tìm thấy lựa chọn');
    return ok(c, toChoice(row));
  })
  .patch('/:id', body(patchSchema), async (c) => {
    const v = c.req.valid('json');
    const userId = c.get('userId');
    const id = c.req.param('id');
    const row = await c.env.DB.prepare(`${SELECT} WHERE id = ? AND user_id = ?`).bind(id, userId).first<Row>();
    if (!row) throw notFound('Không tìm thấy lựa chọn');
    const steps = v.steps ?? toChoice(row).steps;
    if ((v.currentStep ?? row.current_step) > steps.length) throw new ApiError(400, 'invalid_input', 'Mốc hiện tại vượt quá số mốc');
    const cols: Record<string, unknown> = {
      title: v.title, description: v.description, icon: v.icon, cost: v.cost,
      steps_json: v.steps ? JSON.stringify(v.steps) : undefined, current_step: v.currentStep,
      pinned: v.pinned === undefined ? undefined : v.pinned ? 1 : 0, status: v.status,
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
  .post('/:id/prereqs', todo)
  .patch('/:id/prereqs/:prereqId', todo)
  .delete('/:id/prereqs/:prereqId', todo)
  .post('/:id/tasks', todo)
  .patch('/:id/tasks/:taskId', todo)
  .delete('/:id/tasks/:taskId', todo);
