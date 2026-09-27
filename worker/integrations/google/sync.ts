// Đồng bộ 2 chiều an toàn cho 1 tuần:
//   kéo  — sự kiện lịch chính Google → calendar_events (source 'google', chỉ đọc)
//   đẩy  — sự kiện AI đã được duyệt (source 'agent', chưa có google_event_id) → lịch phụ "An Tâm"

import type { Env } from '../../env';
import type { CalendarSyncInfo, CalendarSyncResult } from '../../../shared/types/api';
import { addDays } from '../../../shared/engine/scheduler';
import { ApiError } from '../../lib/http';
import { getAccessToken, integrationMeta, loadIntegration, markError, setMeta } from '../tokens';
import { appCalendarExists, createAppCalendar, insertAppEvent, listPrimaryEvents } from './calendar';
import { googleConfigured } from './oauth';

export async function syncInfo(env: Env, userId: string): Promise<CalendarSyncInfo> {
  const row = await loadIntegration(env.DB, userId, 'google');
  return {
    configured: googleConfigured(env),
    status: !row || row.status === 'revoked' ? 'disconnected' : row.status,
    lastSyncedAt: row?.last_synced_at ?? null,
    lastError: row?.last_error ?? null,
  };
}

/** Id lịch "An Tâm" — tạo mới nếu chưa có hoặc đã bị xóa trên Google. */
export async function ensureAppCalendar(env: Env, userId: string, token: string): Promise<string> {
  const meta = integrationMeta<{ calendarId: string }>(await loadIntegration(env.DB, userId, 'google'));
  if (meta.calendarId && (await appCalendarExists(token, meta.calendarId))) return meta.calendarId;
  const id = await createAppCalendar(token);
  await setMeta(env.DB, userId, 'google', { calendarId: id });
  return id;
}

interface AgentRow { id: string; title: string; note: string; starts_at: string; ends_at: string }

/** Đẩy các sự kiện AI đã duyệt (trong khoảng ngày) lên lịch "An Tâm". */
export async function pushApproved(env: Env, userId: string, token: string, fromDay: string, toDay: string): Promise<number> {
  const { results } = await env.DB.prepare(
    "SELECT id, title, note, starts_at, ends_at FROM calendar_events WHERE user_id = ? AND source = 'agent' AND google_event_id IS NULL AND starts_at >= ? AND starts_at < ?",
  ).bind(userId, `${fromDay}T00:00`, `${toDay}T00:00`).all<AgentRow>();
  if (!results.length) return 0;
  const calendarId = await ensureAppCalendar(env, userId, token);
  let pushed = 0;
  for (const r of results) {
    const gid = await insertAppEvent(token, calendarId, { title: r.title, note: r.note, startsAt: r.starts_at, endsAt: r.ends_at });
    await env.DB.prepare('UPDATE calendar_events SET google_event_id = ? WHERE id = ? AND user_id = ?').bind(`app:${gid}`, r.id, userId).run();
    pushed++;
  }
  return pushed;
}

export async function syncGoogleWeek(env: Env, userId: string, weekStart: string): Promise<CalendarSyncResult> {
  if (!googleConfigured(env)) throw new ApiError(503, 'integration_not_configured', 'Máy chủ chưa cấu hình Google Calendar');
  const token = await getAccessToken(env, userId, 'google');
  const weekEnd = addDays(weekStart, 7);
  try {
    const pulledEvents = await listPrimaryEvents(token, weekStart, weekEnd);
    const db = env.DB;
    const keep = new Set(pulledEvents.map((e) => e.googleId));
    const { results: existing } = await db.prepare(
      "SELECT id, google_event_id FROM calendar_events WHERE user_id = ? AND source = 'google' AND starts_at >= ? AND starts_at < ?",
    ).bind(userId, `${weekStart}T00:00`, `${weekEnd}T00:00`).all<{ id: string; google_event_id: string }>();
    const stale = existing.filter((e) => !keep.has(e.google_event_id));
    const stmts = [
      ...pulledEvents.map((e) =>
        db.prepare(
          `INSERT INTO calendar_events (id, user_id, title, category, starts_at, ends_at, source, google_event_id)
           VALUES (?, ?, ?, ?, ?, ?, 'google', ?)
           ON CONFLICT (user_id, google_event_id) WHERE google_event_id IS NOT NULL
           DO UPDATE SET title = excluded.title, starts_at = excluded.starts_at, ends_at = excluded.ends_at`,
        ).bind(crypto.randomUUID(), userId, e.title, e.category, e.startsAt, e.endsAt, e.googleId),
      ),
      ...stale.map((e) => db.prepare('DELETE FROM calendar_events WHERE id = ? AND user_id = ?').bind(e.id, userId)),
    ];
    if (stmts.length) await db.batch(stmts);
    const pushed = await pushApproved(env, userId, token, weekStart, weekEnd);
    const syncedAt = new Date().toISOString();
    await db.prepare("UPDATE integrations SET status = 'connected', last_synced_at = ?, last_error = NULL WHERE user_id = ? AND provider = 'google'").bind(syncedAt, userId).run();
    return { pulled: pulledEvents.length, removed: stale.length, pushed, syncedAt };
  } catch (err) {
    if (err instanceof ApiError && err.code === 'reconnect_required') await markError(env.DB, userId, 'google', err.message);
    throw err;
  }
}
