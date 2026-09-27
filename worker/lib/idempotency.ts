// Chống bấm trùng cho lệnh duyệt / POST liên quan tới tiền: header `Idempotency-Key` bắt buộc.
//
//   lần đầu              → giữ khóa ('in_progress'), chạy handler, lưu status + body ('done')
//   lặp lại, đã xong      → trả lại đúng response đã lưu (header Idempotent-Replayed: true)
//   lặp lại, đang chạy    → 409
//   cùng khóa, body khác  → 422
//   handler throw / 5xx   → nhả khóa để client thử lại với cùng khóa (response trả về thường, kể cả 4xx, được lưu)
// Dùng SAU requireAuth: `.post('/actions/:id/approve', idempotent(), handler)`.
// Khóa hết hạn sau 24 giờ (dòng hết hạn bị thay khi dùng lại khóa; cron purge dọn phần còn lại).

import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../env';
import { sha256Hex } from './crypto';
import { ApiError, unauthorized } from './http';

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

interface KeyRow {
  request_hash: string;
  status: 'in_progress' | 'done';
  status_code: number | null;
  response_json: string | null;
}

export const idempotent = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const userId = c.get('userId');
    if (!userId) throw unauthorized();
    const key = c.req.header(IDEMPOTENCY_HEADER);
    if (!key) throw new ApiError(400, 'idempotency_key_required', 'Thiếu header Idempotency-Key');
    if (!KEY_PATTERN.test(key)) throw new ApiError(400, 'idempotency_key_invalid', 'Idempotency-Key không hợp lệ (8–128 ký tự)');

    const db = c.env.DB;
    const rawBody = c.req.raw.body ? await c.req.raw.clone().text() : '';
    const requestHash = await sha256Hex(`${c.req.method} ${new URL(c.req.url).pathname}\n${rawBody}`);
    const now = new Date();

    const [, claim] = await db.batch([
      db.prepare('DELETE FROM idempotency_keys WHERE user_id = ? AND key = ? AND expires_at <= ?').bind(userId, key, now.toISOString()),
      db.prepare(
        `INSERT INTO idempotency_keys (user_id, key, request_hash, status, created_at, expires_at)
         VALUES (?, ?, ?, 'in_progress', ?, ?) ON CONFLICT (user_id, key) DO NOTHING`,
      ).bind(userId, key, requestHash, now.toISOString(), new Date(now.getTime() + IDEMPOTENCY_TTL_MS).toISOString()),
    ]);

    if (!claim?.meta?.changes) {
      const row = await db
        .prepare('SELECT request_hash, status, status_code, response_json FROM idempotency_keys WHERE user_id = ? AND key = ?')
        .bind(userId, key)
        .first<KeyRow>();
      if (!row) throw new ApiError(409, 'idempotency_conflict', 'Yêu cầu đang được xử lý, vui lòng thử lại');
      if (row.request_hash !== requestHash) throw new ApiError(422, 'idempotency_key_reused', 'Idempotency-Key đã dùng cho một yêu cầu khác');
      if (row.status === 'in_progress') throw new ApiError(409, 'idempotency_in_progress', 'Yêu cầu này đang được xử lý');
      return new Response(row.response_json ?? '', {
        status: row.status_code ?? 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Idempotent-Replayed': 'true' },
      });
    }

    const release = () => db.prepare('DELETE FROM idempotency_keys WHERE user_id = ? AND key = ?').bind(userId, key).run();
    try {
      await next();
    } catch (err) {
      await release();
      throw err;
    }
    // Hono bắt lỗi của handler qua onError → c.res đã là response lỗi, c.error được gán
    if (c.error || c.res.status >= 500) {
      await release();
      return;
    }
    await db
      .prepare("UPDATE idempotency_keys SET status = 'done', status_code = ?, response_json = ? WHERE user_id = ? AND key = ?")
      .bind(c.res.status, await c.res.clone().text(), userId, key)
      .run();
  });
