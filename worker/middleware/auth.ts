import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../env';
import { unauthorized } from '../lib/http';
import { readSession } from '../lib/session';

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const userId = await readSession(c);
  if (!userId) throw unauthorized();
  c.set('userId', userId);
  await next();
});
