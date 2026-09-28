// /authorize của OAuth MCP: dùng lại phiên đăng nhập của app (cookie at_session), trang đồng ý render phía server.
// Chống giả mạo form / đóng khung: beginConsent/approveConsent/denyConsent của workers-oauth-provider
// (handle dùng 1 lần, gắn với trình duyệt bằng cookie __Host-, 10 phút). Mọi chữ lấy từ client đều được escape.

import { Hono, type Context } from 'hono';
import { AuthorizationError, CimdFetchError, type AuthRequest, type ClientInfo, type OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import type { AppEnv } from '../env';
import { readSession } from '../lib/session';
import { userPlan } from '../lib/usage';
import { PLANS } from '../../shared/plans';
import type { McpProps } from './tools';

export const MCP_SCOPE = 'antam';

const esc = (v: string) => v.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
const oauth = (c: Context<AppEnv>) => (c.env as unknown as { OAUTH_PROVIDER: OAuthHelpers }).OAUTH_PROVIDER;
const clientLabel = (client: ClientInfo | null, req: AuthRequest) => (client?.clientName ?? client?.clientId ?? req.clientId).slice(0, 80);

const CSP = "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'";

function page(title: string, body: string, headers = new Headers(), status = 200): Response {
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Content-Security-Policy', CSP);
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Cache-Control', 'no-store');
  return new Response(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font-family:system-ui,sans-serif;background:#f6f7f9;color:#1f2937;margin:0;padding:16px}main{max-width:440px;margin:48px auto;background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 3px #0001}
h1{font-size:20px;margin:0 0 12px}p{line-height:1.5;margin:8px 0}.muted{color:#6b7280;font-size:14px}.warn{background:#fff7ed;color:#9a3412;padding:8px 12px;border-radius:8px;font-size:14px}
.row{display:flex;gap:12px;margin-top:20px}button,a.btn{flex:1;padding:10px 14px;border-radius:10px;border:1px solid #d1d5db;background:#fff;font-size:15px;cursor:pointer;text-align:center;text-decoration:none;color:inherit}
.primary{background:#0f766e!important;color:#fff!important;border-color:#0f766e!important}</style></head><body><main>${body}</main></body></html>`,
    { status, headers },
  );
}

function errorResponse(err: unknown): Response {
  if (err instanceof AuthorizationError && err.redirectUri) {
    const u = new URL(err.redirectUri);
    u.searchParams.set('error', err.code);
    u.searchParams.set('error_description', err.description);
    if (err.state) u.searchParams.set('state', err.state);
    if (err.issuer) u.searchParams.set('iss', err.issuer);
    return Response.redirect(u.href, 302);
  }
  if (err instanceof AuthorizationError || err instanceof CimdFetchError) {
    const msg = err instanceof AuthorizationError ? err.description : 'Không xác minh được ứng dụng này.';
    return page('Không thể kết nối', `<h1>Không thể kết nối</h1><p>${esc(msg)}</p><p class="muted">Hãy quay lại ứng dụng và thử kết nối lại.</p>`, undefined, 400);
  }
  throw err;
}

export const authorizeApp = new Hono<AppEnv>()
  .get('/authorize', async (c) => {
    try {
      const req = await oauth(c).parseAuthRequest(c.req.raw);
      const client = await oauth(c).lookupClient(req.clientId);
      const name = clientLabel(client, req);
      const userId = await readSession(c);
      if (!userId) {
        // Chưa đăng nhập: mở trang đăng nhập của app, đăng nhập xong quay lại trang này bấm "Tiếp tục".
        const back = new URL(c.req.url);
        const self = `${back.pathname}${back.search}`;
        return page(
          'Đăng nhập An Tâm',
          `<h1>Đăng nhập An Tâm để kết nối</h1><p><strong>${esc(name)}</strong> muốn kết nối với tài khoản An Tâm của bạn.</p>
<p class="muted">Bạn chưa đăng nhập. Hãy đăng nhập (mở ở thẻ mới), rồi quay lại đây và bấm “Tiếp tục”.</p>
<div class="row"><a class="btn primary" href="/dang-nhap?next=${encodeURIComponent(self)}" target="_blank" rel="noopener">Đăng nhập</a><a class="btn" href="${esc(self)}">Tiếp tục</a></div>`,
        );
      }
      const { plan } = await userPlan(c.env.DB, userId);
      const redirectHost = new URL(req.redirectUri).hostname;
      const local = /^(localhost|127(\.\d{1,3}){3}|\[::1\])$/.test(redirectHost);
      const consent = await oauth(c).beginConsent(req);
      return page(
        'Cho phép kết nối',
        `<h1>Cho phép ${esc(name)} đọc dữ liệu An Tâm và đề xuất việc cần bạn duyệt?</h1>
<p>${esc(name)} sẽ xem được tổng quan tài chính, thu chi, mục tiêu, lịch và dữ liệu thị trường của bạn. Ứng dụng chỉ <strong>đề xuất</strong> việc; mọi thay đổi chỉ xảy ra khi bạn duyệt trong An Tâm.</p>
<p class="muted">Quyền truy cập sẽ gửi tới <strong>${esc(redirectHost)}</strong>. ${client?.clientId.startsWith('https://') ? `Ứng dụng từ ${esc(new URL(client.clientId).hostname)}.` : 'Tên ứng dụng do ứng dụng tự khai báo.'}</p>
${local ? '<p class="warn">Quyền truy cập sẽ gửi tới một ứng dụng trên máy tính này. Chỉ đồng ý nếu bạn vừa bắt đầu kết nối từ đó.</p>' : ''}
${PLANS[plan].mcp ? '' : '<p class="warn">Gói hiện tại chưa dùng được MCP. Cần nâng lên Gói Plus để ứng dụng đọc được dữ liệu.</p>'}
<form method="post" action="/authorize"><input type="hidden" name="handle" value="${esc(consent.handle)}">
<div class="row"><button name="decision" value="deny">Từ chối</button><button class="primary" name="decision" value="approve">Đồng ý</button></div></form>`,
        consent.headers,
      );
    } catch (err) {
      return errorResponse(err);
    }
  })
  .post('/authorize', async (c) => {
    try {
      const userId = await readSession(c);
      if (!userId) return page('Phiên đăng nhập hết hạn', '<h1>Phiên đăng nhập đã hết hạn</h1><p>Hãy đăng nhập lại An Tâm rồi kết nối lại từ ứng dụng.</p>', undefined, 401);
      const form = await c.req.formData();
      const handle = String(form.get('handle') ?? '');
      if (form.get('decision') !== 'approve') {
        const denied = await oauth(c).denyConsent(c.req.raw, handle);
        return new Response(null, { status: 302, headers: denied.headers });
      }
      const approved = await oauth(c).approveConsent(c.req.raw, handle);
      const client = await oauth(c).lookupClient(approved.request.clientId);
      const props: McpProps = { userId, clientName: clientLabel(client, approved.request) };
      const { redirectTo } = await oauth(c).completeAuthorization({
        request: approved.request,
        userId,
        metadata: { clientName: props.clientName },
        scope: [MCP_SCOPE],
        props,
      });
      approved.headers.set('Location', redirectTo);
      return new Response(null, { status: 302, headers: approved.headers });
    } catch (err) {
      return errorResponse(err);
    }
  })
  .all('*', (c) => c.text('Not Found', 404));
