import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // worker/index.ts export class Workflow (import 'cloudflare:workers') — Node không có module này
  resolve: { alias: { 'cloudflare:workers': fileURLToPath(new URL('./worker/desk/cloudflare-workers.stub.ts', import.meta.url)) } },
  test: {
    // Bỏ qua worktree của subagent (.claude/worktrees) và build output.
    exclude: [...configDefaults.exclude, '.claude/**', 'client/**'],
  },
});
