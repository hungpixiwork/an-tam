// Hành động 1 chạm từ gợi ý (Mô phỏng, Lựa chọn, dải liên kết trên trang CRUD). Mount: /api/actions
// Không qua lượt Agent / LLM: kiểm tra payload → ghi agent_actions (source 'user') → thực thi ngay (cùng executor, audit, idempotency).
// Hoàn tác trong 10 phút bằng giá trị "trước" lưu trong payload.

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { ACTION_LINK, ACTION_TYPES, DIRECT_ACTIONS, isActionType, previewAction, validateAction } from '../../shared/agent/actions';
import { ApiError, ok } from '../lib/http';
import { body } from '../lib/validate';
import { idempotent } from '../lib/idempotency';
import { approveAndExecute, undoAction, UNDO_WINDOW_MS } from '../agents/executor';

const applySchema = z.object({
  type: z.string().max(40),
  payload: z.unknown(),
  title: z.string().trim().min(2).max(120),
  /** Bước gợi ý đã áp dụng (raise_reserve…) + lựa chọn liên quan → không gợi ý lại. */
  stepKey: z.string().max(40).optional(),
  choiceId: z.string().max(64).optional(),
});

export const actions = new Hono<AppEnv>()
  .post('/apply', idempotent(), body(applySchema), async (c) => {
    const v = c.req.valid('json');
    const userId = c.get('userId');
    const db = c.env.DB;
    if (!isActionType(v.type) || !DIRECT_ACTIONS.includes(v.type)) throw new ApiError(400, 'invalid_input', 'Loại hành động không được áp dụng trực tiếp');
    let payload: unknown;
    try {
      payload = validateAction(v.type, v.payload);
    } catch {
      throw new ApiError(400, 'invalid_input', 'Dữ liệu hành động không hợp lệ');
    }
    const d = ACTION_TYPES[v.type];
    const preview = previewAction(v.type, payload);
    const id = crypto.randomUUID();
    const now = new Date();
    await db.prepare(
      `INSERT INTO agent_actions (id, user_id, run_id, source, agent, type, title, payload_json, preview_json, integration, risk, status, requires_approval,
         created_at, updated_at, expires_at, step_key, choice_id)
       VALUES (?, ?, NULL, 'user', ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?, ?, ?)`,
    ).bind(
      id, userId, d.agent, v.type, v.title, JSON.stringify(payload), JSON.stringify(preview), d.integration === 'google_calendar_or_local' ? 'local' : d.integration, d.risk,
      now.toISOString(), now.toISOString(), new Date(now.getTime() + UNDO_WINDOW_MS).toISOString(), v.stepKey ?? null, v.choiceId ?? null,
    ).run();
    const res = await approveAndExecute(c.env, userId, id, 'user');
    return ok(c, { ...res, preview, to: ACTION_LINK[v.type] ?? null, undoUntil: new Date(Date.now() + UNDO_WINDOW_MS).toISOString() });
  })
  .post('/:id/undo', idempotent(), async (c) => ok(c, await undoAction(c.env, c.get('userId'), c.req.param('id'))))
  /** Các bước gợi ý đã áp dụng (chưa hoàn tác) của một lựa chọn — để giao diện hiện "Đã áp dụng" và không gợi ý lại. */
  .get('/applied', async (c) => {
    const choiceId = c.req.query('choiceId');
    const { results } = await c.env.DB.prepare(
      `SELECT id, step_key, type, executed_at FROM agent_actions
       WHERE user_id = ? AND status = 'done' AND undone_at IS NULL AND step_key IS NOT NULL ${choiceId ? 'AND choice_id = ?' : ''}
       ORDER BY executed_at DESC LIMIT 50`,
    ).bind(...(choiceId ? [c.get('userId'), choiceId] : [c.get('userId')])).all<{ id: string; step_key: string; type: string; executed_at: string }>();
    return ok(c, results.map((r) => ({ id: r.id, stepKey: r.step_key, type: r.type, executedAt: r.executed_at })));
  });
