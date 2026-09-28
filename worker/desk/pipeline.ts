// Quy trình bàn đầu tư theo MÃ (dùng chung cho mọi người dùng, 1 lần / mã / ngày):
//   1. nhóm phân tích chạy song song → 2. phe lạc quan vs phe thận trọng → 3. người tổng hợp → lưu desk_reports.
// Cùng một hàm chạy trong Workflow (mỗi bước = step.do, thử lại riêng) và chạy thẳng khi thiếu binding (dev / test).

import { z } from 'zod';
import type { Env } from '../env';
import type { QuoteKind } from '../../shared/types/market';
import type { DeskAnalystReport, DeskDebate, DeskDebateRound, DeskReport, DeskTone, DeskVerdict } from '../../shared/types/api/desk';
import {
  codeVerdict, fetchRatios, fundamentalsReport, macroReport, maxRisk, newsReport, keywordLabel, safeText,
  selectHeadlines, symbolName, technicalReport, templateDebate, type TechnicalMetrics,
} from './analysts';
import { breadthAsOf, historyAsOf, lastLesson, newsAsOf, symbolKind } from './data';
import { askJson, DESK_QUICK_MODEL, DESK_SYNTH_MODEL } from './llm';
import { consumeAi } from '../lib/usage';

export interface DeskParams {
  symbol: string;
  /** YYYY-MM-DD giờ Việt Nam — mọi dữ liệu đọc đều có ngày <= day. */
  day: string;
  /** Người bấm chạy: trừ lượt AI của người này. Bỏ trống = lần chạy hệ thống. */
  userId?: string;
  /** Số vòng tranh luận (mặc định 1). */
  rounds?: number;
  /** Hết lượt AI → mọi bước dùng mẫu tất định. */
  noAi?: boolean;
}

/** Chạy một bước: Workflow → step.do (thử lại, giới hạn thời gian); chạy thẳng → gọi luôn. */
export type StepRunner = <T>(name: string, fn: () => Promise<T>) => Promise<T>;
export const inlineStep: StepRunner = (_name, fn) => fn();

export const DESK_DEFAULT_ROUNDS = 1;
const MODEL_SHORT = (m: string) => m.split('/').pop() ?? m;

interface Analysed { report: DeskAnalystReport; model: string | null; metrics?: TechnicalMetrics; priceAt?: number | null }

// ─── Đọc / ghi báo cáo ───

interface ReportRow {
  symbol: string; day: string; analysts_json: string; debate_json: string; verdict_json: string;
  price_at: number | null; model: string; created_at: string; lesson: string | null; outcome_json: string | null;
}

export const toReport = (r: ReportRow): DeskReport => ({
  symbol: r.symbol,
  day: r.day,
  analysts: JSON.parse(r.analysts_json),
  debate: JSON.parse(r.debate_json),
  verdict: JSON.parse(r.verdict_json),
  priceAt: r.price_at,
  model: r.model,
  createdAt: r.created_at,
  lesson: r.lesson,
  outcome: r.outcome_json ? JSON.parse(r.outcome_json) : null,
});

export async function loadReport(db: D1Database, symbol: string, day: string): Promise<DeskReport | null> {
  const r = await db.prepare('SELECT * FROM desk_reports WHERE symbol = ? AND day = ?').bind(symbol, day).first<ReportRow>();
  return r ? toReport(r) : null;
}

export async function latestReport(db: D1Database, symbol: string): Promise<DeskReport | null> {
  const r = await db.prepare('SELECT * FROM desk_reports WHERE symbol = ? ORDER BY day DESC LIMIT 1').bind(symbol).first<ReportRow>();
  return r ? toReport(r) : null;
}

// ─── Bước 1: nhóm phân tích ───

async function runTechnical(env: Env, p: DeskParams, kind: QuoteKind | null): Promise<Analysed> {
  const bars = await historyAsOf(env.DB, p.symbol, p.day);
  const { report, metrics } = technicalReport(kind, bars);
  return { report, model: null, metrics, priceAt: metrics.last };
}

/** Vàng chưa có chuỗi giá đủ tin cậy cho phân tích kỹ thuật. */
export const hasTechnicalDesk = (symbol: string, kind: QuoteKind | null) =>
  symbol.toUpperCase() !== 'SJC' && kind !== 'gold_vn' && kind !== 'gold_world';

const LabelsSchema = z.object({ labels: z.array(z.enum(['good', 'bad', 'neutral'])) });

async function runNews(env: Env, p: DeskParams): Promise<Analysed> {
  const kind = await symbolKind(env.DB, p.symbol);
  const headlines = selectHeadlines(await newsAsOf(env.DB, p.day), p.symbol, kind);
  if (!headlines.length) return { report: newsReport([], [], false), model: null };
  const name = symbolName(p.symbol, kind);
  const ai = await askJson(env, LabelsSchema, {
    model: DESK_QUICK_MODEL,
    disabled: p.noAi,
    maxTokens: 200,
    timeoutMs: 8_000,
    system:
      'Bạn xếp loại tiêu đề tin tài chính Việt Nam theo tác động tới người ĐANG GIỮ một tài sản: good (tốt), bad (xấu), neutral (trung tính hoặc không liên quan). ' +
      'Chỉ trả về JSON {"labels": [...]} đúng số lượng và thứ tự tiêu đề. Không giải thích.',
    user: `Tài sản: ${name}.\nTiêu đề:\n${headlines.map((h, i) => `${i + 1}. ${h.title}`).join('\n')}`,
  });
  const valid = ai && ai.labels.length === headlines.length;
  const labels: DeskTone[] = valid ? ai.labels : headlines.map((h) => keywordLabel(h.title));
  return { report: newsReport(headlines, labels, !!valid), model: valid ? DESK_QUICK_MODEL : null };
}

async function runFundamentals(env: Env, p: DeskParams): Promise<Analysed> {
  const kind = await symbolKind(env.DB, p.symbol);
  const ratios = kind === 'stock' ? await fetchRatios(p.symbol, p.day) : null;
  return { report: fundamentalsReport(ratios, kind), model: null };
}

async function runMacro(env: Env, p: DeskParams): Promise<Analysed> {
  const [kind, breadth, vnindex, xau, usd] = await Promise.all([
    symbolKind(env.DB, p.symbol),
    breadthAsOf(env.DB, p.day),
    historyAsOf(env.DB, 'VNINDEX', p.day, 30),
    historyAsOf(env.DB, 'XAU', p.day, 30),
    historyAsOf(env.DB, 'USD', p.day, 30),
  ]);
  return { report: macroReport({ kind, breadth, vnindex, xau, usd }), model: null };
}

// ─── Bước 2: tranh luận ───

const PointsSchema = z.object({ points: z.array(z.string().min(5).max(240)).min(1).max(3) });

const factSheet = (analysts: DeskAnalystReport[]) =>
  analysts
    .filter((a) => a.available)
    .map((a) => `${a.label} (điểm ${a.score}): ${a.facts.map((f) => f.text).join(' ')}`)
    .join('\n');

async function debateSide(env: Env, p: DeskParams, side: 'optimist' | 'cautious', name: string, analysts: DeskAnalystReport[], other: string[] | null): Promise<{ points: string[] | null; model: string | null }> {
  const role =
    side === 'optimist'
      ? 'Bạn là PHE LẠC QUAN: nêu lý do người đang giữ tài sản này có thể giữ bình tĩnh.'
      : 'Bạn là PHE THẬN TRỌNG: nêu rủi ro người đang giữ tài sản này cần để ý.';
  const ai = await askJson(env, PointsSchema, {
    model: DESK_QUICK_MODEL,
    disabled: p.noAi,
    maxTokens: 350,
    timeoutMs: 10_000,
    system:
      `${role} Chỉ dùng số liệu được cho, không tự thêm số. Tối đa 3 câu ngắn, tiếng Việt dễ hiểu, không thuật ngữ. ` +
      'Không khuyên mua bất kỳ mã nào, không nhắc nguồn tin. Trả về JSON {"points": ["...", "..."]}.',
    user: `Tài sản: ${name}.\nSố liệu:\n${factSheet(analysts)}${other ? `\nPhe kia vừa nói:\n- ${other.join('\n- ')}` : ''}`,
  });
  const points = ai?.points.filter(safeText) ?? [];
  return points.length ? { points, model: DESK_QUICK_MODEL } : { points: null, model: null };
}

// ─── Bước 3: người tổng hợp ───

const VerdictSchema = z.object({
  trend: z.enum(['tang', 'giam', 'di_ngang']),
  risk: z.enum(['thap', 'vua', 'cao']),
  confidence: z.number().min(0).max(1).optional(),
  reasons: z.array(z.string().min(5).max(240)).length(3),
});

async function synthesize(env: Env, p: DeskParams, name: string, analysts: DeskAnalystReport[], debate: DeskDebate, base: DeskVerdict, lesson: string | null): Promise<{ verdict: DeskVerdict; model: string | null }> {
  const last = debate.rounds[debate.rounds.length - 1];
  const ai = await askJson(env, VerdictSchema, {
    model: DESK_SYNTH_MODEL,
    disabled: p.noAi,
    maxTokens: 700,
    timeoutMs: 20_000,
    system:
      'Bạn là NGƯỜI TỔNG HỢP của một bàn phân tích cho người ĐANG GIỮ tài sản. Đọc số liệu và hai phe, kết luận xu hướng ngắn hạn ' +
      '(tang | giam | di_ngang), mức rủi ro (thap | vua | cao) và đúng 3 lý do ngắn bằng tiếng Việt dễ hiểu. Chỉ dùng số đã cho, không tự tính số mới. ' +
      'Không khuyên mua mã nào, không nhắc nguồn tin. Trả về JSON {"trend": "...", "risk": "...", "reasons": ["...", "...", "..."]}.',
    user:
      `Tài sản: ${name}. Ngày ${p.day}.\nSố liệu:\n${factSheet(analysts)}\n` +
      `Phe lạc quan: ${last.optimist.join(' ')}\nPhe thận trọng: ${last.cautious.join(' ')}\n` +
      `Kết luận tham khảo do code tính: xu hướng ${base.trend}, rủi ro ${base.risk}.` +
      (lesson ? `\nBài học từ lần phân tích trước của mã này: ${lesson}` : ''),
  });
  if (!ai || !ai.reasons.every(safeText)) return { verdict: base, model: null };
  // AI không được đảo ngược chiều code tính, và không được hạ mức rủi ro thấp hơn code (thận trọng)
  const opposite = (ai.trend === 'tang' && base.trend === 'giam') || (ai.trend === 'giam' && base.trend === 'tang');
  return {
    verdict: { trend: opposite ? base.trend : ai.trend, risk: maxRisk(ai.risk, base.risk), confidence: base.confidence, reasons: ai.reasons },
    model: DESK_SYNTH_MODEL,
  };
}

// ─── Toàn bộ quy trình ───

/**
 * Chạy bàn cho (symbol, day). Đã có báo cáo → trả luôn (created=false), không gọi AI.
 * Ghi bằng INSERT OR IGNORE nên hai lần chạy đồng thời vẫn chỉ còn 1 dòng.
 */
export async function runDeskPipeline(env: Env, p: DeskParams, step: StepRunner = inlineStep): Promise<{ report: DeskReport; created: boolean }> {
  const existing = await step('kiểm tra báo cáo hôm nay', async () => (await loadReport(env.DB, p.symbol, p.day)) !== null);
  if (existing) return { report: (await loadReport(env.DB, p.symbol, p.day))!, created: false };
  // Người bấm chạy trả đúng 1 lượt AI cho cả lần chạy (không trừ theo từng lần gọi mô hình)
  if (p.userId) {
    const userId = p.userId;
    const aiOk = await step('trừ lượt AI', async () => (await consumeAi(env, userId, 'desk')).allowed);
    p = { ...p, userId: undefined, noAi: !aiOk };
  }

  const kind = await step('loại tài sản', () => symbolKind(env.DB, p.symbol));
  const [tech, news, fund, macro] = await Promise.all([
    hasTechnicalDesk(p.symbol, kind) ? step('phân tích kỹ thuật', () => runTechnical(env, p, kind)) : Promise.resolve(null),
    step('phân tích tin tức', () => runNews(env, p)),
    step('chỉ số cơ bản', () => runFundamentals(env, p)),
    step('vĩ mô', () => runMacro(env, p)),
  ]);
  const analysts = [tech?.report, news.report, fund.report, macro.report].filter((a): a is DeskAnalystReport => !!a);
  const models = new Set<string>();
  for (const a of [tech, news, fund, macro]) if (a?.model) models.add(a.model);

  const name = symbolName(p.symbol, kind);

  // Bước 2: tranh luận, mỗi phe một bước; vòng sau mỗi phe thấy lời phe kia vòng trước
  const template = templateDebate(analysts);
  const rounds: DeskDebateRound[] = [];
  const total = Math.max(1, Math.min(3, p.rounds ?? DESK_DEFAULT_ROUNDS));
  for (let r = 1; r <= total; r++) {
    const prev = rounds[rounds.length - 1];
    const [opt, cau] = await Promise.all([
      step(`phe lạc quan vòng ${r}`, () => debateSide(env, p, 'optimist', name, analysts, prev?.cautious ?? null)),
      step(`phe thận trọng vòng ${r}`, () => debateSide(env, p, 'cautious', name, analysts, prev?.optimist ?? null)),
    ]);
    if (opt.model) models.add(opt.model);
    if (cau.model) models.add(cau.model);
    rounds.push({ round: r, optimist: opt.points ?? template.optimist, cautious: cau.points ?? template.cautious });
  }
  const debate: DeskDebate = { rounds };

  // Bước 3: người tổng hợp (kèm bài học lần trước của mã, giống bộ nhớ của TradingAgents)
  const base = codeVerdict(analysts, tech?.metrics ?? null);
  const synth = await step('người tổng hợp', async () => {
    const lesson = await lastLesson(env.DB, p.symbol, p.day);
    return synthesize(env, p, name, analysts, debate, base, lesson);
  });
  if (synth.model) models.add(synth.model);

  const model = models.size ? [...models].map(MODEL_SHORT).join('+') : 'mau';
  const created = await step('lưu báo cáo', async () => {
    const res = await env.DB.prepare(
      `INSERT OR IGNORE INTO desk_reports (symbol, day, analysts_json, debate_json, verdict_json, price_at, model) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(p.symbol, p.day, JSON.stringify(analysts), JSON.stringify(debate), JSON.stringify(synth.verdict), tech?.priceAt ?? null, model).run();
    return (res.meta.changes ?? 0) > 0;
  });
  return { report: (await loadReport(env.DB, p.symbol, p.day))!, created };
}
