// Số nền thu nhập / chi tiêu tháng và mục tiêu quỹ dự phòng (người dùng tự nhập).

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { ProfileData } from '../../shared/types/api';
import { ok } from '../lib/http';
import { afterChange } from '../lib/refresh';
import { loadUserState, type LoadedState } from '../lib/state';
import { body, money } from '../lib/validate';

export const profileSchema = z.object({
  monthlyIncome: money,
  monthlyExpense: money,
  emergencyTargetMonths: z.number().int().min(1, 'Ít nhất 1 tháng').max(24, 'Tối đa 24 tháng'),
  /** Năm sinh — để so sánh tỷ lệ tiết kiệm với người cùng độ tuổi (tùy chọn). */
  birthYear: z.number().int().min(1900).max(2100).nullable().optional(),
});

export const upsertProfile = (db: D1Database, userId: string, p: Partial<z.infer<typeof profileSchema>>, base: LoadedState['baseline']) =>
  db
    .prepare(
      `INSERT INTO financial_profiles (user_id, monthly_income, monthly_expense, emergency_target_months, birth_year) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET monthly_income = excluded.monthly_income, monthly_expense = excluded.monthly_expense,
         emergency_target_months = excluded.emergency_target_months, birth_year = excluded.birth_year`,
    )
    .bind(
      userId, p.monthlyIncome ?? base.monthlyIncome, p.monthlyExpense ?? base.monthlyExpense, p.emergencyTargetMonths ?? base.emergencyTargetMonths,
      p.birthYear !== undefined ? p.birthYear : (base.birthYear ?? null),
    );

const toData = (s: LoadedState): ProfileData => ({
  baseline: { monthlyIncome: s.baseline.monthlyIncome, monthlyExpense: s.baseline.monthlyExpense, emergencyTargetMonths: s.baseline.emergencyTargetMonths, birthYear: s.baseline.birthYear ?? null },
  used: { income: s.profile.monthlyIncome, expense: s.profile.monthlyExpense, ...s.sources },
});

export const profile = new Hono<AppEnv>()
  .get('/', async (c) => ok(c, toData(await loadUserState(c.env.DB, c.get('userId')))))
  .put('/', body(profileSchema.partial()), async (c) => {
    const userId = c.get('userId');
    const before = await loadUserState(c.env.DB, userId);
    await upsertProfile(c.env.DB, userId, c.req.valid('json'), before.baseline).run();
    return ok(c, toData(await afterChange(c.env.DB, userId, { title: 'Cập nhật thu chi cơ bản', before })));
  });
