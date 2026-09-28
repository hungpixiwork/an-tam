// AI Workspace. Mount: /api/agents, /api/agent
// Lệnh ghi đổi trạng thái (approve / reject / request-changes / approve-batch) bắt buộc Idempotency-Key.

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { AgentInfo, ApproveBatchResult } from '../../shared/types/api';
import { AGENT_KEYS } from '../../shared/agent/tools';
import { ApiError, notFound, ok } from '../lib/http';
import { body, dateString } from '../lib/validate';
import { idempotent } from '../lib/idempotency';
import { latestRunId, listActions, loadRunView } from '../agents/runner';
import { approveAndExecute, decline } from '../agents/executor';
import { decisionRequestSchema } from './simulations';

const runSchema = z.object({
  prompt: z.string().trim().min(3, 'Vui lòng nhập yêu cầu').max(500),
  weekStart: dateString.optional(),
  /** Từ trang Mô phỏng: chạy đúng mô phỏng cú sốc kép này rồi đề xuất cập nhật kế hoạch. */
  decision: decisionRequestSchema.optional(),
});
const noteSchema = z.object({ note: z.string().trim().max(300).default('') });
const batchSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(20) });
const STATUSES = ['pending', 'approved', 'executing', 'done', 'rejected', 'changes_requested', 'failed', 'expired'];

/** GET /api/agents — 5 agent + trạng thái + việc gần nhất (agent_steps). */
export const agents = new Hono<AppEnv>().get('/', async (c) => {
  const userId = c.get('userId');
  const db = c.env.DB;
  // Bước gần nhất của mỗi agent: trong lượt chạy mới nhất có agent đó, ưu tiên kết quả thực thi ('tool' / 'error'),
  // nếu chưa thực thi thì lấy việc đầu tiên agent đề xuất ('propose' / 'note').
  const [steps, running] = await Promise.all([
    db.prepare(
      `SELECT s.run_id, s.idx, s.agent, s.kind, s.title, s.started_at, r.created_at AS run_at FROM agent_steps s
       JOIN agent_runs r ON r.id = s.run_id
       WHERE s.user_id = ? AND s.kind IN ('note', 'propose', 'tool', 'error')
         AND r.id IN (SELECT id FROM agent_runs WHERE user_id = ? ORDER BY created_at DESC LIMIT 5)`,
    ).bind(userId, userId).all<{ run_id: string; idx: number; agent: string; kind: string; title: string; started_at: string; run_at: string }>(),
    db.prepare("SELECT agents_json FROM agent_runs WHERE user_id = ? AND status = 'running'").bind(userId).all<{ agents_json: string }>(),
  ]);
  const busy = new Set(running.results.flatMap((r) => JSON.parse(r.agents_json) as string[]));
  const data: AgentInfo[] = AGENT_KEYS.map((key) => {
    const mine = steps.results.filter((s) => s.agent === key);
    const runAt = mine.reduce((m, s) => (s.run_at > m ? s.run_at : m), '');
    const inRun = mine.filter((s) => s.run_at === runAt);
    const executed = inRun.filter((s) => s.kind === 'tool' || s.kind === 'error').sort((a, b) => b.idx - a.idx)[0];
    const l = executed ?? inRun.sort((a, b) => a.idx - b.idx)[0];
    return { key, status: busy.has(key) ? 'working' : l ? 'active' : 'idle', lastActivity: l ? { title: l.title, at: l.started_at } : null };
  });
  return ok(c, data);
});

export const agent = new Hono<AppEnv>()
  .post('/runs', body(runSchema), async (c) => {
    const { prompt, weekStart, decision } = c.req.valid('json');
    const userId = c.get('userId');
    const { submitAgentRun } = await import('../agents/coordinator');
    const runId = await submitAgentRun(c.env, userId, { prompt, weekStart, decision });
    return ok(c, { runId, status: 'running' as const }, 202);
  })
  .get('/runs/latest', async (c) => {
    const id = await latestRunId(c.env.DB, c.get('userId'));
    return ok(c, id ? await loadRunView(c.env.DB, c.get('userId'), id) : null);
  })
  .get('/runs/:id', async (c) => ok(c, await loadRunView(c.env.DB, c.get('userId'), c.req.param('id')))) // poll timeline
  .get('/actions', async (c) => {
    const s = c.req.query('status');
    if (s && !STATUSES.includes(s)) throw new ApiError(400, 'invalid_input', 'Trạng thái không hợp lệ');
    return ok(c, await listActions(c.env.DB, c.get('userId'), s));
  })
  .post('/actions/approve-batch', idempotent(), body(batchSchema), async (c) => {
    const userId = c.get('userId');
    const results: ApproveBatchResult['results'] = [];
    // Tuần tự: chuỗi hash audit theo user phải ghi lần lượt
    for (const id of [...new Set(c.req.valid('json').ids)]) {
      try {
        const r = await approveAndExecute(c.env, userId, id);
        results.push({ id, status: r.status, error: r.error });
      } catch (err) {
        if (!(err instanceof ApiError)) throw err;
        const cur = await c.env.DB.prepare('SELECT status FROM agent_actions WHERE id = ? AND user_id = ?').bind(id, userId).first<{ status: ApproveBatchResult['results'][number]['status'] }>();
        results.push({ id, status: cur?.status ?? 'failed', error: err.message });
      }
    }
    const data: ApproveBatchResult = { results };
    return ok(c, data);
  })
  .post('/actions/:id/approve', idempotent(), async (c) => ok(c, await approveAndExecute(c.env, c.get('userId'), c.req.param('id'))))
  .post('/actions/:id/reject', idempotent(), async (c) => {
    await decline(c.env, c.get('userId'), c.req.param('id'), 'rejected');
    return ok(c, null);
  })
  /** Yêu cầu điều chỉnh: đánh dấu mọi hành động đang chờ của lượt này, chạy lại planner kèm ghi chú → lượt mới. */
  .post('/actions/:id/request-changes', idempotent(), body(noteSchema), async (c) => {
    const userId = c.get('userId');
    const db = c.env.DB;
    const { note } = c.req.valid('json');
    const row = await decline(c.env, userId, c.req.param('id'), 'changes_requested', note);
    if (!row.run_id) return ok(c, { runId: null });
    const { results } = await db.prepare("SELECT id FROM agent_actions WHERE run_id = ? AND user_id = ? AND status = 'pending'").bind(row.run_id, userId).all<{ id: string }>();
    for (const r of results) await decline(c.env, userId, r.id, 'changes_requested', note);
    const run = await db.prepare('SELECT prompt_masked FROM agent_runs WHERE id = ? AND user_id = ?').bind(row.run_id, userId).first<{ prompt_masked: string }>();
    if (!run) throw notFound('Không tìm thấy lượt chạy');
    const { submitAgentRun, originalRunInput } = await import('../agents/coordinator');
    // Ưu tiên lệnh gốc đã mã hóa (còn số tiền thật); lượt cũ chưa có thì dùng bản đã che như trước
    const original = await originalRunInput(c.env, userId, row.run_id);
    const input = original
      ? { prompt: original.prompt, weekStart: original.weekStart, decision: original.decision, note: note || undefined }
      : { prompt: run.prompt_masked.split(' · Điều chỉnh: ')[0], note: note || undefined };
    const runId = await submitAgentRun(c.env, userId, input);
    return ok(c, { runId });
  });
