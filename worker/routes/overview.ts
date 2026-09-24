import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { buildOverview } from '../../shared/engine/overview';
import { notFound, ok } from '../lib/http';
import { loadMe, loadUserState, syncAlerts } from '../lib/state';

const RANGES = new Set([6, 12]);

export const overview = new Hono<AppEnv>().get('/', async (c) => {
  const userId = c.get('userId');
  const range = Number(c.req.query('range') ?? 12);
  const [me, state] = await Promise.all([loadMe(c.env.DB, userId), loadUserState(c.env.DB, userId)]);
  if (!me) throw notFound();
  const openAlerts = await syncAlerts(c.env.DB, userId, state);
  return ok(c, buildOverview(state, me, { range: RANGES.has(range) ? range : 12, openAlerts }));
});
