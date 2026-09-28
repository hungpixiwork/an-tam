// Chỉ dùng trong vitest (Node không có module 'cloudflare:workers') — vitest.config.ts trỏ alias vào đây.
export abstract class WorkflowEntrypoint<E = unknown, _T = unknown> {
  protected env: E;
  constructor(_ctx: unknown, env: E) {
    this.env = env;
  }
}
