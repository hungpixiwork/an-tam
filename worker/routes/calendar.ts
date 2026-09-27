// Lịch AI (Wave 2 · G). Mount: /api/calendar
// Đã có: sự kiện lịch CRUD (nguồn local). Còn lại (tuần, đồng bộ Google, tự xếp lịch) — màn Lịch AI.

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { CalendarEvent } from '../../shared/types/api';
import { vnDate } from '../../shared/engine/month';
import { ApiError, notFound, ok } from '../lib/http';
import { body, dateString } from '../lib/validate';

/** Stub Wave 0 — thay bằng handler thật; giữ nguyên đường dẫn (đã mount trong worker/index.ts). */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

/** Giờ Việt Nam 'YYYY-MM-DDTHH:MM'. */
const localDateTime = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d$/, 'Thời gian không hợp lệ (YYYY-MM-DDTHH:MM)');
const category = z.enum(['finance', 'skill', 'work', 'rest', 'personal']);

const eventSchema = z
  .object({
    title: z.string().trim().min(1, 'Vui lòng nhập tên việc').max(80),
    note: z.string().trim().max(120).default(''),
    category: category.default('personal'),
    startsAt: localDateTime,
    endsAt: localDateTime,
  })
  .refine((e) => e.endsAt > e.startsAt, { message: 'Giờ kết thúc phải sau giờ bắt đầu', path: ['endsAt'] });

const patchSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  note: z.string().trim().max(120).optional(),
  category: category.optional(),
  startsAt: localDateTime.optional(),
  endsAt: localDateTime.optional(),
  done: z.boolean().optional(),
});

interface Row {
  id: string; title: string; note: string; category: CalendarEvent['category'];
  starts_at: string; ends_at: string; source: CalendarEvent['source']; done: number;
}

const toEvent = (r: Row): CalendarEvent => ({
  id: r.id, title: r.title, note: r.note, category: r.category, startsAt: r.starts_at, endsAt: r.ends_at, source: r.source, done: r.done === 1,
});

const SELECT = 'SELECT id, title, note, category, starts_at, ends_at, source, done FROM calendar_events';

/** Sự kiện trong ngày `day` ('YYYY-MM-DD', giờ Việt Nam), theo giờ bắt đầu. */
export async function loadEventsForDay(db: D1Database, userId: string, day: string): Promise<CalendarEvent[]> {
  const { results } = await db.prepare(`${SELECT} WHERE user_id = ? AND starts_at >= ? AND starts_at < ? ORDER BY starts_at`)
    .bind(userId, `${day}T00:00`, `${day}T99`)
    .all<Row>();
  return results.map(toEvent);
}

export const calendar = new Hono<AppEnv>()
  .get('/', todo) // ?week=YYYY-Www
  .get('/events', async (c) => {
    const q = c.req.query('date');
    const day = q && dateString.safeParse(q).success ? q : vnDate();
    return ok(c, await loadEventsForDay(c.env.DB, c.get('userId'), day));
  })
  .post('/events', body(eventSchema), async (c) => {
    const e = c.req.valid('json');
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO calendar_events (id, user_id, title, note, category, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, c.get('userId'), e.title, e.note, e.category, e.startsAt, e.endsAt)
      .run();
    return ok(c, { id }, 201);
  })
  .patch('/events/:id', body(patchSchema), async (c) => {
    const e = c.req.valid('json');
    const cols: Record<string, unknown> = {
      title: e.title, note: e.note, category: e.category, starts_at: e.startsAt, ends_at: e.endsAt,
      done: e.done === undefined ? undefined : e.done ? 1 : 0,
    };
    const entries = Object.entries(cols).filter(([, v]) => v !== undefined);
    if (!entries.length) return ok(c, null);
    const res = await c.env.DB.prepare(`UPDATE calendar_events SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...entries.map(([, v]) => v), c.req.param('id'), c.get('userId'))
      .run()
      .catch(() => {
        throw new ApiError(400, 'invalid_input', 'Giờ kết thúc phải sau giờ bắt đầu');
      });
    if (!res.meta.changes) throw notFound('Không tìm thấy sự kiện');
    return ok(c, null);
  })
  .delete('/events/:id', async (c) => {
    const res = await c.env.DB.prepare('DELETE FROM calendar_events WHERE id = ? AND user_id = ?').bind(c.req.param('id'), c.get('userId')).run();
    if (!res.meta.changes) throw notFound('Không tìm thấy sự kiện');
    return ok(c, null);
  })
  .post('/sync', todo)
  .post('/auto-schedule', todo);
