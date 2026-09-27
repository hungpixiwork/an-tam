// Kỹ năng đang học + giá trị nghề nghiệp (B2). Mount: /api/skills, /api/human-capital
// Bảng skill_plan_items / opportunities (migrations/0011_skills_catalog.sql).

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { HumanCapitalResult, Opportunity, SkillItem } from '../../shared/types/api';
import type { Sector } from '../../shared/types/domain';
import { humanCapital } from '../../shared/engine/humanCapital';
import { learningWeek, learningWindowEnd, learningWindowStart, type SkillEvent } from '../../shared/engine/earnDashboard';
import { vnDate } from '../../shared/engine/month';
import { notFound, ok } from '../lib/http';
import { body } from '../lib/validate';
import { loadUserState } from '../lib/state';

const tag = z.enum(['data', 'ai_automation', 'nocode', 'other']);
const stage = z.enum(['foundation', 'practice', 'portfolio']);
const status = z.enum(['planned', 'learning', 'done']);
const months = z.number().int().min(0).max(60);

const skillSchema = z
  .object({
    name: z.string().trim().min(1, 'Vui lòng nhập tên kỹ năng').max(80),
    tag: tag.default('other'),
    stage: stage.default('foundation'),
    status: status.default('learning'),
    monthsMin: months.default(1),
    monthsMax: months.default(3),
    hoursPerWeek: z.number().min(0).max(40).default(2),
    progress: z.number().int().min(0).max(100).default(0),
  })
  .refine((s) => s.monthsMax >= s.monthsMin, { message: 'Thời gian tối đa phải ≥ tối thiểu', path: ['monthsMax'] });

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  tag: tag.optional(),
  stage: stage.optional(),
  status: status.optional(),
  hoursPerWeek: z.number().min(0).max(40).optional(),
  progress: z.number().int().min(0).max(100).optional(),
});

interface SkillRow {
  id: string; name: string; tag: SkillItem['tag']; stage: SkillItem['stage']; status: SkillItem['status'];
  months_min: number; months_max: number; hours_per_week: number; progress: number;
}

const toSkill = (r: SkillRow): SkillItem => ({
  id: r.id, name: r.name, tag: r.tag, stage: r.stage, status: r.status,
  monthsMin: r.months_min, monthsMax: r.months_max, hoursPerWeek: r.hours_per_week, progress: r.progress,
});

export async function loadSkills(db: D1Database, userId: string): Promise<SkillItem[]> {
  const { results } = await db
    .prepare('SELECT id, name, tag, stage, status, months_min, months_max, hours_per_week, progress FROM skill_plan_items WHERE user_id = ? ORDER BY order_idx, created_at')
    .bind(userId)
    .all<SkillRow>();
  return results.map(toSkill);
}

export async function loadOpportunities(db: D1Database): Promise<Omit<Opportunity, 'fit'>[]> {
  const { results } = await db
    .prepare('SELECT id, kind, title, tag, income_min, income_max, demand, remote FROM opportunities ORDER BY kind, order_idx')
    .all<{ id: string; kind: Opportunity['kind']; title: string; tag: Opportunity['tag']; income_min: number; income_max: number; demand: Opportunity['demand']; remote: number }>();
  return results.map((r) => ({ id: r.id, kind: r.kind, title: r.title, tag: r.tag, incomeMin: r.income_min, incomeMax: r.income_max, demand: r.demand, remote: r.remote === 1 }));
}

/** Buổi học (lịch loại 'skill') từ ngày `from` tới hết ngày `to`. */
export async function loadSkillEvents(db: D1Database, userId: string, from: string, to: string): Promise<SkillEvent[]> {
  const { results } = await db
    .prepare("SELECT id, title, note, starts_at, ends_at, done FROM calendar_events WHERE user_id = ? AND category = 'skill' AND starts_at >= ? AND starts_at < ? ORDER BY starts_at")
    .bind(userId, `${from}T00:00`, `${to}T99`)
    .all<{ id: string; title: string; note: string; starts_at: string; ends_at: string; done: number }>();
  return results.map((r) => ({ id: r.id, title: r.title, note: r.note, startsAt: r.starts_at, endsAt: r.ends_at, done: r.done === 1 }));
}

/**
 * Giá trị nghề nghiệp của người dùng. `monthlyIncome` = tổng nguồn thu tháng (từ sổ thu chi),
 * `skillHours` = số giờ học đã hoàn thành trong kế hoạch 7 ngày.
 */
export async function loadHumanCapital(db: D1Database, userId: string, monthlyIncome: number | null, skillHours: number): Promise<HumanCapitalResult> {
  const [state, prof] = await Promise.all([
    loadUserState(db, userId),
    db.prepare('SELECT isco_code, sector FROM income_profiles WHERE user_id = ?').bind(userId).first<{ isco_code: string | null; sector: Sector | null }>(),
  ]);
  const year = Number(vnDate().slice(0, 4));
  const birthYear = state.baseline.birthYear ?? null;
  return humanCapital({
    annualIncome: (monthlyIncome || state.profile.monthlyIncome) * 12,
    age: birthYear ? year - birthYear : 30,
    retirementAge: state.baseline.retirementAge ?? 60,
    iscoCode: prof?.isco_code ?? undefined,
    sector: prof?.sector ?? undefined,
    skillHoursPerWeek: skillHours,
  });
}

export const skills = new Hono<AppEnv>()
  .get('/', async (c) => ok(c, await loadSkills(c.env.DB, c.get('userId'))))
  .post('/', body(skillSchema), async (c) => {
    const s = c.req.valid('json');
    const userId = c.get('userId');
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO skill_plan_items (id, user_id, name, tag, stage, status, months_min, months_max, hours_per_week, progress, order_idx)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(order_idx), -1) + 1 FROM skill_plan_items WHERE user_id = ?))`,
    )
      .bind(id, userId, s.name, s.tag, s.stage, s.status, s.monthsMin, s.monthsMax, s.hoursPerWeek, s.progress, userId)
      .run();
    return ok(c, { id }, 201);
  })
  .patch('/:id', body(patchSchema), async (c) => {
    const s = c.req.valid('json');
    const cols: Record<string, unknown> = { name: s.name, tag: s.tag, stage: s.stage, status: s.status, hours_per_week: s.hoursPerWeek, progress: s.progress };
    const entries = Object.entries(cols).filter(([, v]) => v !== undefined);
    if (!entries.length) return ok(c, null);
    const res = await c.env.DB.prepare(`UPDATE skill_plan_items SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...entries.map(([, v]) => v), c.req.param('id'), c.get('userId'))
      .run();
    if (!res.meta.changes) throw notFound('Không tìm thấy kỹ năng');
    return ok(c, null);
  })
  .delete('/:id', async (c) => {
    const res = await c.env.DB.prepare('DELETE FROM skill_plan_items WHERE id = ? AND user_id = ?').bind(c.req.param('id'), c.get('userId')).run();
    if (!res.meta.changes) throw notFound('Không tìm thấy kỹ năng');
    return ok(c, null);
  });

/** GET /api/human-capital → HumanCapitalResult (thu nhập theo hồ sơ, giờ học = giờ đã học trong kế hoạch 7 ngày). */
export const humanCapitalRoutes = new Hono<AppEnv>().get('/', async (c) => {
  const db = c.env.DB;
  const userId = c.get('userId');
  const today = vnDate();
  const [skillList, events] = await Promise.all([loadSkills(db, userId), loadSkillEvents(db, userId, learningWindowStart(today), learningWindowEnd(today))]);
  const week = learningWeek(today, events, skillList);
  return ok(c, await loadHumanCapital(db, userId, null, week.doneHours));
});
