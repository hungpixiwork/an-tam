import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Bỏ qua worktree của subagent (.claude/worktrees) và build output.
    exclude: [...configDefaults.exclude, '.claude/**', 'client/**'],
  },
});
