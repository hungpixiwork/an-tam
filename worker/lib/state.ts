// Đọc / ghi dữ liệu người dùng từ D1 và chuyển sang kiểu miền của engine.

import type { Me } from '../../shared/types/api';
import type { FinancialProfile, Goal, Holding, Liability, MonthTotal, Salutation, Snapshot, UserState } from '../../shared/types/domain';
import { evaluateAlerts, type AlertCandidate } from '../../shared/engine/alerts';
import { effectiveProfile, type EffectiveProfile } from '../../shared/engine/ledger';
import { addMonths, currentMonth } from '../../shared/engine/month';
import { PLAN_LABEL, effectivePlan } from '../../shared/plans';

interface UserRow {
  id: string; email: string; full_name: string; salutation: Salutation;
  avatar_seed: number; member_status: string; onboarded_at: string | null;
  life_stage: string | null;
  plan?: string | null; plan_until?: string | null;
}
interface HoldingRow {
  id: string; name: string; category: Holding['category']; value: number; role: string;
  volatility: Holding['volatility']; risk_group: string; is_main: number;
  sector: Holding['sector']; is_employer_stock: number; in_portfolio: number;
}
interface LiabilityRow {
  id: string; name: string; kind: Liability['kind']; balance: number; monthly_payment: number; rate_bp: number;
}
interface GoalRow {
  id: string; kind: Goal['kind']; title: string; target_amount: number; current_amount: number;
  target_month: string; monthly_contribution: number; priority: number;
  icon: string | null; horizon: Goal['horizon'];
}

export const toMe = (u: UserRow): Me => ({
  id: u.id,
  email: u.email,
  fullName: u.full_name,
  salutation: u.salutation,
  avatarSeed: u.avatar_seed,
  // Gói trả phí đang hiệu lực thay nhãn thành viên; gói miễn phí giữ nhãn cũ
  memberStatus: ((p) => (p === 'free' ? u.member_status : PLAN_LABEL[p]))(effectivePlan(u.plan, u.plan_until)),
  onboarded: u.onboarded_at !== null,
  lifeStage: u.life_stage ?? undefined,
});

export const loadMe = async (db: D1Database, userId: string): Promise<Me | null> => {
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRow>();
  return row ? toMe(row) : null;
};

/** State cho engine + số nền người dùng tự nhập và nguồn của thu / chi đang dùng. */
export interface LoadedState extends UserState {
  baseline: FinancialProfile;
  sources: Omit<EffectiveProfile, 'profile'>;
}

export async function loadUserState(db: D1Database, userId: string, today = currentMonth()): Promise<LoadedState> {
  const [user, profile, holdings, goals, snapshots, ledger, liabilities] = await db.batch([
    db.prepare('SELECT salutation FROM users WHERE id = ?').bind(userId),
    db.prepare('SELECT * FROM financial_profiles WHERE user_id = ?').bind(userId),
    db.prepare('SELECT * FROM holdings WHERE user_id = ? ORDER BY order_idx').bind(userId),
    db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY order_idx').bind(userId),
    db.prepare('SELECT month, total, emergency, invested, cashflow, cash, other, debt FROM net_worth_snapshots WHERE user_id = ? ORDER BY month').bind(userId),
    db.prepare(
      `SELECT substr(occurred_on, 1, 7) AS month,
              SUM(CASE WHEN kind = 'income' THEN amount ELSE 0 END) AS income,
              SUM(CASE WHEN kind = 'expense' THEN amount ELSE 0 END) AS expense
       FROM transactions WHERE user_id = ? AND occurred_on >= ? GROUP BY month ORDER BY month`,
    ).bind(userId, `${addMonths(today, -11)}-01`),
    db.prepare('SELECT id, name, kind, balance, monthly_payment, rate_bp FROM liabilities WHERE user_id = ? ORDER BY order_idx, created_at').bind(userId),
  ]);
  const u = (user.results[0] ?? {}) as Record<string, string>;
  const salutation = (u.salutation ?? 'bạn') as Salutation;
  const p = (profile.results[0] ?? {}) as Record<string, number>;
  const baseline: FinancialProfile = {
    monthlyIncome: p.monthly_income ?? 0,
    monthlyExpense: p.monthly_expense ?? 0,
    emergencyTargetMonths: p.emergency_target_months ?? 6,
    riskSelfScore: p.risk_self_score ?? 5,
    birthYear: p.birth_year ?? null,
    retirementAge: p.retirement_age ?? 60,
  };
  const months = ledger.results as unknown as MonthTotal[];
  const { profile: effective, ...sources } = effectiveProfile(baseline, months, today);
  return {
    today,
    salutation,
    profile: effective,
    baseline,
    sources,
    holdings: (holdings.results as unknown as HoldingRow[]).map((h) => ({
      id: h.id, name: h.name, category: h.category, value: h.value, role: h.role,
      volatility: h.volatility, riskGroup: h.risk_group, isMain: h.is_main === 1,
      sector: h.sector ?? 'other', isEmployerStock: h.is_employer_stock === 1, inPortfolio: h.in_portfolio !== 0,
    })),
    goals: (goals.results as unknown as GoalRow[]).map((g) => ({
      id: g.id, kind: g.kind, title: g.title, targetAmount: g.target_amount, currentAmount: g.current_amount,
      targetMonth: g.target_month, monthlyContribution: g.monthly_contribution, priority: g.priority,
      icon: g.icon ?? null, horizon: g.horizon ?? null,
    })),
    snapshots: snapshots.results as unknown as Snapshot[],
    ledger: months,
    liabilities: (liabilities.results as unknown as LiabilityRow[]).map((l) => ({
      id: l.id, name: l.name, kind: l.kind, balance: l.balance, monthlyPayment: l.monthly_payment, rateBp: l.rate_bp,
    })),
  };
}

const SNOOZE_DAYS = 7;

/**
 * Đồng bộ cảnh báo: mở cảnh báo mới cho luật đang vi phạm, đóng cảnh báo của luật không còn vi phạm.
 * Trả về số cảnh báo đang mở.
 */
export async function syncAlerts(db: D1Database, userId: string, state: UserState): Promise<number> {
  const now = new Date();
  const snoozeSince = new Date(now.getTime() - SNOOZE_DAYS * 86_400_000).toISOString();
  const [open, snoozed] = await db.batch<{ rule_key: string }>([
    db.prepare("SELECT rule_key FROM ai_alerts WHERE user_id = ? AND status = 'open'").bind(userId),
    db.prepare("SELECT DISTINCT rule_key FROM ai_alerts WHERE user_id = ? AND status = 'resolved' AND resolved_at > ?").bind(userId, snoozeSince),
  ]);
  const openKeys = new Set(open.results.map((r) => r.rule_key));
  const snoozedKeys = new Set(snoozed.results.map((r) => r.rule_key));
  // Cảnh báo người dùng vừa đánh dấu đã xử lý sẽ không mở lại trong SNOOZE_DAYS ngày
  const candidates: AlertCandidate[] = evaluateAlerts(state).filter((a) => openKeys.has(a.ruleKey) || !snoozedKeys.has(a.ruleKey));
  const activeKeys = new Set(candidates.map((a) => a.ruleKey));

  const statements: D1PreparedStatement[] = [];
  for (const a of candidates) {
    if (openKeys.has(a.ruleKey)) continue;
    statements.push(
      db.prepare('INSERT INTO ai_alerts (id, user_id, rule_key, severity, title, body) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), userId, a.ruleKey, a.severity, a.title, a.body),
      db.prepare("INSERT INTO ai_events (id, user_id, type, title, body) VALUES (?, ?, 'alert', ?, ?)")
        .bind(crypto.randomUUID(), userId, a.title, a.body),
    );
  }
  for (const key of openKeys) {
    if (activeKeys.has(key)) continue;
    statements.push(
      db.prepare("UPDATE ai_alerts SET status = 'resolved', resolved_at = ? WHERE user_id = ? AND rule_key = ? AND status = 'open'")
        .bind(now.toISOString(), userId, key),
    );
  }
  if (statements.length) await db.batch(statements);
  return candidates.length;
}
