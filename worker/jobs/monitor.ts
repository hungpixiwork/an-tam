// Cron "AI theo dõi": chạy engine cho mọi người dùng, mở / đóng cảnh báo.

import type { Env } from '../env';
import { loadUserState, syncAlerts } from '../lib/state';

const BATCH = 50;

export async function runMonitor(env: Env): Promise<void> {
  let offset = 0;
  for (;;) {
    const { results } = await env.DB.prepare('SELECT id FROM users ORDER BY id LIMIT ? OFFSET ?').bind(BATCH, offset).all<{ id: string }>();
    for (const { id } of results) {
      await syncAlerts(env.DB, id, await loadUserState(env.DB, id));
    }
    if (results.length < BATCH) break;
    offset += BATCH;
  }
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()).run();
}
