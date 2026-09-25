import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { ApiError, notFound, ok } from '../lib/http';
import { hashPassword, verifyPassword } from '../lib/password';
import { destroyOtherSessions, destroySession } from '../lib/session';
import { loadMe } from '../lib/state';
import { body } from '../lib/validate';
import { fullNameSchema, passwordSchema, salutationSchema } from './auth';

/** Cột DB ↔ khóa API. */
const FIELDS = {
  data_encrypted: 'dataEncrypted',
  advanced_analysis: 'advancedAnalysis',
  notify_goal_delay: 'notifyGoalDelay',
  notify_portfolio_risk: 'notifyPortfolioRisk',
  notify_weekly_email: 'notifyWeeklyEmail',
  notify_community_lessons: 'notifyCommunityLessons',
} as const;
type Column = keyof typeof FIELDS;
type Key = (typeof FIELDS)[Column];
const COLUMNS = Object.keys(FIELDS) as Column[];

const settingsSchema = z.object({
  dataEncrypted: z.boolean().optional(),
  advancedAnalysis: z.boolean().optional(),
  notifyGoalDelay: z.boolean().optional(),
  notifyPortfolioRisk: z.boolean().optional(),
  notifyWeeklyEmail: z.boolean().optional(),
  notifyCommunityLessons: z.boolean().optional(),
});

async function read(db: D1Database, userId: string): Promise<Record<Key, boolean>> {
  const row = await db.prepare('SELECT * FROM user_settings WHERE user_id = ?').bind(userId).first<Record<string, number>>();
  return Object.fromEntries(COLUMNS.map((col) => [FIELDS[col], (row?.[col] ?? 0) === 1])) as Record<Key, boolean>;
}

/** Bảng dữ liệu cá nhân được đưa vào bản xuất. */
const EXPORT_TABLES = ['financial_profiles', 'holdings', 'goals', 'net_worth_snapshots', 'simulation_runs', 'habit_answers', 'transactions', 'safety_plans', 'ai_events', 'ai_alerts', 'user_settings'] as const;

export const settings = new Hono<AppEnv>()
  .get('/settings', async (c) => ok(c, await read(c.env.DB, c.get('userId'))))
  .put('/settings', body(settingsSchema), async (c) => {
    const input = c.req.valid('json');
    const cols = COLUMNS.filter((col) => input[FIELDS[col]] !== undefined);
    if (cols.length) {
      await c.env.DB.prepare(`UPDATE user_settings SET ${cols.map((col) => `${col} = ?`).join(', ')} WHERE user_id = ?`)
        .bind(...cols.map((col) => (input[FIELDS[col]] ? 1 : 0)), c.get('userId'))
        .run();
    }
    return ok(c, await read(c.env.DB, c.get('userId')));
  })
  .patch('/me', body(z.object({ fullName: fullNameSchema.optional(), salutation: salutationSchema.optional() })), async (c) => {
    const { fullName, salutation } = c.req.valid('json');
    const userId = c.get('userId');
    await c.env.DB.prepare('UPDATE users SET full_name = COALESCE(?, full_name), salutation = COALESCE(?, salutation) WHERE id = ?')
      .bind(fullName ?? null, salutation ?? null, userId)
      .run();
    const me = await loadMe(c.env.DB, userId);
    if (!me) throw notFound();
    return ok(c, me);
  })
  .post('/me/password', body(z.object({ currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại').max(128), newPassword: passwordSchema })), async (c) => {
    const { currentPassword, newPassword } = c.req.valid('json');
    const userId = c.get('userId');
    const row = await c.env.DB.prepare('SELECT password_hash, password_salt FROM users WHERE id = ?')
      .bind(userId)
      .first<{ password_hash: string; password_salt: string }>();
    if (!row) throw notFound();
    if (!(await verifyPassword(currentPassword, row.password_hash, row.password_salt))) {
      throw new ApiError(400, 'wrong_password', 'Mật khẩu hiện tại không đúng');
    }
    const { hash, salt } = await hashPassword(newPassword);
    await c.env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').bind(hash, salt, userId).run();
    await destroyOtherSessions(c, userId);
    return ok(c, null);
  })
  .get('/me/export', async (c) => {
    const userId = c.get('userId');
    const results = await c.env.DB.batch(EXPORT_TABLES.map((t) => c.env.DB.prepare(`SELECT * FROM ${t} WHERE user_id = ?`).bind(userId)));
    const data = {
      exportedAt: new Date().toISOString(),
      user: await loadMe(c.env.DB, userId),
      ...Object.fromEntries(EXPORT_TABLES.map((t, i) => [t, results[i].results])),
    };
    c.header('Content-Disposition', 'attachment; filename="an-tam-du-lieu-cua-toi.json"');
    return c.json(data);
  })
  .delete('/me', async (c) => {
    const userId = c.get('userId');
    await destroySession(c);
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
    return ok(c, null);
  });
