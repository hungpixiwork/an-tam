// Ứng dụng & tích hợp. Mount: /api/integrations
// Google Calendar: OAuth PKCE → token mã hóa (worker/integrations/tokens.ts) → đồng bộ tuần (google/sync.ts).
// Redirect OAuth: <APP_ORIGIN>/api/integrations/google/callback

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import type { IntegrationInfo } from '../../shared/types/api';
import { vnDate } from '../../shared/engine/month';
import { weekStartOf } from '../../shared/engine/scheduler';
import { randomToken } from '../lib/crypto';
import { ApiError, ok } from '../lib/http';
import { writeAudit } from '../lib/audit';
import { dateString } from '../lib/validate';
import { authUrl, exchangeCode, googleConfigured, pkceChallenge, redirectUri, revokeToken } from '../integrations/google/oauth';
import { loadIntegration, readRefreshToken, saveTokens } from '../integrations/tokens';
import { ensureAppCalendar, syncGoogleWeek } from '../integrations/google/sync';

const STATE_TTL_MS = 10 * 60 * 1000;

/** SePay — màn khác làm. */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

/** Chặn provider chưa hỗ trợ. */
const onlyGoogle = (p: string) => {
  if (p !== 'google') throw new ApiError(501, 'not_implemented', 'Tích hợp này đang được phát triển');
};

const notConfigured = () =>
  new ApiError(503, 'integration_not_configured', 'Chưa cấu hình Google — cần GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET và TOKEN_ENC_KEY trên máy chủ');

/** Chỉ cho quay về đường dẫn nội bộ. */
const safeReturn = (p: string | undefined) => (p && /^\/[a-z0-9/_-]*$/i.test(p) ? p : '/lich-ai');

export const integrations = new Hono<AppEnv>()
  .get('/', async (c) => {
    const row = await loadIntegration(c.env.DB, c.get('userId'), 'google');
    const google: IntegrationInfo = {
      provider: 'google',
      configured: googleConfigured(c.env),
      status: !row || row.status === 'revoked' ? 'disconnected' : row.status,
      scopes: row?.scopes ? row.scopes.split(' ').filter(Boolean) : [],
      lastSyncedAt: row?.last_synced_at ?? null,
      lastError: row?.last_error ?? null,
      connectedAt: row && row.status !== 'revoked' ? row.created_at : null,
    };
    return ok(c, { items: [google] });
  })
  .post('/sepay/link', todo)
  .post('/sepay/verify', todo)
  .get('/:provider/connect', async (c) => {
    onlyGoogle(c.req.param('provider'));
    if (!googleConfigured(c.env)) throw notConfigured();
    const state = randomToken(24);
    const verifier = randomToken(48);
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM oauth_states WHERE expires_at <= ?').bind(new Date().toISOString()),
      c.env.DB.prepare('INSERT INTO oauth_states (state, user_id, provider, code_verifier, return_to, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(state, c.get('userId'), 'google', verifier, safeReturn(c.req.query('returnTo')), new Date(Date.now() + STATE_TTL_MS).toISOString()),
    ]);
    return c.redirect(authUrl(c.env, { state, challenge: await pkceChallenge(verifier), redirectUri: redirectUri(c.env, c.req.url) }), 302);
  })
  .get('/:provider/callback', async (c) => {
    onlyGoogle(c.req.param('provider'));
    const userId = c.get('userId');
    const state = c.req.query('state') ?? '';
    const row = await c.env.DB.prepare('SELECT user_id, code_verifier, return_to, expires_at FROM oauth_states WHERE state = ?')
      .bind(state)
      .first<{ user_id: string; code_verifier: string; return_to: string; expires_at: string }>();
    await c.env.DB.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();
    const back = (result: string) => c.redirect(`${safeReturn(row?.return_to)}?google=${result}`, 302);
    if (!row || row.user_id !== userId || row.expires_at <= new Date().toISOString()) return back('invalid_state');
    const code = c.req.query('code');
    if (!code || c.req.query('error')) return back('denied');
    if (!googleConfigured(c.env)) throw notConfigured();
    try {
      const tokens = await exchangeCode(c.env, code, row.code_verifier, redirectUri(c.env, c.req.url));
      await saveTokens(c.env, userId, 'google', tokens);
      await ensureAppCalendar(c.env, userId, tokens.access_token).catch(() => undefined);
      await writeAudit(c.env.DB, { userId, actor: 'user', action: 'integration.connect', entityType: 'integration', entityId: 'google', summaryMasked: 'Kết nối Google Calendar (chỉ đọc lịch chính, ghi vào lịch "An Tâm")', dataLabel: 'Lịch Google', status: 'completed', approver: 'user' }, { salt: c.env.AUDIT_HASH_SALT });
      return back('connected');
    } catch {
      return back('error');
    }
  })
  .post('/:provider/sync', async (c) => {
    onlyGoogle(c.req.param('provider'));
    const q = c.req.query('week');
    const week = weekStartOf(q && dateString.safeParse(q).success ? q : vnDate());
    return ok(c, await syncGoogleWeek(c.env, c.get('userId'), week));
  })
  .delete('/:provider', async (c) => {
    onlyGoogle(c.req.param('provider'));
    const userId = c.get('userId');
    const row = await loadIntegration(c.env.DB, userId, 'google');
    if (row) {
      const token = await readRefreshToken(c.env, row);
      if (token) await revokeToken(token);
      await c.env.DB.batch([
        c.env.DB.prepare('DELETE FROM integrations WHERE user_id = ? AND provider = ?').bind(userId, 'google'),
        // Sự kiện kéo từ Google không còn nguồn → xóa; sự kiện AI giữ lại (bỏ liên kết)
        c.env.DB.prepare("DELETE FROM calendar_events WHERE user_id = ? AND source = 'google'").bind(userId),
        c.env.DB.prepare("UPDATE calendar_events SET google_event_id = NULL WHERE user_id = ? AND source = 'agent'").bind(userId),
      ]);
      await writeAudit(c.env.DB, { userId, actor: 'user', action: 'integration.disconnect', entityType: 'integration', entityId: 'google', summaryMasked: 'Ngắt kết nối Google Calendar và thu hồi quyền', status: 'completed', approver: 'user' }, { salt: c.env.AUDIT_HASH_SALT });
    }
    return ok(c, null);
  });
