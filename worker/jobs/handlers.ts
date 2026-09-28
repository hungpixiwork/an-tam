// Xử lý từng thông điệp của Queue an-tam-jobs theo `type`. Mỗi handler chỉ làm việc cho MỘT người dùng
// để consumer chia nhỏ tải; lỗi ném ra → Queue tự thử lại (max_retries trong wrangler.jsonc).

import type { Env, JobMessage } from '../env';
import { snapshotStatement } from '../lib/refresh';
import { loadUserState, syncAlerts } from '../lib/state';

/** "AI theo dõi" cho một người: chạy engine, mở / đóng cảnh báo, chụp snapshot tháng hiện tại. */
export async function refreshUser(env: Env, userId: string): Promise<void> {
  const state = await loadUserState(env.DB, userId);
  await syncAlerts(env.DB, userId, state);
  // Chụp lại snapshot tháng hiện tại mỗi ngày — tháng khép lại sẽ giữ số của ngày cuối cùng
  await snapshotStatement(env.DB, userId, state).run();
}

/** Trả về false nếu loại thông điệp không biết (consumer vẫn ack để không thử lại vô ích). */
export async function handleJob(env: Env, msg: JobMessage): Promise<boolean> {
  switch (msg.type) {
    case 'user.refresh':
      if (!msg.userId) return false;
      await refreshUser(env, msg.userId);
      return true;
    default:
      return false;
  }
}

/** Consumer của Queue: ack từng thông điệp xong, retry riêng thông điệp lỗi. */
export async function consumeJobs(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
  for (const m of batch.messages) {
    try {
      if (!(await handleJob(env, m.body))) console.warn('jobs: bỏ qua thông điệp không hợp lệ', m.body?.type);
      m.ack();
    } catch (err) {
      console.error('jobs: lỗi', m.body?.type, err);
      m.retry();
    }
  }
}
