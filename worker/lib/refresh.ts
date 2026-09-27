// Sau mỗi lần người dùng ghi dữ liệu tài chính: "AI" chạy lại engine, cập nhật cảnh báo,
// chụp snapshot tháng hiện tại và ghi một dòng vào nhật ký AI theo dõi.

import type { UserState } from '../../shared/types/domain';
import { emergencyAmount, freeCashflow, peaceScore } from '../../shared/engine/peace';
import { investedValue, totalValue } from '../../shared/engine/portfolio';
import { loadUserState, syncAlerts, type LoadedState } from './state';

/** Các thay đổi liên tiếp cùng loại trong khoảng này được gộp vào 1 dòng nhật ký. */
const COALESCE_MINUTES = 30;

/**
 * Ghi đè snapshot của tháng hiện tại bằng số liệu sống. Sang tháng mới, snapshot tháng trước
 * không còn bị ghi đè nữa nên trở thành số chốt của tháng đó (dùng cho biểu đồ 12 tháng).
 */
export const snapshotStatement = (db: D1Database, userId: string, state: UserState): D1PreparedStatement =>
  db.prepare(
    `INSERT INTO net_worth_snapshots (user_id, month, total, emergency, invested, cashflow, cash, other, debt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, month) DO UPDATE SET total = excluded.total, emergency = excluded.emergency,
       invested = excluded.invested, cashflow = excluded.cashflow, cash = excluded.cash, other = excluded.other, debt = excluded.debt`,
  ).bind(
    userId, state.today, totalValue(state.holdings), emergencyAmount(state), investedValue(state.holdings), freeCashflow(state),
    sumCategory(state, 'cash'), sumCategory(state, 'other'), (state.liabilities ?? []).reduce((s, l) => s + l.balance, 0),
  );

const sumCategory = (state: UserState, category: string) => state.holdings.filter((h) => h.category === category).reduce((s, h) => s + h.value, 0);

export interface Change {
  /** Tiêu đề nhật ký, cũng là khóa gộp: "Cập nhật sổ thu chi", "Thêm tài sản"... */
  title: string;
  /** Câu mô tả thêm (tùy chọn) nối sau phần điểm an tâm — có thể tính từ state sau khi ghi. */
  detail?: string | ((state: LoadedState) => string);
  /** State trước khi ghi — để so điểm an tâm trước / sau. */
  before?: UserState;
}

export async function afterChange(db: D1Database, userId: string, change: Change): Promise<LoadedState> {
  const state = await loadUserState(db, userId);
  await syncAlerts(db, userId, state);

  const after = peaceScore(state).score;
  const beforeScore = change.before ? peaceScore(change.before).score : null;
  const scoreLine = beforeScore === null || beforeScore === after ? `Mức an tâm hiện tại: ${after}.` : `Mức an tâm ${beforeScore} → ${after}.`;
  const detail = typeof change.detail === 'function' ? change.detail(state) : change.detail;
  const body = detail ? `${scoreLine} ${detail}` : scoreLine;

  const now = new Date();
  const since = new Date(now.getTime() - COALESCE_MINUTES * 60_000).toISOString();
  const recent = await db
    .prepare("SELECT id FROM ai_events WHERE user_id = ? AND type = 'analysis' AND title = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1")
    .bind(userId, change.title, since)
    .first<{ id: string }>();

  await db.batch([
    snapshotStatement(db, userId, state),
    recent
      ? db.prepare('UPDATE ai_events SET body = ?, created_at = ? WHERE id = ?').bind(body, now.toISOString(), recent.id)
      : db.prepare("INSERT INTO ai_events (id, user_id, type, title, body, created_at) VALUES (?, ?, 'analysis', ?, ?, ?)")
          .bind(crypto.randomUUID(), userId, change.title, body, now.toISOString()),
  ]);
  return state;
}
