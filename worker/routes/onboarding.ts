// Màn "Bắt đầu": nhận toàn bộ dữ liệu người dùng mới nhập trong 1 lần, ghi nguyên khối.

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { OnboardingResult } from '../../shared/types/api';
import { evaluateAlerts } from '../../shared/engine/alerts';
import { allocateSavings, targetPortfolio } from '../../shared/engine/allocation';
import { setupStatus } from '../../shared/engine/overview';
import { peaceScore } from '../../shared/engine/peace';
import { totalValue } from '../../shared/engine/portfolio';
import { formatVnd } from '../../shared/format';
import { ApiError, notFound, ok } from '../lib/http';
import { afterChange } from '../lib/refresh';
import { loadMe, loadUserState } from '../lib/state';
import { body } from '../lib/validate';
import { goalSchema, insertGoal } from './goals';
import { holdingSchema, insertHolding } from './holdings';
import { profileSchema, upsertProfile } from './profile';

const onboardingSchema = z.object({
  /** Bỏ trống = người dùng bỏ qua bước đó. */
  profile: profileSchema.optional(),
  holdings: z.array(holdingSchema).max(20).default([]),
  goals: z.array(goalSchema).max(10).default([]),
  lifeStage: z.string().optional(),
});

export const onboarding = new Hono<AppEnv>().post('/', body(onboardingSchema), async (c) => {
  const userId = c.get('userId');
  const db = c.env.DB;
  const input = c.req.valid('json');
  const me = await loadMe(db, userId);
  if (!me) throw notFound();
  if (me.onboarded) throw new ApiError(409, 'already_onboarded', 'Bạn đã hoàn tất bước bắt đầu');

  const before = await loadUserState(db, userId);
  await db.batch([
    ...(input.profile ? [upsertProfile(db, userId, input.profile, before.baseline)] : []),
    ...input.holdings.filter((h) => h.value > 0).map((h) => insertHolding(db, userId, h)),
    ...input.goals.map((g) => insertGoal(db, userId, g)),
    db.prepare("UPDATE users SET onboarded_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), life_stage = ? WHERE id = ?").bind(input.lifeStage || null, userId),
  ]);

  const state = await afterChange(db, userId, {
    title: 'Hoàn tất hồ sơ đầu tiên',
    detail: (s) =>
      `AI đã đọc ${s.holdings.length} khoản tài sản (${formatVnd(totalValue(s.holdings))}) và ${s.goals.length} mục tiêu, sẽ theo dõi mỗi ngày.`,
  });
  const peace = peaceScore(state);
  const plan = allocateSavings(state);
  const top = [...plan.items].filter((i) => i.kind !== 'debt').sort((a, b) => Number(a.kind === 'emergency') - Number(b.kind === 'emergency') || (state.goals.find((g) => g.id === b.goalId)?.targetAmount ?? 0) - (state.goals.find((g) => g.id === a.goalId)?.targetAmount ?? 0))[0];
  return ok<OnboardingResult>(c, {
    me: { ...me, onboarded: true },
    peace: { score: peace.score, label: peace.label, level: peace.level },
    alerts: evaluateAlerts(state).map((a) => ({ severity: a.severity, title: a.title })),
    setup: setupStatus(state),
    allocation: {
      capacity: plan.capacity,
      savings: plan.items.filter((i) => i.required > 0 || i.suggested > 0).slice(0, 3),
      mix: targetPortfolio(state).target,
      topGoal: top ? { title: top.title, probability: top.probabilityAfter ?? 0 } : null,
    },
  });
});
