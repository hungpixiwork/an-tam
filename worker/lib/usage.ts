// Hạn mức lượt AI mỗi ngày theo gói (shared/plans.ts). Hết lượt → nơi gọi dùng chế độ cơ bản (luật).

import type { Env } from '../env';
import { PLANS, effectivePlan, type PlanKey } from '../../shared/plans';

export interface AiQuota { allowed: boolean; used: number; limit: number }

/** Ngày hiện tại theo giờ Việt Nam (UTC+7), YYYY-MM-DD. */
export const vnDay = (now: Date = new Date()): string => new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

export async function userPlan(db: D1Database, userId: string, now: Date = new Date()): Promise<{ plan: PlanKey; planUntil: string | null }> {
  const row = await db.prepare('SELECT plan, plan_until FROM users WHERE id = ?').bind(userId).first<{ plan: string; plan_until: string | null }>();
  return { plan: effectivePlan(row?.plan, row?.plan_until, now), planUntil: row?.plan_until ?? null };
}

/**
 * Trừ 1 lượt AI loại `kind`. Tăng nguyên tử: chỉ cộng khi còn lượt (ON CONFLICT … WHERE count < limit),
 * nên hai request đồng thời không vượt hạn mức. Không còn lượt → allowed=false, không ghi gì.
 */
export async function consumeAi(env: Pick<Env, 'DB'>, userId: string, kind: string, now: Date = new Date()): Promise<AiQuota> {
  const { plan } = await userPlan(env.DB, userId, now);
  const limit = PLANS[plan].aiPerDay;
  const day = vnDay(now);
  // Hạn mức tính trên tổng mọi loại trong ngày; một câu lệnh = nguyên tử
  const row = await env.DB.prepare(
    `INSERT INTO ai_usage (user_id, day, kind, count)
     SELECT ?1, ?2, ?3, 1 WHERE (SELECT COALESCE(SUM(count), 0) FROM ai_usage WHERE user_id = ?1 AND day = ?2) < ?4
     ON CONFLICT (user_id, day, kind) DO UPDATE SET count = count + 1
     RETURNING count`,
  ).bind(userId, day, kind, limit).first<{ count: number }>();
  return { allowed: !!row, used: await usedToday(env.DB, userId, now), limit };
}

/** Tổng lượt AI đã dùng hôm nay (mọi loại). */
export async function usedToday(db: D1Database, userId: string, now: Date = new Date()): Promise<number> {
  const r = await db.prepare('SELECT COALESCE(SUM(count), 0) AS n FROM ai_usage WHERE user_id = ? AND day = ?').bind(userId, vnDay(now)).first<{ n: number }>();
  return r?.n ?? 0;
}
