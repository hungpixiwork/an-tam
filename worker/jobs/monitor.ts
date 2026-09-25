// Cron "AI theo dõi": chạy engine cho mọi người dùng, mở / đóng cảnh báo, chụp snapshot tháng.

import type { Env } from '../env';
import { snapshotStatement } from '../lib/refresh';
import { loadUserState, syncAlerts } from '../lib/state';

const BATCH = 50;

export async function runMonitor(env: Env): Promise<void> {
  let offset = 0;
  for (;;) {
    const { results } = await env.DB.prepare('SELECT id FROM users ORDER BY id LIMIT ? OFFSET ?').bind(BATCH, offset).all<{ id: string }>();
    for (const { id } of results) {
      const state = await loadUserState(env.DB, id);
      await syncAlerts(env.DB, id, state);
      // Chụp lại snapshot tháng hiện tại mỗi ngày — tháng khép lại sẽ giữ số của ngày cuối cùng
      await snapshotStatement(env.DB, id, state).run();
    }
    if (results.length < BATCH) break;
    offset += BATCH;
  }
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()).run();
}
