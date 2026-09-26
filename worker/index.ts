import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv, Env } from './env';
import { ApiError } from './lib/http';
import { requireAuth } from './middleware/auth';
import { auth } from './routes/auth';
import { common } from './routes/common';
import { overview } from './routes/overview';
import { goals } from './routes/goals';
import { simulations } from './routes/simulations';
import { habits } from './routes/habits';
import { plans, portfolio } from './routes/plans';
import { ai } from './routes/ai';
import { lessons } from './routes/lessons';
import { settings } from './routes/settings';
import { onboarding } from './routes/onboarding';
import { profile } from './routes/profile';
import { holdings } from './routes/holdings';
import { transactions } from './routes/transactions';
import { earn } from './routes/earn';
import { runMonitor } from './jobs/monitor';

const app = new Hono<AppEnv>();

app.onError((err, c) => {
  if (err instanceof ApiError) return c.json({ success: false, error: { code: err.code, message: err.message } }, err.status);
  if (err instanceof HTTPException) return c.json({ success: false, error: { code: 'http_error', message: err.message } }, err.status);
  console.error(err);
  return c.json({ success: false, error: { code: 'internal', message: 'Đã có lỗi xảy ra, vui lòng thử lại' } }, 500);
});

// Chặn triệt để mọi request /assets/* không tồn tại trả về 404 text/plain, tuyệt đối không fallback về index.html
app.all('/assets/*', async (c) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    return c.text('Method Not Allowed', 405, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
  }

  if (!c.env.ASSETS) {
    return c.text('Not Found', 404, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
  }

  const res = await c.env.ASSETS.fetch(c.req.raw);
  const contentType = res.headers.get('content-type') || '';

  // Khi asset không tồn tại: hoặc asset binding trả về 404, hoặc bị SPA fallback ngầm trả về 200 text/html
  if (res.status === 404 || contentType.includes('text/html')) {
    return c.text('Not Found', 404, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
  }

  return res;
});

app.route('/api/auth', auth);

// Phiên bản ứng dụng phục vụ chunk-load recovery
const APP_VERSION = '1.0.0';
const BUILD_TIME = '2026-09-26T00:00:00.000Z';
app.get('/api/version', (c) =>
  c.json({
    success: true,
    version: APP_VERSION,
    buildTime: BUILD_TIME,
    data: { version: APP_VERSION, buildTime: BUILD_TIME },
  }),
);

// Mọi API còn lại yêu cầu đăng nhập
app.use('/api/*', requireAuth);
app.route('/api/onboarding', onboarding);
app.route('/api/profile', profile);
app.route('/api/holdings', holdings);
app.route('/api/transactions', transactions);
app.route('/api/earn', earn);
app.route('/api/overview', overview);
app.route('/api/goals', goals);
app.route('/api/simulations', simulations);
app.route('/api/habits', habits);
app.route('/api/portfolio', portfolio);
app.route('/api/plans', plans);
app.route('/api/ai', ai);
app.route('/api/lessons', lessons);
app.route('/api', settings);
app.route('/api', common);

app.notFound((c) => c.json({ success: false, error: { code: 'not_found', message: 'API không tồn tại' } }, 404));

export default {
  fetch: app.fetch,
  scheduled: (_controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(runMonitor(env));
  },
} satisfies ExportedHandler<Env>;
