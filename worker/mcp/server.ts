// MCP server (Streamable HTTP, SDK v2 stateless): mỗi request một McpServer, đăng ký TOOLS với props của grant OAuth.

import { McpServer } from '@modelcontextprotocol/server';
import { createMcpHandler } from 'agents/mcp/server';
import type { Env } from '../env';
import { TOOLS, ToolError, runTool, type McpProps } from './tools';

export function buildMcpServer(env: Env, props: McpProps): McpServer {
  const server = new McpServer(
    { name: 'an-tam', version: '1.0.0' },
    {
      instructions:
        "An Tâm is the user's personal finance app (Vietnam). Read tools return plain JSON; money is integer VND. " +
        'The only write is propose_action, which creates a pending item the user must approve in the app. Never claim an action was executed.',
    },
  );
  for (const t of TOOLS) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: t.input, annotations: { readOnlyHint: t.name !== 'propose_action', openWorldHint: false } },
      async (args: unknown) => {
        try {
          const data = await runTool(env, props, t.name, args);
          return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
        } catch (err) {
          return { content: [{ type: 'text' as const, text: err instanceof ToolError ? err.message : 'Internal error' }], isError: true };
        }
      },
    );
  }
  return server;
}

/** apiHandler của OAuthProvider: chỉ tới đây khi token hợp lệ; ctx.props = McpProps từ grant. */
export const mcpApiHandler = {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const props = (ctx as ExecutionContext & { props?: McpProps }).props;
    if (!props?.userId) return Promise.resolve(new Response('Unauthorized', { status: 401 }));
    return createMcpHandler(() => buildMcpServer(env, props), { route: '/mcp' })(request, env, ctx);
  },
};
