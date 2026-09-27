// Lựa chọn cuộc đời B1 (Wave 2 · F). Mount: /api/life-choices

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';

/** Stub Wave 0 — thay bằng handler thật; giữ nguyên đường dẫn (đã mount trong worker/index.ts). */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

// Đường dẫn tĩnh (templates, evaluate, compare) khai báo trước '/:id'
export const lifeChoices = new Hono<AppEnv>()
  .get('/templates', todo)
  .post('/evaluate', todo)
  .post('/compare', todo)
  .get('/', todo)
  .post('/', todo)
  .get('/:id', todo)
  .patch('/:id', todo)
  .delete('/:id', todo)
  .post('/:id/prereqs', todo)
  .patch('/:id/prereqs/:prereqId', todo)
  .delete('/:id/prereqs/:prereqId', todo)
  .post('/:id/tasks', todo)
  .patch('/:id/tasks/:taskId', todo)
  .delete('/:id/tasks/:taskId', todo);
