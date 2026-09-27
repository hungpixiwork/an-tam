// Lưu / đọc token tích hợp đã mã hóa (AES-256-GCM, AAD = userId:provider) và tự làm mới access token.

import type { Env } from '../env';
import { decryptToken, encryptToken } from '../lib/crypto';
import { ApiError } from '../lib/http';
import { GoogleAuthError, refreshAccessToken, type GoogleTokens } from './google/oauth';

export type Provider = 'google' | 'notion' | 'sepay';

export interface IntegrationRow {
  id: string;
  user_id: string;
  provider: Provider;
  status: 'connected' | 'error' | 'revoked';
  scopes: string;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  token_expires_at: string | null;
  meta_json: string;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
}

export const loadIntegration = (db: D1Database, userId: string, provider: Provider) =>
  db.prepare('SELECT * FROM integrations WHERE user_id = ? AND provider = ?').bind(userId, provider).first<IntegrationRow>();

export const integrationMeta = <T extends object>(row: IntegrationRow | null): Partial<T> => {
  try {
    return row ? (JSON.parse(row.meta_json) as Partial<T>) : {};
  } catch {
    return {};
  }
};

const key = (env: Env) => {
  if (!env.TOKEN_ENC_KEY) throw new ApiError(503, 'integration_not_configured', 'Máy chủ chưa cấu hình khóa mã hóa token (TOKEN_ENC_KEY)');
  return env.TOKEN_ENC_KEY;
};

/** Ghi token sau khi đổi code. Google chỉ trả refresh_token lần đầu (prompt=consent) — giữ cái cũ nếu thiếu. */
export async function saveTokens(env: Env, userId: string, provider: Provider, t: GoogleTokens): Promise<void> {
  const ctx = { userId, provider };
  const access = await encryptToken(key(env), t.access_token, ctx);
  const refresh = t.refresh_token ? await encryptToken(key(env), t.refresh_token, ctx) : null;
  const expires = new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO integrations (id, user_id, provider, status, scopes, access_token_enc, refresh_token_enc, token_expires_at)
     VALUES (?, ?, ?, 'connected', ?, ?, ?, ?)
     ON CONFLICT (user_id, provider) DO UPDATE SET
       status = 'connected', scopes = excluded.scopes, access_token_enc = excluded.access_token_enc,
       refresh_token_enc = COALESCE(excluded.refresh_token_enc, integrations.refresh_token_enc),
       token_expires_at = excluded.token_expires_at, last_error = NULL,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
  )
    .bind(crypto.randomUUID(), userId, provider, t.scope ?? '', access, refresh, expires)
    .run();
}

export async function setMeta(db: D1Database, userId: string, provider: Provider, patch: Record<string, unknown>): Promise<void> {
  const row = await loadIntegration(db, userId, provider);
  const meta = { ...integrationMeta<Record<string, unknown>>(row), ...patch };
  await db.prepare("UPDATE integrations SET meta_json = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE user_id = ? AND provider = ?")
    .bind(JSON.stringify(meta), userId, provider)
    .run();
}

export async function markError(db: D1Database, userId: string, provider: Provider, message: string): Promise<void> {
  await db.prepare("UPDATE integrations SET status = 'error', last_error = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE user_id = ? AND provider = ?")
    .bind(message.slice(0, 200), userId, provider)
    .run();
}

/**
 * Access token còn hạn cho Google: tự refresh khi sắp hết hạn.
 * Refresh bị từ chối (invalid_grant — người dùng thu hồi quyền) → status 'error', yêu cầu kết nối lại.
 */
export async function getAccessToken(env: Env, userId: string, provider: Provider = 'google'): Promise<string> {
  const row = await loadIntegration(env.DB, userId, provider);
  if (!row || row.status === 'revoked' || !row.access_token_enc) throw new ApiError(409, 'not_connected', 'Chưa kết nối Google Calendar');
  const ctx = { userId, provider };
  if (row.token_expires_at && row.token_expires_at > new Date().toISOString() && row.status === 'connected') {
    return decryptToken(key(env), row.access_token_enc, ctx);
  }
  if (!row.refresh_token_enc) {
    await markError(env.DB, userId, provider, 'Phiên kết nối đã hết hạn');
    throw new ApiError(409, 'reconnect_required', 'Phiên kết nối Google đã hết hạn, vui lòng kết nối lại');
  }
  try {
    const refreshed = await refreshAccessToken(env, await decryptToken(key(env), row.refresh_token_enc, ctx));
    await saveTokens(env, userId, provider, refreshed);
    return refreshed.access_token;
  } catch (err) {
    if (err instanceof GoogleAuthError && err.code === 'invalid_grant') {
      await markError(env.DB, userId, provider, 'Quyền truy cập Google đã bị thu hồi');
      throw new ApiError(409, 'reconnect_required', 'Quyền truy cập Google đã bị thu hồi, vui lòng kết nối lại');
    }
    throw new ApiError(502, 'google_unavailable', 'Không làm mới được phiên Google, vui lòng thử lại');
  }
}

/** Refresh token (giải mã) để thu hồi khi ngắt kết nối. */
export async function readRefreshToken(env: Env, row: IntegrationRow): Promise<string | null> {
  const enc = row.refresh_token_enc ?? row.access_token_enc;
  if (!enc || !env.TOKEN_ENC_KEY) return null;
  return decryptToken(env.TOKEN_ENC_KEY, enc, { userId: row.user_id, provider: row.provider }).catch(() => null);
}
