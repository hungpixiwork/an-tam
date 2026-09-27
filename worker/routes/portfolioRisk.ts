// Rủi ro tập trung B4. Mount: /api/portfolio — cùng prefix với GET /api/portfolio (plans.ts), không trùng đường dẫn.

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { portfolioRisk as computeRisk, SECTORS, WHAT_IF_PRESETS, whatIfAllocate } from '../../shared/engine/concentration';
import type { Sector } from '../../shared/types/domain';
import type { WhatIfPresetKey } from '../../shared/types/api';
import { ok } from '../lib/http';
import { loadUserState } from '../lib/state';
import { body, money } from '../lib/validate';

const PRESETS = Object.keys(WHAT_IF_PRESETS) as [WhatIfPresetKey, ...WhatIfPresetKey[]];

const whatIfSchema = z.object({
  preset: z.enum(PRESETS),
  amount: money.refine((v) => v > 0, 'Vui lòng nhập số tiền lớn hơn 0'),
  holdingMonths: z.number().int().min(1).max(600),
  fundedFrom: z.enum(['cash', 'new_money']).optional(),
});

/** Ngữ cảnh nghề nghiệp: ngành trong hồ sơ thu nhập + thu nhập năm (thu nhập thực tế nếu có sổ thu chi). */
async function loadCareer(db: D1Database, userId: string) {
  const [state, row] = await Promise.all([
    loadUserState(db, userId),
    db.prepare('SELECT sector FROM income_profiles WHERE user_id = ?').bind(userId).first<{ sector: Sector | null }>(),
  ]);
  const sector = row?.sector && (SECTORS as string[]).includes(row.sector) ? row.sector : null;
  return { state, career: { occupationSector: sector, annualIncome: Math.max(0, state.profile.monthlyIncome) * 12 } };
}

export const portfolioRisk = new Hono<AppEnv>()
  .get('/risk', async (c) => {
    const { state, career } = await loadCareer(c.env.DB, c.get('userId'));
    return ok(c, computeRisk(state, career));
  })
  .post('/what-if', body(whatIfSchema), async (c) => {
    const input = c.req.valid('json');
    const { state, career } = await loadCareer(c.env.DB, c.get('userId'));
    const p = WHAT_IF_PRESETS[input.preset];
    return ok(
      c,
      whatIfAllocate(state, {
        assetType: p.assetType,
        sector: p.sector,
        diversified: p.diversified,
        amount: input.amount,
        holdingMonths: input.holdingMonths,
        fundedFrom: input.fundedFrom,
        occupationSector: career.occupationSector ?? undefined,
        annualIncome: career.annualIncome,
      }),
    );
  });
