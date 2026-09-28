// Ứng dụng & tích hợp. Mount: /api/integrations
// Google Calendar: OAuth PKCE → token mã hóa (worker/integrations/tokens.ts) → đồng bộ tuần (google/sync.ts).
// Redirect OAuth: <APP_ORIGIN>/api/integrations/google/callback

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { BankLink, IntegrationInfo } from '../../shared/types/api';
import { vnDate } from '../../shared/engine/month';
import { weekStartOf } from '../../shared/engine/scheduler';
import { randomToken } from '../lib/crypto';
import { ApiError, ok } from '../lib/http';
import { writeAudit } from '../lib/audit';
import { body, dateString } from '../lib/validate';
import { accountHash, digitsOnly, maskAccount, newVerifyCode } from '../integrations/sepay/webhook';
import { authUrl, exchangeCode, googleConfigured, pkceChallenge, redirectUri, revokeToken } from '../integrations/google/oauth';
import { loadIntegration, readRefreshToken, saveTokens } from '../integrations/tokens';
import { ensureAppCalendar, syncGoogleWeek } from '../integrations/google/sync';

const STATE_TTL_MS = 10 * 60 * 1000;

const linkSchema = z.object({
  bankCode: z.string().trim().min(2, 'Vui lòng chọn ngân hàng').max(20),
  accountNumber: z.string().trim().refine((v) => /^[\d\s-]+$/.test(v) && /^\d{6,20}$/.test(digitsOnly(v)), 'Số tài khoản gồm 6–20 chữ số'),
});

interface BankRow {
  id: string; bank_code: string; account_masked: string; status: BankLink['status']; verified_at: string | null; last_event_at: string | null; created_at: string; events: number;
  verify_code: string | null; verified_by_event_id: string | null;
}

/** Tài khoản ngân hàng đang liên kết (chưa thu hồi) + số giao dịch đã nhận kể từ khi liên kết. */
const loadBank = (db: D1Database, userId: string) =>
  db.prepare(
    `SELECT b.*, (SELECT COUNT(*) FROM bank_webhook_events e WHERE e.user_id = b.user_id AND e.received_at >= b.created_at) AS events
     FROM bank_accounts b WHERE b.user_id = ? AND b.status != 'revoked' ORDER BY b.created_at DESC LIMIT 1`,
  ).bind(userId).first<BankRow>();

const toBank = (b: BankRow): BankLink => ({ id: b.id, bankCode: b.bank_code, accountMasked: b.account_masked, status: b.status, verifiedAt: b.verified_at, lastEventAt: b.last_event_at, events: b.events });

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
    const [row, bank] = await Promise.all([loadIntegration(c.env.DB, c.get('userId'), 'google'), loadBank(c.env.DB, c.get('userId'))]);
    const google: IntegrationInfo = {
      provider: 'google',
      configured: googleConfigured(c.env),
      status: !row || row.status === 'revoked' ? 'disconnected' : row.status,
      scopes: row?.scopes ? row.scopes.split(' ').filter(Boolean) : [],
      lastSyncedAt: row?.last_synced_at ?? null,
      lastError: row?.last_error ?? null,
      connectedAt: row && row.status !== 'revoked' ? row.created_at : null,
    };
    const sepay: IntegrationInfo = {
      provider: 'sepay',
      configured: !!c.env.SEPAY_WEBHOOK_KEY,
      status: !bank ? 'disconnected' : bank.status === 'active' ? 'connected' : 'pending',
      scopes: bank ? ['transactions.read'] : [],
      lastSyncedAt: bank?.last_event_at ?? null,
      lastError: null,
      connectedAt: bank?.verified_at ?? null,
      bank: bank ? toBank(bank) : null,
    };
    return ok(c, { items: [google, sepay] });
  })
  // Liên kết tài khoản nhận biến động số dư qua SePay: chỉ lưu 4 số cuối + hash, chờ giao dịch đầu tiên để xác thực.
  .post('/sepay/link', body(linkSchema), async (c) => {
    const userId = c.get('userId');
    const { bankCode, accountNumber } = c.req.valid('json');
    const code = bankCode.toUpperCase();
    const id = crypto.randomUUID();
    const db = c.env.DB;
    const hash = await accountHash(accountNumber);
    // Một tài khoản chỉ thuộc một người — tránh người khác liên kết để đọc giao dịch của bạn.
    const taken = await db
      .prepare("SELECT 1 FROM bank_accounts WHERE account_hash = ? AND user_id != ? AND status IN ('pending', 'active') LIMIT 1")
      .bind(hash, userId)
      .first();
    if (taken) throw new ApiError(409, 'account_taken', 'Tài khoản này đã được liên kết với một người dùng khác.');
    await db.batch([
      db.prepare("UPDATE bank_accounts SET status = 'revoked' WHERE user_id = ? AND status != 'revoked'").bind(userId),
      db.prepare("INSERT INTO bank_accounts (id, user_id, provider, bank_code, account_masked, account_hash, status, verify_code) VALUES (?, ?, 'sepay', ?, ?, ?, 'pending', ?)")
        .bind(id, userId, code, maskAccount(accountNumber), hash, newVerifyCode()),
    ]);
    await writeAudit(db, { userId, actor: 'user', agent: 'bank', action: 'bank.link', entityType: 'bank_account', entityId: id, summaryMasked: `Liên kết tài khoản ${code} (chỉ đọc giao dịch), chờ xác thực`, dataLabel: 'Tài khoản ngân hàng (đã che số)', status: 'completed', approver: 'user' }, { salt: c.env.AUDIT_HASH_SALT });
    return ok(c, toBank((await loadBank(db, userId))!), 201);
  })
  // Xác thực: đã nhận ít nhất 1 giao dịch từ SePay cho đúng tài khoản này (chứng minh webhook chạy và tài khoản là của bạn).
  .post('/sepay/verify', async (c) => {
    const userId = c.get('userId');
    const bank = await loadBank(c.env.DB, userId);
    if (!bank) throw new ApiError(404, 'not_found', 'Bạn chưa liên kết tài khoản ngân hàng');
    if (bank.status === 'active') return ok(c, toBank(bank));
    // Chỉ kích hoạt khi đã nhận giao dịch có đúng mã xác thực (chứng minh bạn là chủ tài khoản).
    if (!bank.verified_by_event_id) {
      throw new ApiError(409, 'not_verified', `Chưa nhận được giao dịch xác thực. Hãy chuyển 2.000đ vào tài khoản này với nội dung ${bank.verify_code ?? ''} rồi bấm Xác thực lại.`);
    }
    const now = new Date().toISOString();
    await c.env.DB.prepare("UPDATE bank_accounts SET status = 'active', verified_at = ? WHERE id = ?").bind(now, bank.id).run();
    await writeAudit(c.env.DB, { userId, actor: 'user', agent: 'bank', action: 'bank.verify', entityType: 'bank_account', entityId: bank.id, summaryMasked: `Xác thực tài khoản ${bank.bank_code} sau khi nhận giao dịch có mã xác thực`, dataLabel: 'Tài khoản ngân hàng (đã che số)', status: 'approved', approver: 'user' }, { salt: c.env.AUDIT_HASH_SALT });
    return ok(c, toBank({ ...bank, status: 'active', verified_at: now }));
  })
  .delete('/sepay', async (c) => {
    const userId = c.get('userId');
    const [res] = await c.env.DB.batch([
      c.env.DB.prepare("UPDATE bank_accounts SET status = 'revoked' WHERE user_id = ? AND status != 'revoked'").bind(userId),
      // Ngắt liên kết → xóa nội dung gốc các sự kiện ngân hàng đã nhận (giao dịch trong sổ thu chi vẫn giữ).
      c.env.DB.prepare("UPDATE bank_webhook_events SET payload_json = '{}' WHERE user_id = ?").bind(userId),
    ]);
    if (res.meta.changes) await writeAudit(c.env.DB, { userId, actor: 'user', agent: 'bank', action: 'bank.unlink', entityType: 'bank_account', summaryMasked: 'Ngắt liên kết tài khoản ngân hàng', status: 'completed', approver: 'user' }, { salt: c.env.AUDIT_HASH_SALT });
    return ok(c, null);
  })
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
