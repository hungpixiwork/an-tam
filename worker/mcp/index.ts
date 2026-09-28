// Bọc fetch của worker: /mcp, /authorize, /token, /register, /.well-known/* → OAuthProvider (worker/mcp/provider.ts),
// mọi đường dẫn khác → app Hono như cũ (không đổi hành vi).
// provider.ts được import động: workers-oauth-provider dùng 'cloudflare:workers', test Node import worker/index.ts vẫn chạy.

import type { Env } from '../env';

const OAUTH_PATHS = new Set(['/mcp', '/authorize', '/token', '/register']);
export const isMcpPath = (pathname: string) => OAUTH_PATHS.has(pathname) || pathname.startsWith('/.well-known/');

type Fetch = (request: Request, env: Env, ctx?: ExecutionContext) => Response | Promise<Response>;

export function withMcp(appFetch: Fetch): Fetch {
  return async (request, env, ctx) => {
    if (!isMcpPath(new URL(request.url).pathname)) return appFetch(request, env, ctx);
    if (!env.OAUTH_KV) return new Response('MCP chưa được cấu hình (thiếu OAUTH_KV)', { status: 503 });
    const { mcpFetch } = await import('./provider');
    return mcpFetch(request, env, ctx as ExecutionContext);
  };
}
