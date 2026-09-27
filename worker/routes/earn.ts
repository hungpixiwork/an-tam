import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { ApiError, ok, notFound } from '../lib/http';
import { body, money } from '../lib/validate';
import { loadUserState } from '../lib/state';
import { addMonths, currentMonth, vnDate } from '../../shared/engine/month';
import { incomeGrowthPlan, financialConnection, valueHoursSummary } from '../../shared/engine/earn';
import type { IncomeProfile, ValueHourEntry } from '../../shared/types/domain';
import type { EarnDashboard } from '../../shared/types/api';
import { careerActions, careerBand, incomeSources, learningWeek, learningWindowEnd, learningWindowStart, rankOpportunities, roadmap } from '../../shared/engine/earnDashboard';
import { loadHumanCapital, loadOpportunities, loadSkillEvents, loadSkills } from './skills';

const SECTORS = ['technology', 'finance', 'real_estate', 'manufacturing', 'consumer', 'healthcare', 'education_public', 'other'] as const;

const incomeProfileSchema = z.object({
  currentIncome: money.min(0).default(0),
  targetIncome: money.min(0).default(0),
  targetMonths: z.number().int().min(1).max(120).default(12),
  occupation: z.string().trim().max(100).default(''),
  hoursPerWeek: z.number().int().min(0).max(80).default(0),
  focusSkill: z.string().trim().max(100).default(''),
  sector: z.enum(SECTORS).nullable().optional(),
  iscoCode: z.string().regex(/^\d{1,4}$/, 'Mã nghề ISCO gồm 1–4 chữ số').nullable().optional(),
});

const activitySchema = z.object({
  title: z.string().trim().min(1).max(100),
});

const hoursUpdateSchema = z.object({
  week: z.string().regex(/^\d{4}-W\d{2}$/),
  entries: z.array(z.object({
    activityId: z.string(),
    planned: z.number().int().min(0),
    actual: z.number().int().min(0),
  }))
});

const timeAllocationSchema = z.object({
  allocations: z.array(z.object({
    category: z.enum(['sleep', 'work', 'life', 'learning', 'side_income', 'unallocated']),
    hours: z.number().int().min(0),
  }))
}).refine(data => {
  const sum = data.allocations.reduce((acc, curr) => acc + curr.hours, 0);
  return sum <= 168;
}, { message: 'Tổng thời gian phân bổ không được vượt quá 168 giờ', path: ['allocations'] });

export const earn = new Hono<AppEnv>()
  /** Trang Tăng thu nhập & kỹ năng: nguồn thu (sổ thu chi tháng này, rỗng → tháng trước), cơ hội, lộ trình, tuần học, giá trị nghề. */
  .get('/dashboard', async (c) => {
    const db = c.env.DB;
    const userId = c.get('userId');
    const today = vnDate();
    const incomeOf = (month: string) =>
      db.prepare("SELECT category, SUM(amount) AS amount FROM transactions WHERE user_id = ? AND kind = 'income' AND occurred_on LIKE ? GROUP BY category")
        .bind(userId, `${month}-%`)
        .all<{ category: string; amount: number }>()
        .then((r) => r.results);
    let month = today.slice(0, 7);
    const [skillList, opps, events, current] = await Promise.all([
      loadSkills(db, userId), loadOpportunities(db), loadSkillEvents(db, userId, learningWindowStart(today), learningWindowEnd(today)), incomeOf(month),
    ]);
    let rows = current;
    if (!rows.length) {
      const prev = await incomeOf(addMonths(month, -1));
      if (prev.length) [month, rows] = [addMonths(month, -1), prev];
    }
    const income = incomeSources(rows);
    const week = learningWeek(today, events, skillList);
    const hc = await loadHumanCapital(db, userId, income.total || null, week.doneHours);
    const ranked = rankOpportunities(opps, skillList);
    const freelance = opps.filter((o) => o.kind === 'freelance');
    const data: EarnDashboard = {
      month,
      income,
      opportunities: ranked.filter((o) => o.kind === 'freelance').slice(0, 3),
      jobs: ranked.filter((o) => o.kind === 'job').slice(0, 3),
      roadmap: roadmap(skillList, freelance),
      week,
      career: { ...hc, band: careerBand(hc.careerScore), actions: careerActions(hc, income.sources, skillList) },
    };
    return ok(c, data);
  })
  .get('/', async (c) => {
    const userId = c.get('userId');
    const row = await c.env.DB.prepare('SELECT current_income, target_income, target_months, occupation, hours_per_week, focus_skill FROM income_profiles WHERE user_id = ?')
      .bind(userId)
      .first<any>();
    
    const profile: IncomeProfile = row ? {
      currentIncome: row.current_income,
      targetIncome: row.target_income,
      targetMonths: row.target_months,
      occupation: row.occupation,
      hoursPerWeek: row.hours_per_week,
      focusSkill: row.focus_skill,
    } : {
      currentIncome: 0,
      targetIncome: 0,
      targetMonths: 12,
      occupation: '',
      hoursPerWeek: 0,
      focusSkill: '',
    };
    
    return ok(c, profile);
  })
  .put('/', body(incomeProfileSchema), async (c) => {
    const userId = c.get('userId');
    const data = c.req.valid('json');
    
    await c.env.DB.prepare(`
      INSERT INTO income_profiles (user_id, current_income, target_income, target_months, occupation, hours_per_week, focus_skill, sector, isco_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        sector = COALESCE(excluded.sector, income_profiles.sector),
        isco_code = COALESCE(excluded.isco_code, income_profiles.isco_code),
        current_income = excluded.current_income,
        target_income = excluded.target_income,
        target_months = excluded.target_months,
        occupation = excluded.occupation,
        hours_per_week = excluded.hours_per_week,
        focus_skill = excluded.focus_skill
    `)
      .bind(userId, data.currentIncome, data.targetIncome, data.targetMonths, data.occupation, data.hoursPerWeek, data.focusSkill, data.sector ?? null, data.iscoCode ?? null)
      .run();
      
    return ok(c, data);
  })
  .get('/activities', async (c) => {
    const userId = c.get('userId');
    const { results } = await c.env.DB.prepare('SELECT id, title FROM value_activities WHERE user_id = ? ORDER BY order_idx ASC')
      .bind(userId)
      .all<{ id: string; title: string }>();
    return ok(c, results);
  })
  .post('/activities', body(activitySchema), async (c) => {
    const userId = c.get('userId');
    const data = c.req.valid('json');
    
    const countRow = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM value_activities WHERE user_id = ?')
      .bind(userId)
      .first<{ cnt: number }>();
      
    if (countRow && countRow.cnt >= 3) {
      throw new ApiError(400, 'limit_exceeded', 'Bạn chỉ có thể tạo tối đa 3 hoạt động giá trị');
    }
    
    const id = crypto.randomUUID();
    const orderIdx = countRow ? countRow.cnt : 0;
    
    await c.env.DB.prepare('INSERT INTO value_activities (id, user_id, title, order_idx) VALUES (?, ?, ?, ?)')
      .bind(id, userId, data.title, orderIdx)
      .run();
      
    return ok(c, { id, title: data.title }, 201);
  })
  .delete('/activities/:id', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    
    const res = await c.env.DB.prepare('DELETE FROM value_activities WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();
      
    if (!res.meta.changes) throw notFound('Không tìm thấy hoạt động');
    
    return ok(c, null);
  })
  .get('/hours', async (c) => {
    const userId = c.get('userId');
    const week = c.req.query('week');
    if (!week || !/^\d{4}-W\d{2}$/.test(week)) {
      throw new ApiError(400, 'invalid_input', 'Tham số tuần không hợp lệ (định dạng YYYY-Www)');
    }
    
    const { results } = await c.env.DB.prepare(`
      SELECT l.activity_id, a.title, l.planned, l.actual
      FROM value_hours_log l
      JOIN value_activities a ON l.activity_id = a.id
      WHERE l.user_id = ? AND l.week = ?
    `)
      .bind(userId, week)
      .all<any>();
      
    return ok(c, results);
  })
  .put('/hours', body(hoursUpdateSchema), async (c) => {
    const userId = c.get('userId');
    const data = c.req.valid('json');
    
    // Delete existing entries for the week first
    const stmts = [
      c.env.DB.prepare('DELETE FROM value_hours_log WHERE user_id = ? AND week = ?').bind(userId, data.week)
    ];
    
    for (const entry of data.entries) {
      stmts.push(
        c.env.DB.prepare('INSERT INTO value_hours_log (id, user_id, activity_id, week, planned, actual) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(crypto.randomUUID(), userId, entry.activityId, data.week, entry.planned, entry.actual)
      );
    }
    
    await c.env.DB.batch(stmts);
    return ok(c, null);
  })
  .get('/time', async (c) => {
    const userId = c.get('userId');
    const { results } = await c.env.DB.prepare('SELECT category, hours FROM time_allocations WHERE user_id = ?')
      .bind(userId)
      .all<{ category: string; hours: number }>();
      
    return ok(c, results);
  })
  .put('/time', body(timeAllocationSchema), async (c) => {
    const userId = c.get('userId');
    const data = c.req.valid('json');
    
    const stmts = [
      c.env.DB.prepare('DELETE FROM time_allocations WHERE user_id = ?').bind(userId)
    ];
    
    for (const alloc of data.allocations) {
      stmts.push(
        c.env.DB.prepare('INSERT INTO time_allocations (user_id, category, hours) VALUES (?, ?, ?)')
          .bind(userId, alloc.category, alloc.hours)
      );
    }
    
    await c.env.DB.batch(stmts);
    return ok(c, null);
  })
  .get('/summary', async (c) => {
    const userId = c.get('userId');
    const week = c.req.query('week');
    if (!week || !/^\d{4}-W\d{2}$/.test(week)) {
      throw new ApiError(400, 'invalid_input', 'Tham số tuần không hợp lệ (định dạng YYYY-Www)');
    }
    
    const today = currentMonth();
    
    // Load state
    const state = await loadUserState(c.env.DB, userId, today);
    
    // Load income profile
    const profileRow = await c.env.DB.prepare('SELECT current_income, target_income, target_months, occupation, hours_per_week, focus_skill FROM income_profiles WHERE user_id = ?')
      .bind(userId)
      .first<any>();
      
    const profile: IncomeProfile = profileRow ? {
      currentIncome: profileRow.current_income,
      targetIncome: profileRow.target_income,
      targetMonths: profileRow.target_months,
      occupation: profileRow.occupation,
      hoursPerWeek: profileRow.hours_per_week,
      focusSkill: profileRow.focus_skill,
    } : {
      currentIncome: 0, targetIncome: 0, targetMonths: 12, occupation: '', hoursPerWeek: 0, focusSkill: ''
    };
    
    // Load hours log
    const hoursRes = await c.env.DB.prepare(`
      SELECT l.activity_id as activityId, a.title as activityTitle, l.planned, l.actual, l.week
      FROM value_hours_log l
      JOIN value_activities a ON l.activity_id = a.id
      WHERE l.user_id = ? AND l.week = ?
    `).bind(userId, week).all<any>();
    
    const entries: ValueHourEntry[] = hoursRes.results.map(r => ({
      activityId: r.activityId,
      activityTitle: r.activityTitle,
      week: r.week,
      planned: r.planned,
      actual: r.actual
    }));
    
    const titlesMap = new Map<string, string>();
    for (const e of entries) titlesMap.set(e.activityId, e.activityTitle);
    
    // Compute computations
    const plan = incomeGrowthPlan(profile);
    const connection = financialConnection(profile, state);
    const summary = valueHoursSummary(entries, titlesMap);
    
    return ok(c, { plan, connection, summary });
  });
