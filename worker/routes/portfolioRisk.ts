// Rủi ro tập trung B4 (Wave 1 · D). Mount: /api/portfolio — cùng prefix với GET /api/portfolio (plans.ts), không trùng đường dẫn.

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';

/** Stub Wave 0 — thay bằng handler thật; giữ nguyên đường dẫn (đã mount trong worker/index.ts). */
const todo = (): never => {
  throw new ApiError(501, 'not_implemented', 'Tính năng đang được phát triển');
};

export const portfolioRisk = new Hono<AppEnv>()
  .get('/risk', todo) // SectorExposureItem[], concentration, employer stock
  .post('/what-if', todo); // WhatIfInput → WhatIfResult (shared/engine/concentration.ts)
