// Lịch AI (Wave 2 · G). Mount: /api/calendar

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';

/** Stub Wave 0 — thay bằng handler thật; giữ nguyên đường dẫn (đã mount trong worker/index.ts). */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

export const calendar = new Hono<AppEnv>()
  .get('/', todo) // ?week=YYYY-Www
  .get('/events', todo)
  .post('/events', todo)
  .patch('/events/:id', todo)
  .delete('/events/:id', todo)
  .post('/sync', todo)
  .post('/auto-schedule', todo);
