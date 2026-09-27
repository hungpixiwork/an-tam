// Quỹ an toàn & mục tiêu (trang 3). Mount: /api/safety

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { IncomeProfile, Transaction } from '../../shared/types/domain';
import { buildSafety, safetyPlans } from '../../shared/engine/safety';
import { addMonths } from '../../shared/engine/month';
import { emergencyAmount } from '../../shared/engine/peace';
import { formatVnd } from '../../shared/format';
import { ApiError, ok } from '../lib/http';
import { afterChange } from '../lib/refresh';
import { loadUserState } from '../lib/state';
import { body } from '../lib/validate';
import { insertGoal } from './goals';

const targetSchema = z.object({ months: z.union([z.literal(6), z.literal(12)]) });

export const safety = new Hono<AppEnv>()
  .get('/', async (c) => {
    const db = c.env.DB;
    const userId = c.get('userId');
    const state = await loadUserState(db, userId);
    const [tx, inc] = await db.batch<Record<string, any>>([
      db.prepare('SELECT id, kind, amount, category, note, occurred_on, value_tag FROM transactions WHERE user_id = ? AND occurred_on >= ? ORDER BY occurred_on DESC')
        .bind(userId, `${addMonths(state.today, -1)}-01`),
      db.prepare('SELECT current_income, target_income, target_months, occupation, hours_per_week, focus_skill FROM income_profiles WHERE user_id = ?').bind(userId),
    ]);
    const recent: Transaction[] = tx.results.map((r) => ({
      id: r.id, kind: r.kind, amount: r.amount, category: r.category, note: r.note, occurredOn: r.occurred_on, valueTag: r.value_tag ?? undefined,
    }));
    const i = inc.results[0];
    const income: IncomeProfile | null = i
      ? { currentIncome: i.current_income, targetIncome: i.target_income, targetMonths: i.target_months, occupation: i.occupation, hoursPerWeek: i.hours_per_week, focusSkill: i.focus_skill }
      : null;
    return ok(c, buildSafety(state, { recent, income }));
  })
  /** "Lên kế hoạch": áp dụng kế hoạch 6 / 12 tháng vào mục tiêu quỹ dự phòng (tạo nếu chưa có). */
  .put('/target', body(targetSchema), async (c) => {
    const db = c.env.DB;
    const userId = c.get('userId');
    const { months } = c.req.valid('json');
    const before = await loadUserState(db, userId);
    if (before.profile.monthlyExpense <= 0) throw new ApiError(400, 'no_expense', 'Hãy nhập chi tiêu hằng tháng trước khi lập kế hoạch quỹ an toàn');
    const plan = safetyPlans(before).find((p) => p.months === months)!;
    const targetMonth = addMonths(before.today, Math.max(1, plan.duration));
    const goal = before.goals.find((g) => g.kind === 'emergency');
    const writes: D1PreparedStatement[] = [db.prepare('UPDATE financial_profiles SET emergency_target_months = ? WHERE user_id = ?').bind(months, userId)];
    if (goal) {
      writes.push(
        db.prepare('UPDATE goals SET target_amount = ?, monthly_contribution = ?, target_month = ? WHERE id = ? AND user_id = ?')
          .bind(plan.targetAmount, plan.monthly, targetMonth, goal.id, userId),
      );
    } else {
      writes.push(
        insertGoal(db, userId, {
          kind: 'emergency', title: 'Quỹ dự phòng', targetAmount: plan.targetAmount, currentAmount: emergencyAmount(before), targetMonth,
          monthlyContribution: plan.monthly, priority: 1, icon: 'umbrella', horizon: 'short',
        }),
      );
    }
    await db.batch(writes);
    await afterChange(db, userId, {
      title: 'Lên kế hoạch quỹ an toàn',
      detail: `Mục tiêu ${months} tháng chi tiêu (${formatVnd(plan.targetAmount)}), để dành ${formatVnd(plan.monthly)}/tháng trong ${plan.duration} tháng.`,
      before,
    });
    return ok(c, plan);
  });
