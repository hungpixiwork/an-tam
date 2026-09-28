// Chỉ dùng trong vitest (Node không có module 'cloudflare:workers') — vitest.config.ts trỏ alias vào đây.
export abstract class WorkflowEntrypoint<E = unknown, _T = unknown> {
  protected env: E;
  constructor(_ctx: unknown, env: E) {
    this.env = env;
  }
}

// Agents SDK chỉ cần các base class này khi nạp module trong Node test.
export class RpcTarget {}
export class DurableObject<E = unknown> {
  protected ctx: unknown;
  protected env: E;
  constructor(ctx: unknown, env: E) {
    this.ctx = ctx;
    this.env = env;
  }
}
export const exports = {};
