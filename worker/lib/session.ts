import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { AppEnv } from '../env';

export const SESSION_COOKIE = 'at_session';
const SESSION_DAYS = 30;

const toHex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const hashToken = async (token: string) => toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));

export async function createSession(c: Context<AppEnv>, userId: string): Promise<void> {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await c.env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await hashToken(token), userId, expires.toISOString())
    .run();
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    expires,
  });
}

/** Trả về userId nếu cookie hợp lệ và chưa hết hạn. */
export async function readSession(c: Context<AppEnv>): Promise<string | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const row = await c.env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(await hashToken(token), new Date().toISOString())
    .first<{ user_id: string }>();
  return row?.user_id ?? null;
}

export async function destroySession(c: Context<AppEnv>): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await hashToken(token)).run();
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

/** Đăng xuất mọi thiết bị khác, giữ phiên hiện tại (sau khi đổi mật khẩu). */
export async function destroyOtherSessions(c: Context<AppEnv>, userId: string): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE);
  await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?')
    .bind(userId, token ? await hashToken(token) : '')
    .run();
}
