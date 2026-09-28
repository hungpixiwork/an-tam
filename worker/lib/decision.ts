// Nạp dữ liệu và chạy mô phỏng cú sốc kép cho một lựa chọn cuộc đời.
// Dùng chung cho /api/simulations, Agent (ý định simulate_decision) và MCP.

import type { Sector } from '../../shared/types/domain';
import type { DecisionMode, DecisionShock, DecisionShockParams, DecisionSimulationResult } from '../../shared/types/api/decision';
import { analyzeDecisionSimulation, decisionPreset } from '../../shared/engine/decisionSimulation';
import { ApiError, notFound } from './http';
import { loadUserState } from './state';
import { loadDetail, ownChoice, SELECT, type Row } from '../routes/lifeChoices';
import { loadSignals } from '../routes/signals';

export interface DecisionRequest {
  /** Bỏ trống → lựa chọn đang ghim / mới nhất. */
  choiceId?: string;
  optionId?: string;
  mode: DecisionMode;
  shock: DecisionShock;
  /** Bỏ trống → mẫu của `shock` theo ngành trong hồ sơ. */
  params?: DecisionShockParams;
}

interface IncomeRow { bonus_annual: number | null; esop_annual: number | null; sector: Sector | null }

export async function runDecisionSimulation(db: D1Database, userId: string, req: DecisionRequest): Promise<DecisionSimulationResult> {
  const row = req.choiceId
    ? await ownChoice(db, req.choiceId, userId)
    : await db.prepare(`${SELECT} WHERE user_id = ? AND status = 'active' ORDER BY pinned DESC, created_at DESC LIMIT 1`).bind(userId).first<Row>();
  if (!row) throw notFound('Chưa có lựa chọn cuộc đời để mô phỏng');
  const state = await loadUserState(db, userId);
  if (state.profile.monthlyExpense <= 0) throw new ApiError(422, 'insufficient_data', 'Cần nhập chi tiêu tháng trước khi mô phỏng');
  const [signals, income] = await Promise.all([
    loadSignals(db, userId, state),
    db.prepare('SELECT bonus_annual, esop_annual, sector FROM income_profiles WHERE user_id = ?').bind(userId).first<IncomeRow>(),
  ]);
  const detail = await loadDetail(db, row, userId, { state, signals });
  const option = (req.optionId ? detail.options.find((o) => o.id === req.optionId) : detail.options.find((o) => o.selected)) ?? detail.options[0];
  if (!option) throw new ApiError(422, 'missing_option', 'Lựa chọn chưa có phương án hợp lệ');
  const { evaluation: _e, selected: _s, ...opt } = option;
  const params = req.params ?? decisionPreset(req.shock, income?.sector ?? 'technology');
  return analyzeDecisionSimulation(
    state,
    {
      id: detail.id, title: detail.title, incomeUpliftPct: detail.incomeUpliftPct,
      evaluate: {
        kind: detail.kind, incomeUpliftPct: detail.incomeUpliftPct, signals,
        prereqsDone: detail.prereqs.filter((p) => p.done).length, prereqsTotal: detail.prereqs.length,
      },
    },
    opt,
    { mode: req.mode, shock: req.shock, params },
    { bonusAnnual: income?.bonus_annual ?? 0, esopAnnual: income?.esop_annual ?? 0 },
  );
}
