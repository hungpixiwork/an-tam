// Tình trạng hệ thống — công khai (mount trước requireAuth). Mount: /api/health

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import type { HealthStatus } from '../../shared/types/api';

/** Phiên bản ứng dụng — dùng chung cho /api/version (chunk-load recovery) và /api/health. */
export const APP_VERSION = '1.0.0';
export const BUILD_TIME = '2026-09-26T00:00:00.000Z';

export const health = new Hono<AppEnv>().get('/', async (c) => {
  let db: HealthStatus['db'] = 'down';
  try {
    const row = await c.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
    if (row?.ok === 1) db = 'up';
  } catch (err) {
    console.error('health: D1 ping failed', err);
  }
  const data: HealthStatus = { ok: db === 'up', db, version: APP_VERSION, time: new Date().toISOString() };
  c.header('Cache-Control', 'no-store');
  if (!data.ok) return c.json({ success: false as const, ...data, error: { code: 'db_down', message: 'Cơ sở dữ liệu không phản hồi' }, data }, 503);
  return c.json({ success: true as const, ...data, data });
});
