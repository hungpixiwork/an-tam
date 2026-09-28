// Bàn đầu tư. Mount: /api/desk

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import type { DeskView } from '../../shared/types/api/desk';
import { PLANS } from '../../shared/plans';
import { ApiError, ok } from '../lib/http';
import { userPlan } from '../lib/usage';
import { vnClock } from '../market/http';
import { DESK_FIXED, getDeskView, isDeskSymbol, runDeskAndWait } from './index';

async function isHeld(db: D1Database, userId: string, symbol: string): Promise<boolean> {
  if (symbol === 'SJC' && (await db.prepare("SELECT 1 FROM holdings WHERE user_id = ? AND (LOWER(name) LIKE '%vàng%')").bind(userId).first())) return true;
  return !!(await db.prepare('SELECT 1 FROM holdings WHERE user_id = ? AND UPPER(symbol) = ?').bind(userId, symbol).first());
}

const symbolParam = (raw: string) => {
  const s = raw.toUpperCase();
  if (!isDeskSymbol(s)) throw new ApiError(400, 'invalid_input', 'Mã không hợp lệ');
  return s;
};

export const desk = new Hono<AppEnv>()
  .get('/:symbol', async (c) => ok<DeskView>(c, await getDeskView(c.env, c.get('userId'), symbolParam(c.req.param('symbol')))))
  .post('/:symbol/run', async (c) => {
    const userId = c.get('userId');
    const symbol = symbolParam(c.req.param('symbol'));
    const { plan } = await userPlan(c.env.DB, userId);
    if (!PLANS[plan].deskAsk) throw new ApiError(403, 'plan_required', 'Bàn phân tích dành cho Gói Plus hoặc Gói Ngân hàng');
    if (!DESK_FIXED.includes(symbol) && !(await isHeld(c.env.DB, userId, symbol))) throw new ApiError(404, 'not_found', 'Bàn chỉ phân tích tài sản bạn đang giữ');
    const report = await runDeskAndWait(c.env, { symbol, day: vnClock().day, userId });
    const view = await getDeskView(c.env, userId, symbol);
    return report ? ok<DeskView>(c, view) : ok<DeskView>(c, { ...view, status: 'running' }, 202);
  });
