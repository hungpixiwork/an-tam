// Chạy cảnh báo thị trường cho 1 người: đọc giá + tài sản + luật → đánh giá → chống báo dồn (1 lần/luật/ngày) → ghi ai_alerts + ai_events.

import type { Env } from '../env';
import type { AlertRule } from '../../shared/types/market';
import { evaluateMarketAlerts, type MarketAlert } from '../../shared/engine/marketAlerts';
import { emergencyMonths } from '../../shared/engine/peace';
import { loadUserState } from '../lib/state';
import { vnClock } from './http';
import { loadBreadth, loadHistory, loadQuotes } from './store';

/** Mục tiêu cần ngoại tệ → tỷ giá tăng thì báo. */
const FX_GOAL = /du học|nước ngoài|định cư|du lịch|thạc sĩ|overseas|abroad/i;

export async function loadAlertRules(db: D1Database, userId: string): Promise<AlertRule[]> {
  const { results } = await db
    .prepare('SELECT id, symbol, direction, threshold_pct AS thresholdPct, created_at AS createdAt FROM alert_rules WHERE user_id = ? ORDER BY created_at')
    .bind(userId)
    .all<AlertRule>();
  return results;
}

export async function runMarketAlertsForUser(env: Env, userId: string, now = new Date()): Promise<MarketAlert[]> {
  const db = env.DB;
  const today = vnClock(now).day;
  const state = await loadUserState(db, userId);
  const [allQuotes, breadth, rules, goldHistory] = await Promise.all([loadQuotes(db), loadBreadth(db), loadAlertRules(db, userId), loadHistory(db, 'SJC', 14, today)]);
  // Chỉ xét giá của hôm nay (giá mẫu hoặc giá phiên cũ không được báo lại)
  const prices = allQuotes.filter((q) => q.source !== 'mau' && vnClock(q.asOf).day === today);
  const monthsSafe = emergencyMonths(state);
  const alerts = evaluateMarketAlerts({
    prices,
    breadth: breadth && breadth.day === today && breadth.source !== 'mau' ? breadth : null,
    holdings: state.holdings,
    rules,
    history: { SJC: goldHistory.filter((b) => b.day < today) },
    fxGoals: state.goals.filter((g) => g.kind === 'education' || FX_GOAL.test(g.title)).map((g) => g.title),
    context: { monthsSafe: monthsSafe > 0 ? monthsSafe : undefined },
  });

  const created: MarketAlert[] = [];
  for (const a of alerts) {
    const log = await db.prepare('INSERT OR IGNORE INTO market_alert_log (user_id, rule_key, day) VALUES (?, ?, ?)').bind(userId, a.ruleKey, today).run();
    if (!log.meta.changes) continue; // đã báo luật này hôm nay
    await db.batch([
      // Cảnh báo cùng luật hôm trước còn mở → đóng để mở cái mới (ai_alerts chỉ cho 1 cảnh báo mở / luật)
      db.prepare("UPDATE ai_alerts SET status = 'resolved', resolved_at = ? WHERE user_id = ? AND rule_key = ? AND status = 'open'").bind(now.toISOString(), userId, a.ruleKey),
      db.prepare('INSERT INTO ai_alerts (id, user_id, rule_key, severity, title, body) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), userId, a.ruleKey, a.severity, a.title, a.body),
      db.prepare("INSERT INTO ai_events (id, user_id, type, title, body) VALUES (?, ?, 'alert', ?, ?)").bind(crypto.randomUUID(), userId, a.title, a.body),
    ]);
    created.push(a);
  }
  return created;
}

/** Chạy cho mọi người đang giữ tài sản có mã hoặc có luật tự đặt (gọi sau refreshMarket). */
export async function runMarketAlertsForAll(env: Env, now = new Date()): Promise<number> {
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT user_id FROM holdings WHERE symbol IS NOT NULL OR LOWER(name) LIKE '%vàng%'
     UNION SELECT DISTINCT user_id FROM alert_rules
     UNION SELECT DISTINCT user_id FROM holdings WHERE category IN ('stock', 'fund')`,
  ).all<{ user_id: string }>();
  let n = 0;
  for (const r of results) {
    try {
      n += (await runMarketAlertsForUser(env, r.user_id, now)).length;
    } catch (e) {
      console.warn(`[market] cảnh báo cho ${r.user_id} lỗi: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return n;
}
