// Kỹ năng + vốn con người B2 (Wave 1 · C). Mount: /api/skills, /api/human-capital

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';

/** Stub Wave 0 — thay bằng handler thật; giữ nguyên đường dẫn (đã mount trong worker/index.ts). */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

export const skills = new Hono<AppEnv>()
  .get('/', todo)
  .post('/', todo)
  .patch('/:id', todo)
  .delete('/:id', todo);

/** GET /api/human-capital → HumanCapitalResult (shared/engine/humanCapital.ts). */
export const humanCapitalRoutes = new Hono<AppEnv>().get('/', todo);
