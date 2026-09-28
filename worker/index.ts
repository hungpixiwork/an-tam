import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv, Env, JobMessage } from './env';
import { ApiError } from './lib/http';
import { requireAuth } from './middleware/auth';
import { clientIp, rateLimit } from './middleware/rateLimit';
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
import { liabilities } from './routes/liabilities';
import { transactions } from './routes/transactions';
import { earn } from './routes/earn';
import { ledger, payoutAccount } from './routes/ledger';
import { budgets } from './routes/budgets';
import { bills } from './routes/bills';
import { safety } from './routes/safety';
import { skills, humanCapitalRoutes } from './routes/skills';
import { calendar } from './routes/calendar';
import { automationRules } from './routes/automation';
import { lifeChoices } from './routes/lifeChoices';
import { allocation } from './routes/allocation';
import { portfolioRisk } from './routes/portfolioRisk';
import { agent, agents } from './routes/agent';
import { actions } from './routes/actions';
import { decision } from './routes/decision';
import { audit } from './routes/audit';
import { integrations } from './routes/integrations';
import { webhooks } from './routes/webhooks';
import { market } from './routes/market';
import { alertRules } from './routes/alertRules';
import { health, APP_VERSION, BUILD_TIME } from './routes/health';
import { plan } from './routes/plan';
import { signals } from './routes/signals';
import { runMonitor } from './jobs/monitor';
import { consumeJobs } from './jobs/handlers';
import { refreshMarket } from './market/refresh';
import { marketAlertUserIds, runMarketAlertsForAll } from './market/alerts';
import { PAGE } from './jobs/monitor';
import { desk } from './desk/routes';
import { runDailyDesk } from './desk';
import { vnClock } from './market/http';

// Workflow bàn đầu tư (wrangler.jsonc → workflows)
export { DeskWorkflow } from './desk/workflow';
export { UserCoordinatorAgent } from './agents/coordinator';
import { withMcp } from './mcp';

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

// ── Công khai (trước requireAuth) ──
// Chống dò mật khẩu / tạo tài khoản hàng loạt: đếm theo IP
app.use('/api/auth/login', rateLimit('RL_AUTH', clientIp));
app.use('/api/auth/register', rateLimit('RL_AUTH', clientIp));
app.route('/api/auth', auth);
app.route('/api/health', health);
app.route('/api/webhooks', webhooks);
// Chặn mọi truy cập trực tiếp tới Durable Object; chỉ /api/agent/* qua Hono được dùng.
app.all('/agents/*', (c) => c.text('Not Found', 404));

// Phiên bản ứng dụng phục vụ chunk-load recovery
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
// Lượt chạy agent tốn AI: đếm theo người dùng
app.use('/api/agent/runs', rateLimit('RL_AI', (c) => c.get('userId')));
// Lệnh ghi / tính nặng: chặn lạm dụng theo người dùng
app.use('/api/actions/apply', rateLimit('RL_AI', (c) => c.get('userId')));
app.use('/api/simulations/run', rateLimit('RL_AI', (c) => c.get('userId')));
app.use('/api/desk/:symbol/run', rateLimit('RL_AI', (c) => c.get('userId')));
app.route('/api/onboarding', onboarding);
app.route('/api/profile', profile);
app.route('/api/holdings', holdings);
app.route('/api/liabilities', liabilities);
app.route('/api/transactions', transactions);
app.route('/api/earn', earn);
app.route('/api/overview', overview);
app.route('/api/goals', goals);
app.route('/api/simulations', simulations);
app.route('/api/habits', habits);
app.route('/api/portfolio', portfolio);
app.route('/api/portfolio', portfolioRisk); // /risk, /what-if
app.route('/api/plans', plans);
app.route('/api/ai', ai);
app.route('/api/lessons', lessons);
// ── Redesign: mỗi màn một router — wave sau chỉ sửa file route của mình ──
app.route('/api/ledger', ledger);
app.route('/api/settings/payout-account', payoutAccount);
app.route('/api/budgets', budgets);
app.route('/api/bills', bills);
app.route('/api/safety', safety);
app.route('/api/skills', skills);
app.route('/api/human-capital', humanCapitalRoutes);
app.route('/api/calendar', calendar);
app.route('/api/automation-rules', automationRules);
app.route('/api/life-choices', lifeChoices);
app.route('/api/allocation', allocation);
app.route('/api/agents', agents);
app.route('/api/agent', agent);
app.route('/api/actions', actions);
app.route('/api/decision', decision);
app.route('/api/audit', audit);
app.route('/api/market', market);
app.route('/api/alert-rules', alertRules);
app.route('/api/desk', desk);
app.route('/api/integrations', integrations);
app.route('/api/plan', plan);
app.route('/api/signals', signals);
app.route('/api', settings);
app.route('/api', common);

app.notFound((c) => c.json({ success: false, error: { code: 'not_found', message: 'API không tồn tại' } }, 404));

/** Khớp "triggers.crons" trong wrangler.jsonc (worker entry không export hằng số — workerd coi named export là entrypoint). Hằng ngày: "0 1 * * *". */
const CRON_FREQUENT = '5 * * * *';

/** Mỗi giờ: cập nhật giá thị trường một lần; automation / đồng bộ lịch / dọn dữ liệu hết hạn — các wave sau gắn job vào đây. */
async function runFrequent(env: Env): Promise<void> {
  try {
    await refreshMarket(env);
    // Cảnh báo thị trường: chia theo từng người qua Queue (mỗi thông điệp 1 người); không có Queue thì chạy tuần tự.
    if (env.JOBS) {
      const ids = await marketAlertUserIds(env);
      for (let i = 0; i < ids.length; i += PAGE) {
        await env.JOBS.sendBatch(ids.slice(i, i + PAGE).map((userId) => ({ body: { type: 'market.alerts', userId } })));
      }
    } else {
      await runMarketAlertsForAll(env);
    }
  } catch (err) {
    console.error('refreshMarket', err);
  }
  // Bàn đầu tư hằng ngày: lượt chạy lúc 16:05 giờ VN (sau khi đóng cửa 15:15) — mỗi mã 1 lần, dùng chung cho mọi người, kèm rút kinh nghiệm.
  if (vnClock().hour === 16) {
    try {
      await runDailyDesk(env);
    } catch (err) {
      console.error('runDailyDesk', err);
    }
  }
  // TODO(wave 2–3): worker/jobs/{automation,sync,purge}.ts
}

export default {
  // /mcp + OAuth (/authorize, /token, /register, /.well-known/*) → worker/mcp; còn lại → app Hono
  fetch: withMcp(app.fetch),
  scheduled: (controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
    // Cron lạ (vd. wrangler dev --test-scheduled) chạy job hằng ngày như trước
    ctx.waitUntil(controller.cron === CRON_FREQUENT ? runFrequent(env) : runMonitor(env));
  },
  // Consumer Queue an-tam-jobs (wrangler.jsonc → queues.consumers)
  queue: (batch: MessageBatch<JobMessage>, env: Env) => consumeJobs(batch, env),
} satisfies ExportedHandler<Env, JobMessage>;
