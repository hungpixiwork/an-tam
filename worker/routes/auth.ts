import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { ApiError, ok, unauthorized } from '../lib/http';
import { hashPassword, verifyPassword } from '../lib/password';
import { createSession, destroySession, readSession } from '../lib/session';
import { demoDataStatements, loadMe, loadUserState, syncAlerts } from '../lib/state';

const email = z.string().trim().toLowerCase().email('Email không hợp lệ').max(254);

const registerSchema = z.object({
  email,
  password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự').max(128),
  fullName: z.string().trim().min(2, 'Vui lòng nhập họ tên').max(80),
  salutation: z.enum(['anh', 'chị', 'bạn']).default('bạn'),
});

const loginSchema = z.object({ email, password: z.string().min(1).max(128) });

const invalid = (result: { success: boolean; error?: { issues: { message: string }[] } }) => {
  if (!result.success) throw new ApiError(400, 'invalid_input', result.error?.issues[0]?.message ?? 'Dữ liệu không hợp lệ');
};

export const auth = new Hono<AppEnv>()
  .post('/register', zValidator('json', registerSchema, invalid), async (c) => {
    const body = c.req.valid('json');
    const exists = await c.env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(body.email).first();
    if (exists) throw new ApiError(409, 'email_taken', 'Email này đã được đăng ký');

    const userId = crypto.randomUUID();
    const { hash, salt } = await hashPassword(body.password);
    const avatarSeed = crypto.getRandomValues(new Uint32Array(1))[0] % 10_000;
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO users (id, email, password_hash, password_salt, full_name, salutation, avatar_seed) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(userId, body.email, hash, salt, body.fullName, body.salutation, avatarSeed),
      c.env.DB.prepare('INSERT INTO user_settings (user_id) VALUES (?)').bind(userId),
      ...demoDataStatements(c.env.DB, userId),
    ]);
    await syncAlerts(c.env.DB, userId, await loadUserState(c.env.DB, userId));
    await createSession(c, userId);
    return ok(c, await loadMe(c.env.DB, userId), 201);
  })
  .post('/login', zValidator('json', loginSchema, invalid), async (c) => {
    const { email, password } = c.req.valid('json');
    const row = await c.env.DB.prepare('SELECT id, password_hash, password_salt FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string; password_hash: string; password_salt: string }>();
    // Luôn chạy PBKDF2 để không lộ việc email có tồn tại hay không qua thời gian phản hồi
    const valid = await verifyPassword(password, row?.password_hash ?? 'AAAA', row?.password_salt ?? 'AAAAAAAAAAAAAAAAAAAAAA==');
    if (!row || !valid) throw new ApiError(401, 'invalid_credentials', 'Email hoặc mật khẩu không đúng');
    await createSession(c, row.id);
    return ok(c, await loadMe(c.env.DB, row.id));
  })
  .post('/logout', async (c) => {
    await destroySession(c);
    return ok(c, null);
  })
  .get('/me', async (c) => {
    const userId = await readSession(c);
    const me = userId ? await loadMe(c.env.DB, userId) : null;
    if (!me) throw unauthorized();
    return ok(c, me);
  });
