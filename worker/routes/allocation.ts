// Chia tiền để dành cho mục tiêu + danh mục đề xuất. Mount: /api/allocation

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import type { AllocationApplyResult, AllocationData } from '../../shared/types/api';
import { allocateSavings, rebalanceSteps, targetPortfolio } from '../../shared/engine/allocation';
import { formatVnd } from '../../shared/format';
import { batchWithAudit, maskSummary } from '../lib/audit';
import { ApiError, ok } from '../lib/http';
import { idempotent } from '../lib/idempotency';
import { afterChange } from '../lib/refresh';
import { loadUserState } from '../lib/state';

export const allocation = new Hono<AppEnv>()
  .get('/', async (c) => {
    const state = await loadUserState(c.env.DB, c.get('userId'));
    const target = targetPortfolio(state);
    return ok<AllocationData>(c, { savingsPlan: allocateSavings(state), targetPortfolio: target, rebalanceSteps: rebalanceSteps(state, target) });
  })
  /** "Áp dụng kế hoạch": đặt số để dành hằng tháng của từng mục tiêu = số đề xuất (một batch + dòng audit). */
  .post('/apply', idempotent(), async (c) => {
    const db = c.env.DB;
    const userId = c.get('userId');
    const before = await loadUserState(db, userId);
    const plan = allocateSavings(before);
    const items = plan.items.filter((i) => i.goalId);
    if (items.length === 0) throw new ApiError(400, 'no_goals', 'Chưa có mục tiêu nào để áp dụng kế hoạch');
    await batchWithAudit(
      db,
      items.map((i) => db.prepare('UPDATE goals SET monthly_contribution = ? WHERE id = ? AND user_id = ?').bind(i.suggested, i.goalId, userId)),
      {
        userId, actor: 'user', action: 'allocation.apply', entityType: 'goal', entityId: null,
        summaryMasked: maskSummary(`Áp dụng kế hoạch chia tiền để dành cho ${items.length} mục tiêu`), dataLabel: 'Mục tiêu & thu chi', status: 'completed', approver: 'user',
      },
      { salt: c.env.AUDIT_HASH_SALT },
    );
    await afterChange(db, userId, {
      title: 'Áp dụng kế hoạch chia tiền để dành',
      detail: `Chia ${formatVnd(plan.allocated)}/tháng cho ${items.length} mục tiêu.`,
      before,
    });
    return ok<AllocationApplyResult>(c, { updated: items.length });
  });
