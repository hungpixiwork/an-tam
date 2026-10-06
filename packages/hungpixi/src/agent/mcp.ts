import { AnTamClient } from '../client/client';
import { handleOpenAICall } from './openai';

export interface McpToolDeclaration {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const MCP_TOOLS: McpToolDeclaration[] = [
  {
    name: 'get_overview',
    description: "Get the user's financial overview: Peace Score (0-100), safe months runway, 6-month cashflow, and alerts.",
    inputSchema: {
      type: 'object',
      properties: {
        rangeMonths: { type: 'number', enum: [6, 12], description: 'Net-worth chart range in months. Default 12.' },
      },
    },
  },
  {
    name: 'get_ledger',
    description: 'Get income/expense totals, budget progress, category breakdown and recent transactions for a month (YYYY-MM).',
    inputSchema: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Month in format YYYY-MM. Default: current month.' },
      },
    },
  },
  {
    name: 'propose_action',
    description: 'Propose an action for human approval (budget set, calendar reminder, savings goal).',
    inputSchema: {
      type: 'object',
      required: ['type', 'payload'],
      properties: {
        type: {
          type: 'string',
          enum: [
            'calendar.create_events',
            'budget.set',
            'goal.update_progress',
            'reminder.create',
            'sheets.update_budget',
            'notion.weekly_report',
            'gmail.send',
          ],
        },
        payload: { type: 'object' },
        note: { type: 'string' },
      },
    },
  },
  {
    name: 'run_desk',
    description: 'Run today multi-analyst desk synthesis for an asset (e.g. FPT, SJC, VNINDEX).',
    inputSchema: {
      type: 'object',
      required: ['symbol'],
      properties: {
        symbol: { type: 'string', description: 'Symbol to analyze.' },
      },
    },
  },
];

/**
 * Chạy một MCP Server qua standard I/O (Stdio) cho Claude Desktop / Cursor
 */
export async function startMcpStdioServer(client: AnTamClient) {
  process.stdin.setEncoding('utf-8');

  let buffer = '';
  process.stdin.on('data', async (chunk: any) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const req = JSON.parse(line);
        const res = await handleMcpRequest(client, req);
        if (res) {
          process.stdout.write(JSON.stringify(res) + '\n');
        }
      } catch (err: any) {
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32603, message: err.message || 'Internal error' },
          }) + '\n',
        );
      }
    }
  });
}

async function handleMcpRequest(client: AnTamClient, req: any) {
  const { id, method, params } = req;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'antam-ai', version: '1.0.0' },
      },
    };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: MCP_TOOLS },
    };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    const mappedName = name.startsWith('an_tam_') ? name : `an_tam_${name}`;
    const data = await handleOpenAICall(client, mappedName, args || {});
    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      },
    };
  }

  return null;
}
