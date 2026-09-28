// Cron "AI theo dõi" hằng ngày: chỉ lật trang danh sách người dùng theo keyset (id > ?) và đẩy từng lô
// { type: 'user.refresh', userId } vào Queue an-tam-jobs — consumer (worker/jobs/handlers.ts) làm việc nặng.
// Không có binding JOBS (test / môi trường thiếu Queue) → xử lý trực tiếp từng người như trước.

import type { Env, JobMessage } from '../env';
import { refreshUser } from './handlers';

/** Kích thước trang keyset; sendBatch nhận tối đa 100 thông điệp mỗi lần. */
export const PAGE = 100;

export async function runMonitor(env: Env): Promise<{ users: number }> {
  let after = '';
  let users = 0;
  for (;;) {
    const { results } = await env.DB.prepare('SELECT id FROM users WHERE id > ? ORDER BY id LIMIT ?').bind(after, PAGE).all<{ id: string }>();
    if (!results.length) break;
    if (env.JOBS) {
      await env.JOBS.sendBatch(results.map(({ id }) => ({ body: { type: 'user.refresh', userId: id } satisfies JobMessage })));
    } else {
      for (const { id } of results) await refreshUser(env, id);
    }
    users += results.length;
    after = results[results.length - 1].id;
    if (results.length < PAGE) break;
  }
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()).run();
  return { users };
}
