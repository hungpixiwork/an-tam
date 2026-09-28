// Gọi lại đúng các route đọc có sẵn (cùng loader, cùng engine, cùng zod) cho công cụ MCP — không tính lại.
// App này chỉ gọi nội bộ từ worker/mcp/tools.ts, không mount ra ngoài; userId lấy từ grant OAuth đã xác thực.

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv, Env } from '../env';
import { ApiError } from '../lib/http';
import { overview } from '../routes/overview';
import { signals } from '../routes/signals';
import { ledger } from '../routes/ledger';
import { goals } from '../routes/goals';
import { calendar } from '../routes/calendar';
import { market } from '../routes/market';
import { lifeChoices } from '../routes/lifeChoices';
import { portfolioRisk } from '../routes/portfolioRisk';
import { agent } from '../routes/agent';
import { desk } from '../desk/routes';

const USER_HEADER = 'x-antam-mcp-user';

const inner = new Hono<AppEnv>();
inner.onError((err, c) => {
  if (err instanceof ApiError) return c.json({ success: false, error: { code: err.code, message: err.message } }, err.status);
  if (err instanceof HTTPException) return c.json({ success: false, error: { code: 'http_error', message: err.message } }, err.status);
  console.error('mcp inner', err);
  return c.json({ success: false, error: { code: 'internal', message: 'Đã có lỗi xảy ra' } }, 500);
});
inner.use('*', async (c, next) => {
  const userId = c.req.header(USER_HEADER);
  if (!userId) return c.json({ success: false, error: { code: 'unauthorized', message: 'unauthorized' } }, 401);
  c.set('userId', userId);
  await next();
});
inner.route('/overview', overview);
inner.route('/signals', signals);
inner.route('/ledger', ledger);
inner.route('/goals', goals);
inner.route('/calendar', calendar);
inner.route('/market', market);
inner.route('/life-choices', lifeChoices);
inner.route('/portfolio', portfolioRisk);
inner.route('/agent', agent);
inner.route('/desk', desk);

export class RouteError extends Error {}

/** Gọi route nội bộ; lỗi của route (400/404…) → RouteError với câu thông báo của route. */
export async function callRoute<T = unknown>(env: Env, userId: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { [USER_HEADER]: userId };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await inner.request(path, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body) }, env);
  const json = (await res.json()) as { success: boolean; data?: T; error?: { message: string } };
  if (!res.ok || !json.success) throw new RouteError(json.error?.message ?? `HTTP ${res.status}`);
  return json.data as T;
}
