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
import { runMonitor } from './jobs/monitor';

const app = new Hono<AppEnv>();

app.onError((err, c) => {
  if (err instanceof ApiError) return c.json({ success: false, error: { code: err.code, message: err.message } }, err.status);
  if (err instanceof HTTPException) return c.json({ success: false, error: { code: 'http_error', message: err.message } }, err.status);
  console.error(err);
  return c.json({ success: false, error: { code: 'internal', message: 'Đã có lỗi xảy ra, vui lòng thử lại' } }, 500);
});

app.route('/api/auth', auth);

// Mọi API còn lại yêu cầu đăng nhập
app.use('/api/*', requireAuth);
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

app.all('/api/*', (c) => c.json({ success: false, error: { code: 'not_found', message: 'API không tồn tại' } }, 404));

export default {
  fetch: app.fetch,
  scheduled: (_controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(runMonitor(env));
  },
} satisfies ExportedHandler<Env>;
