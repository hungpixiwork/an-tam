// Nạp dữ liệu và chạy mô phỏng cú sốc kép cho một lựa chọn cuộc đời.
// Dùng chung cho /api/simulations (preview / run / context), Agent (ý định simulate_decision) và MCP.

import type { Sector, UserState } from '../../shared/types/domain';
import type { DecisionMode, DecisionShock, DecisionShockParams, DecisionSimulationResult } from '../../shared/types/api/decision';
import type { LifeChoiceOption } from '../../shared/types/api';
import {
  analyzeDecisionSimulation, decisionPreset, type DecisionChoiceContext, type DecisionIncomeExtras,
} from '../../shared/engine/decisionSimulation';
import { addMonths } from '../../shared/engine/month';
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

/** Mọi thứ engine cần — gửi nguyên cho trình duyệt để kéo thanh trượt không phải gọi server. */
export interface DecisionContext {
  state: UserState;
  choice: DecisionChoiceContext;
  option: Omit<LifeChoiceOption, 'selected'>;
  extras: DecisionIncomeExtras;
  sector: Sector;
  /** Các lựa chọn khác (cho nút "Thay đổi lựa chọn"). */
  choices: { id: string; title: string }[];
}

interface IncomeRow { bonus_annual: number | null; esop_annual: number | null; sector: Sector | null; target_income: number | null; target_months: number | null }

export async function loadDecisionContext(db: D1Database, userId: string, req: { choiceId?: string; optionId?: string }): Promise<DecisionContext> {
  const row = req.choiceId
    ? await ownChoice(db, req.choiceId, userId)
    : await db.prepare(`${SELECT} WHERE user_id = ? AND status = 'active' ORDER BY pinned DESC, created_at DESC LIMIT 1`).bind(userId).first<Row>();
  if (!row) throw notFound('Chưa có lựa chọn cuộc đời để mô phỏng');
  const loaded = await loadUserState(db, userId, undefined, { snapshots: false });
  if (loaded.profile.monthlyExpense <= 0) throw new ApiError(422, 'insufficient_data', 'Cần nhập chi tiêu tháng trước khi mô phỏng');
  const [signals, [income, budget, list]] = await Promise.all([
    loadSignals(db, userId, loaded),
    db.batch([
      db.prepare('SELECT bonus_annual, esop_annual, sector, target_income, target_months FROM income_profiles WHERE user_id = ?').bind(userId),
      db.prepare("SELECT limit_amount FROM budgets WHERE user_id = ? AND category = 'all' AND month = ?").bind(userId, addMonths(loaded.today, 1)),
      db.prepare("SELECT id, title FROM life_choices WHERE user_id = ? AND status = 'active' ORDER BY pinned DESC, created_at DESC").bind(userId),
    ]),
  ]);
  const detail = await loadDetail(db, row, userId, { state: loaded, signals });
  const found = (req.optionId ? detail.options.find((o) => o.id === req.optionId) : detail.options.find((o) => o.selected)) ?? detail.options[0];
  if (!found) throw new ApiError(422, 'missing_option', 'Lựa chọn chưa có phương án hợp lệ');
  const { evaluation: _e, selected: _s, ...option } = found;
  const inc = income.results[0] as IncomeRow | undefined;
  const { baseline: _b, sources: _src, ...state } = loaded;
  return {
    state,
    option,
    choice: {
      id: detail.id, title: detail.title, incomeUpliftPct: detail.incomeUpliftPct,
      evaluate: {
        kind: detail.kind, incomeUpliftPct: detail.incomeUpliftPct, signals,
        prereqsDone: detail.prereqs.filter((p) => p.done).length, prereqsTotal: detail.prereqs.length,
      },
    },
    extras: {
      bonusAnnual: inc?.bonus_annual ?? 0, esopAnnual: inc?.esop_annual ?? 0,
      targetIncome: inc?.target_income ?? 0, targetMonths: inc?.target_months ?? 12,
      budgetLimit: (budget.results[0] as { limit_amount?: number } | undefined)?.limit_amount ?? null,
    },
    sector: inc?.sector ?? 'technology',
    choices: list.results as { id: string; title: string }[],
  };
}

export async function runDecisionSimulation(db: D1Database, userId: string, req: DecisionRequest): Promise<DecisionSimulationResult> {
  const ctx = await loadDecisionContext(db, userId, req);
  const params = req.params ?? decisionPreset(req.shock, ctx.sector);
  return analyzeDecisionSimulation(ctx.state, ctx.choice, ctx.option, { mode: req.mode, shock: req.shock, params }, ctx.extras);
}
