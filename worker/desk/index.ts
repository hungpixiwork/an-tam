// Bàn đầu tư — điểm vào cho route, agent (ý định ask_desk), MCP (run_desk), cảnh báo thị trường và job hằng ngày.
// Theo mã (dùng chung): runDeskPipeline trong Workflow DESK_WORKFLOW, thiếu binding thì chạy thẳng.
// Theo người (riêng): deskRisk — code tất định. Người dùng là người quyết định cuối cùng.

import type { Env } from '../env';
import type { Holding } from '../../shared/types/domain';
import type { Sector } from '../../shared/types/domain';
import type { DeskReport, DeskRisk, DeskStepLine, DeskView } from '../../shared/types/api/desk';
import { deskRisk } from '../../shared/engine/deskRisk';
import { emergencyMonths } from '../../shared/engine/peace';
import { liquidAssets } from '../../shared/engine/lifeChoice';
import { SECTORS } from '../../shared/engine/concentration';
import { loadUserState } from '../lib/state';
import { vnClock } from '../market/http';
import { symbolKind } from './data';
import { symbolName } from './analysts';
import { latestReport, loadReport, runDeskPipeline, type DeskParams } from './pipeline';

export type { DeskParams } from './pipeline';
export { runDeskPipeline } from './pipeline';

/** Mã luôn được hỏi dù không giữ (tài sản / chỉ số nền). */
export const DESK_FIXED = ['SJC', 'VNINDEX'];
export const deskInstanceId = (symbol: string, day: string) => `desk-${symbol}-${day}`;
export const isDeskSymbol = (s: string) => /^[A-Z0-9]{1,12}$/.test(s);

const TREND_TEXT = { tang: 'nghiêng về tăng', giam: 'nghiêng về giảm', di_ngang: 'đi ngang' } as const;
const RISK_TEXT = { thap: 'thấp', vua: 'vừa', cao: 'cao' } as const;
const STANCE_TEXT = { binh_tinh: 'Giữ bình tĩnh', theo_doi: 'Theo dõi thêm', can_nhac_giam: 'Cân nhắc giảm tỷ trọng' } as const;

// ─── Chạy bàn ───

/** Kích hoạt bàn cho (mã, ngày): có Workflow → tạo instance (id trùng = đang / đã chạy); không có → chạy thẳng. */
export async function triggerDesk(env: Env, p: DeskParams): Promise<'triggered' | 'exists' | 'done'> {
  if (!env.DESK_WORKFLOW) {
    await runDeskPipeline(env, p);
    return 'done';
  }
  if (await loadReport(env.DB, p.symbol, p.day)) return 'exists';
  const id = deskInstanceId(p.symbol, p.day);
  // Instance cùng id đã có: lần trước lỗi / bị dừng → chạy lại (bước đã xong không chạy lại); đang chạy → để yên
  const prev = await env.DESK_WORKFLOW.get(id).catch(() => null);
  if (prev) {
    try {
      const { status } = await prev.status();
      if (status === 'errored' || status === 'terminated') await prev.restart();
    } catch (e) {
      console.warn(`[desk] không chạy lại được ${p.symbol}: ${e instanceof Error ? e.message : String(e)}`);
    }
    return 'exists';
  }
  try {
    await env.DESK_WORKFLOW.create({ id, params: p });
    return 'triggered';
  } catch {
    return 'exists'; // hai request tạo cùng lúc
  }
}

/** Chạy và chờ báo cáo tối đa `waitMs` (Workflow chạy nền). Hết giờ → null, báo cáo sẽ có sau. */
export async function runDeskAndWait(env: Env, p: DeskParams, waitMs = 25_000): Promise<DeskReport | null> {
  const have = await loadReport(env.DB, p.symbol, p.day);
  if (have) return have;
  if (!env.DESK_WORKFLOW) return (await runDeskPipeline(env, p)).report;
  await triggerDesk(env, p);
  const until = Date.now() + waitMs;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 1000));
    const r = await loadReport(env.DB, p.symbol, p.day);
    if (r) return r;
  }
  return null;
}

// ─── Góc nhìn theo từng người ───

const isGoldHolding = (h: Holding) => (h.symbol ? h.symbol.toUpperCase() === 'SJC' : /vàng|gold/i.test(h.name));
const isLiquid = (h: Holding) => h.category === 'cash' || h.inPortfolio === true || (h.inPortfolio === undefined && h.category !== 'other');

/** Khoản của người dùng ứng với mã: VN-Index = toàn bộ cổ phiếu + quỹ; SJC = vàng; còn lại theo mã. */
export function matchHoldings(holdings: Holding[], symbol: string): Holding[] {
  if (symbol === 'VNINDEX') return holdings.filter((h) => h.category === 'stock' || h.category === 'fund');
  if (symbol === 'SJC') return holdings.filter(isGoldHolding);
  return holdings.filter((h) => h.symbol?.toUpperCase() === symbol);
}

export async function userDeskRisk(env: Env, userId: string, report: DeskReport): Promise<DeskRisk> {
  const [state, job] = await Promise.all([
    loadUserState(env.DB, userId),
    env.DB.prepare('SELECT sector FROM income_profiles WHERE user_id = ?').bind(userId).first<{ sector: Sector | null }>(),
  ]);
  const jobSector = job?.sector && (SECTORS as string[]).includes(job.sector) && job.sector !== 'other' ? job.sector : null;
  const mine = matchHoldings(state.holdings, report.symbol);
  const kind = await symbolKind(env.DB, report.symbol);
  const vnDay = vnClock().day;
  return deskRisk({
    symbol: report.symbol,
    name: report.symbol === 'VNINDEX' ? 'Cổ phiếu và quỹ bạn giữ' : symbolName(report.symbol, kind),
    verdict: report.verdict,
    holdingVnd: mine.reduce((s, h) => s + h.value, 0),
    totalAssetsVnd: state.holdings.reduce((s, h) => s + h.value, 0),
    monthlyExpense: state.profile.monthlyExpense,
    liquidVnd: liquidAssets(state),
    holdingIsLiquid: mine.some(isLiquid),
    emergencyMonths: emergencyMonths(state),
    goals: state.goals,
    // Cùng cách tính ngành với concentration.ts: cổ phiếu công ty mình thuộc ngành nghề hiện tại
    sameSectorAsJob: !!jobSector && mine.some((h) => h.isEmployerStock || h.sector === jobSector),
    month: state.today,
    day: vnDay,
  });
}

/** Dòng kiểu agent_steps để ActivityLog hiện lại từng bước của bàn. */
export function deskSteps(report: DeskReport, risk: DeskRisk | null): DeskStepLine[] {
  const lines: DeskStepLine[] = [
    { agent: 'desk', kind: 'plan', title: 'Nhóm phân tích bắt đầu', detail: `${report.symbol} · ${report.day}`, status: 'done' },
  ];
  for (const a of report.analysts) {
    lines.push({ agent: 'desk', kind: 'note', title: `${a.label}: ${a.note}`, detail: a.facts.map((f) => f.text).join(' ') || null, status: a.available ? 'done' : 'skipped' });
  }
  for (const r of report.debate.rounds) {
    const tag = report.debate.rounds.length > 1 ? ` (vòng ${r.round})` : '';
    lines.push({ agent: 'desk', kind: 'note', title: `Phe lạc quan${tag}: ${r.optimist[0]}`, detail: r.optimist.slice(1).join(' ') || null, status: 'done' });
    lines.push({ agent: 'desk', kind: 'note', title: `Phe thận trọng${tag}: ${r.cautious[0]}`, detail: r.cautious.slice(1).join(' ') || null, status: 'done' });
  }
  const v = report.verdict;
  lines.push({
    agent: 'desk', kind: 'note',
    title: `Người tổng hợp: ${TREND_TEXT[v.trend]}, rủi ro ${RISK_TEXT[v.risk]}, độ tin cậy ${Math.round(v.confidence * 100)}%`,
    detail: v.reasons.join(' '), status: 'done',
  });
  if (risk) {
    lines.push({ agent: 'desk', kind: risk.suggestedActions.length ? 'propose' : 'note', title: `Quản lý rủi ro: ${STANCE_TEXT[risk.stance]}`, detail: risk.text, status: 'done' });
  }
  return lines;
}

/** Báo cáo gần nhất của mã + góc nhìn rủi ro của người dùng. Dùng cho GET /api/desk/:symbol, ý định ask_desk, công cụ MCP run_desk. */
export async function getDeskView(env: Env, userId: string, symbol: string): Promise<DeskView> {
  const sym = symbol.toUpperCase();
  const report = await latestReport(env.DB, sym);
  if (!report) return { symbol: sym, report: null, risk: null, steps: [], stale: false, status: 'empty' };
  const risk = await userDeskRisk(env, userId, report);
  return { symbol: sym, report, risk, steps: deskSteps(report, risk), stale: report.day !== vnClock().day, status: 'ready' };
}

// ─── Gắn vào cảnh báo thị trường ───

/** Một câu kết luận của bàn cho câu cảnh báo. Chưa có báo cáo hôm nay → kích hoạt Workflow (không chờ) và trả null. */
export async function deskAlertNote(env: Env, symbol: string, day: string): Promise<string | null> {
  try {
    const sym = symbol.toUpperCase();
    const kind = await symbolKind(env.DB, sym);
    if (!kind || kind === 'fx') return null;
    const r = await loadReport(env.DB, sym, day);
    if (!r) {
      if (env.DESK_WORKFLOW) await triggerDesk(env, { symbol: sym, day });
      return null;
    }
    const reason = r.verdict.reasons[0]?.replace(/[.\s]+$/, '');
    return `Bàn phân tích: ${TREND_TEXT[r.verdict.trend]}, rủi ro ${RISK_TEXT[r.verdict.risk]}${reason ? ` (${reason})` : ''}.`;
  } catch (e) {
    console.warn(`[desk] cảnh báo ${symbol}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

// ─── Hằng ngày sau 15:15 (TODO wiring: gọi từ cron trong worker/index.ts khi merge) ───

/** Mã có người giữ (bỏ tỷ giá). */
export async function heldDeskSymbols(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT UPPER(h.symbol) AS symbol FROM holdings h JOIN market_prices p ON p.symbol = UPPER(h.symbol)
       WHERE h.symbol IS NOT NULL AND h.symbol <> '' AND p.kind <> 'fx' ORDER BY 1`,
    )
    .all<{ symbol: string }>();
  return results.map((r) => r.symbol);
}

export async function runDailyDesk(env: Env, now = new Date(), opts: { force?: boolean } = {}): Promise<{ day: string; symbols: string[]; lessons: number; skipped?: string }> {
  const clock = vnClock(now);
  if (!opts.force && (clock.weekday === 0 || clock.weekday === 6)) return { day: clock.day, symbols: [], lessons: 0, skipped: 'cuối tuần' };
  if (!opts.force && clock.hour * 60 + clock.minute < 15 * 60 + 15) return { day: clock.day, symbols: [], lessons: 0, skipped: 'trước 15:15' };
  const symbols = await heldDeskSymbols(env.DB);
  if (env.DESK_WORKFLOW) {
    const todo: string[] = [];
    for (const s of symbols) if (!(await loadReport(env.DB, s, clock.day))) todo.push(s);
    for (let i = 0; i < todo.length; i += 100) {
      const batch = todo.slice(i, i + 100).map((symbol) => ({ id: deskInstanceId(symbol, clock.day), params: { symbol, day: clock.day } }));
      try {
        await env.DESK_WORKFLOW.createBatch(batch);
      } catch {
        for (const b of batch) await triggerDesk(env, b.params);
      }
    }
  } else {
    for (const symbol of symbols) {
      try {
        await runDeskPipeline(env, { symbol, day: clock.day });
      } catch (e) {
        console.warn(`[desk] ${symbol}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  const lessons = await runDeskLessons(env, clock.day);
  return { day: clock.day, symbols, lessons };
}

// ─── Tự rút kinh nghiệm: so kết luận 5 và 20 phiên trước với giá thật ───

export function judgeOutcome(trend: DeskReport['verdict']['trend'], changePct: number): boolean {
  if (trend === 'tang') return changePct > 1;
  if (trend === 'giam') return changePct < -1;
  return Math.abs(changePct) <= 3;
}

export function lessonSentence(day: string, trend: DeskReport['verdict']['trend'], sessions: number, changePct: number, correct: boolean): string {
  const dd = `${day.slice(8, 10)}/${day.slice(5, 7)}`;
  const move = `${changePct >= 0 ? 'tăng' : 'giảm'} ${Math.abs(changePct).toFixed(1).replace('.', ',')}%`;
  const hint = correct
    ? ''
    : trend === 'giam'
      ? '; lần sau đừng quá bi quan khi chỉ có tín hiệu kỹ thuật yếu'
      : trend === 'tang'
        ? '; lần sau cần coi trọng hơn tin xấu và thị trường chung'
        : '; giá biến động mạnh hơn dự đoán';
  return `Ngày ${dd} bàn kết luận "${TREND_TEXT[trend]}", sau ${sessions} phiên giá ${move}, kết luận ${correct ? 'đúng' : 'chưa đúng'}${hint}.`;
}

/** Ghi outcome_json + lesson cho báo cáo đúng 5 và 20 phiên trước `day`. Trả về số báo cáo được cập nhật. */
export async function runDeskLessons(env: Env, day: string): Promise<number> {
  const db = env.DB;
  const { results: syms } = await db.prepare('SELECT DISTINCT symbol FROM desk_reports WHERE day < ?').bind(day).all<{ symbol: string }>();
  let n = 0;
  for (const { symbol } of syms) {
    const { results: sessions } = await db
      .prepare('SELECT day, close FROM market_history WHERE symbol = ? AND day <= ? ORDER BY day DESC LIMIT 22')
      .bind(symbol, day)
      .all<{ day: string; close: number }>();
    if (sessions.length < 6) continue;
    const latest = sessions[0].close;
    for (const back of [5, 20] as const) {
      const at = sessions[back];
      if (!at) continue;
      const lower = sessions[back + 1]?.day ?? '0000-00-00';
      const { results: reports } = await db
        .prepare('SELECT day, verdict_json, price_at, outcome_json FROM desk_reports WHERE symbol = ? AND day <= ? AND day > ? AND price_at > 0')
        .bind(symbol, at.day, lower)
        .all<{ day: string; verdict_json: string; price_at: number; outcome_json: string | null }>();
      for (const r of reports) {
        const outcome = r.outcome_json ? JSON.parse(r.outcome_json) : {};
        const key = back === 5 ? 'after5' : 'after20';
        if (outcome[key]) continue;
        const trend = (JSON.parse(r.verdict_json) as DeskReport['verdict']).trend;
        const changePct = Math.round((latest / r.price_at - 1) * 1000) / 10;
        const correct = judgeOutcome(trend, changePct);
        outcome[key] = { changePct, correct };
        await db
          .prepare('UPDATE desk_reports SET outcome_json = ?, lesson = ? WHERE symbol = ? AND day = ?')
          .bind(JSON.stringify(outcome), lessonSentence(r.day, trend, back, changePct, correct), symbol, r.day)
          .run();
        n++;
      }
    }
  }
  return n;
}
