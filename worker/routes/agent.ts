// AI Workspace (Wave 3 · H). Mount: /api/agents, /api/agent
// Mọi approve / reject / request-changes bắt buộc Idempotency-Key: `.post(path, idempotent(), handler)` (worker/lib/idempotency.ts),
// đổi trạng thái + ghi audit trong một batch: `batchWithAudit` (worker/lib/audit.ts).

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';

/** Stub Wave 0 — thay bằng handler thật; giữ nguyên đường dẫn (đã mount trong worker/index.ts). */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

/** GET /api/agents — 5 agent + trạng thái + hoạt động gần nhất. */
export const agents = new Hono<AppEnv>().get('/', todo);

export const agent = new Hono<AppEnv>()
  .post('/runs', todo)
  .get('/runs/:id', todo) // poll timeline
  .get('/actions', todo) // ?status=pending
  .post('/actions/approve-batch', todo)
  .post('/actions/:id/approve', todo)
  .post('/actions/:id/reject', todo)
  .post('/actions/:id/request-changes', todo);
