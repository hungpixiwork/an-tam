// Đọc / ghi dữ liệu người dùng từ D1 và chuyển sang kiểu miền của engine.

import type { Me } from '../../shared/types/api';
import type { Goal, Holding, Salutation, Snapshot, UserState } from '../../shared/types/domain';
import { DEMO_EVENTS, DEMO_GOALS, DEMO_HABIT_ANSWERS, DEMO_HOLDINGS, DEMO_PROFILE, demoGoalMonth, demoSnapshots } from '../../shared/demo';
import { evaluateAlerts, type AlertCandidate } from '../../shared/engine/alerts';
import { currentMonth } from '../../shared/engine/month';

interface UserRow {
  id: string; email: string; full_name: string; salutation: Salutation;
  avatar_seed: number; member_status: string; is_demo_data: number;
}
interface HoldingRow {
  id: string; name: string; category: Holding['category']; value: number; role: string;
  volatility: Holding['volatility']; risk_group: string; is_main: number;
}
interface GoalRow {
  id: string; kind: Goal['kind']; title: string; target_amount: number; current_amount: number;
  target_month: string; monthly_contribution: number; priority: number;
}

export const toMe = (u: UserRow): Me => ({
  id: u.id,
  email: u.email,
  fullName: u.full_name,
  salutation: u.salutation,
  avatarSeed: u.avatar_seed,
  memberStatus: u.member_status,
  isDemoData: u.is_demo_data === 1,
});

export const loadMe = async (db: D1Database, userId: string): Promise<Me | null> => {
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRow>();
  return row ? toMe(row) : null;
};

export async function loadUserState(db: D1Database, userId: string, today = currentMonth()): Promise<UserState> {
  const [profile, holdings, goals, snapshots] = await db.batch([
    db.prepare('SELECT * FROM financial_profiles WHERE user_id = ?').bind(userId),
    db.prepare('SELECT * FROM holdings WHERE user_id = ? ORDER BY order_idx').bind(userId),
    db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY order_idx').bind(userId),
    db.prepare('SELECT month, total, emergency, invested, cashflow FROM net_worth_snapshots WHERE user_id = ? ORDER BY month').bind(userId),
  ]);
  const p = (profile.results[0] ?? {}) as Record<string, number>;
  return {
    today,
    profile: {
      monthlyIncome: p.monthly_income ?? 0,
      monthlyExpense: p.monthly_expense ?? 0,
      emergencyTargetMonths: p.emergency_target_months ?? 6,
      riskSelfScore: p.risk_self_score ?? 5,
    },
    holdings: (holdings.results as unknown as HoldingRow[]).map((h) => ({
      id: h.id, name: h.name, category: h.category, value: h.value, role: h.role,
      volatility: h.volatility, riskGroup: h.risk_group, isMain: h.is_main === 1,
    })),
    goals: (goals.results as unknown as GoalRow[]).map((g) => ({
      id: g.id, kind: g.kind, title: g.title, targetAmount: g.target_amount, currentAmount: g.current_amount,
      targetMonth: g.target_month, monthlyContribution: g.monthly_contribution, priority: g.priority,
    })),
    snapshots: snapshots.results as unknown as Snapshot[],
  };
}

/** Nạp bộ dữ liệu tài chính demo cho người dùng mới. */
export function demoDataStatements(db: D1Database, userId: string, today = currentMonth()): D1PreparedStatement[] {
  const id = () => crypto.randomUUID();
  return [
    db.prepare('INSERT INTO financial_profiles (user_id, monthly_income, monthly_expense, emergency_target_months, risk_self_score) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, DEMO_PROFILE.monthlyIncome, DEMO_PROFILE.monthlyExpense, DEMO_PROFILE.emergencyTargetMonths, DEMO_PROFILE.riskSelfScore),
    ...DEMO_HOLDINGS.map((h, i) =>
      db.prepare('INSERT INTO holdings (id, user_id, name, category, value, role, volatility, risk_group, is_main, order_idx) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id(), userId, h.name, h.category, h.value, h.role, h.volatility, h.riskGroup, h.isMain ? 1 : 0, i),
    ),
    ...DEMO_GOALS.map((g, i) =>
      db.prepare('INSERT INTO goals (id, user_id, kind, title, target_amount, current_amount, target_month, monthly_contribution, priority, order_idx) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id(), userId, g.kind, g.title, g.targetAmount, g.currentAmount, demoGoalMonth(today, g), g.monthlyContribution, g.priority, i),
    ),
    // Chỉ chèn nếu câu hỏi đã được seed (tránh lỗi khóa ngoại)
    ...Object.entries(DEMO_HABIT_ANSWERS).map(([scenarioId, choice]) =>
      db.prepare('INSERT INTO habit_answers (user_id, scenario_id, choice) SELECT ?, id, ? FROM habit_scenarios WHERE id = ?').bind(userId, choice, scenarioId),
    ),
    ...DEMO_EVENTS.map((e) =>
      db.prepare('INSERT INTO ai_events (id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id(), userId, e.type, e.title, e.body, new Date(Date.now() - e.hoursAgo * 3_600_000).toISOString()),
    ),
    ...demoSnapshots(today).map((s) =>
      db.prepare('INSERT INTO net_worth_snapshots (user_id, month, total, emergency, invested, cashflow) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(userId, s.month, s.total, s.emergency, s.invested, s.cashflow),
    ),
  ];
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
