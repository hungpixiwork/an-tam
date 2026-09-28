// OAuthProvider (MCP + OAuth 2.1) cho /mcp, /authorize, /token, /register, /.well-known/*.
// resourceMetadata.resource phải là URL tuyệt đối (https, http chỉ cho localhost), nên provider được tạo theo origin
// của request (dev: http://localhost:8806, prod: domain thật) và giữ lại cho các request sau.

import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import type { Env } from '../env';
import { authorizeApp, MCP_SCOPE } from './authorize';
import { mcpApiHandler } from './server';

const providers = new Map<string, OAuthProvider<Env>>();

function providerFor(origin: string): OAuthProvider<Env> {
  let p = providers.get(origin);
  if (!p) {
    if (providers.size > 8) providers.clear();
    p = new OAuthProvider<Env>({
      apiRoute: '/mcp',
      apiHandler: mcpApiHandler,
      defaultHandler: authorizeApp as unknown as ExportedHandler<Env>,
      authorizeEndpoint: '/authorize',
      tokenEndpoint: '/token',
      clientRegistrationEndpoint: '/register',
      scopesSupported: [MCP_SCOPE],
      accessTokenTTL: 3600,
      refreshTokenTTL: 30 * 86_400,
      resourceMetadata: {
        resource: `${origin}/mcp`,
        authorization_servers: [origin],
        scopes_supported: [MCP_SCOPE],
        resource_name: 'An Tâm',
      },
    });
    providers.set(origin, p);
  }
  return p;
}

export function mcpFetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  return providerFor(new URL(request.url).origin).fetch(request, env, ctx);
}
