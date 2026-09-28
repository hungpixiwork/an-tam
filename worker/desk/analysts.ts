// Nhóm phân tích của bàn đầu tư. MỌI con số do code tính ở đây; AI (nếu có) chỉ xếp loại tiêu đề tin.
// Mỗi nhà phân tích trả { score -2..2, facts[], note }. Không ghi tên nguồn / ghi nguồn trong chữ.

import type { Bar, Breadth, QuoteKind } from '../../shared/types/market';
import type { DeskAnalystReport, DeskFact, DeskRiskLevel, DeskTone, DeskTrend, DeskVerdict } from '../../shared/types/api/desk';
import { drawdownFromPeak, rsi, sma, volatility } from '../../shared/engine/technical';
import { formatVnd } from '../../shared/format';

const clampScore = (s: number) => Math.max(-2, Math.min(2, Math.round(s)));
const num = (v: number, digits = 1) => v.toFixed(digits).replace('.', ',');
const thousands = (v: number) => Math.round(v).toLocaleString('vi-VN');
const pctAbs = (fraction: number, digits = 1) => `${num(Math.abs(fraction) * 100, digits)}%`;
const upDown = (fraction: number) => (fraction >= 0 ? 'tăng' : 'giảm');

/** Chữ không được nhắc tên nguồn dữ liệu / ghi nguồn. */
export const SOURCE_WORDS = /cafef|vnexpress|vndirect|\bssi\b|fmarket|vietcombank|coingecko|gold-api|er-api|nguồn:|theo nguồn/i;
/** Chữ AI viết không được khuyên mua mã / đặt lệnh. */
export const ADVICE_WORDS = /\bmua\b|mua vào|mua thêm|\bgom\b|đặt lệnh|khuyến nghị|chốt lời|bắt đáy/i;
export const safeText = (s: string) => !SOURCE_WORDS.test(s) && !ADVICE_WORDS.test(s);

export function symbolName(symbol: string, kind: QuoteKind | null): string {
  const fixed: Record<string, string> = { SJC: 'Vàng SJC', VNINDEX: 'VN-Index', BTC: 'Bitcoin', XAU: 'Vàng thế giới', USD: 'Tỷ giá USD' };
  if (fixed[symbol]) return fixed[symbol];
  if (kind === 'stock') return `Cổ phiếu ${symbol}`;
  if (kind === 'fund') return `Chứng chỉ quỹ ${symbol}`;
  return symbol;
}

export function formatPrice(kind: QuoteKind | null, v: number): string {
  if (kind === 'index') return `${num(v, 2)} điểm`;
  if (kind === 'gold_world') return `${num(v, 1)} USD/ounce`;
  if (kind === 'gold_vn') return `${formatVnd(v)}/lượng`;
  if (kind === 'crypto') return formatVnd(v);
  return `${thousands(v)} đ`;
}

// ─── Kỹ thuật ───

export interface TechnicalMetrics {
  last: number | null;
  ma20: number | null;
  ma50: number | null;
  rsi14: number | null;
  /** 0..1 so với đỉnh 52 tuần. */
  drawdown: number | null;
  /** Độ lệch chuẩn lợi nhuận ngày, 20 phiên. */
  vol20: number | null;
  /** Thay đổi 20 phiên, phân số. */
  chg20: number | null;
  /** 1 = xu hướng lên (giá > MA20 > MA50), -1 = xu hướng xuống, 0 = không rõ. */
  maTrend: number;
}

export function technicalMetrics(bars: Bar[]): TechnicalMetrics {
  const closes = bars.map((b) => b.close);
  const last = closes.length ? closes[closes.length - 1] : null;
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const ref20 = closes.length >= 21 ? closes[closes.length - 21] : null;
  let maTrend = 0;
  if (last !== null && ma20 !== null && ma50 !== null) {
    if (last > ma20 && ma20 > ma50) maTrend = 1;
    else if (last < ma20 && ma20 < ma50) maTrend = -1;
  }
  return {
    last,
    ma20,
    ma50,
    rsi14: rsi(closes, 14),
    drawdown: drawdownFromPeak(closes.slice(-250)),
    vol20: volatility(closes.slice(-21)),
    chg20: last !== null && ref20 ? last / ref20 - 1 : null,
    maTrend,
  };
}

export function technicalReport(kind: QuoteKind | null, bars: Bar[]): { report: DeskAnalystReport; metrics: TechnicalMetrics } {
  const m = technicalMetrics(bars);
  const label = 'Phân tích kỹ thuật';
  if (m.last === null || bars.length < 20) {
    return { report: { key: 'technical', label, score: 0, facts: [], note: 'Chưa đủ lịch sử giá (cần ít nhất 20 phiên).', available: false }, metrics: m };
  }
  const facts: DeskFact[] = [];
  let score = 0;
  const p = (v: number) => formatPrice(kind, v);
  if (m.ma20 !== null) {
    facts.push({ text: `Giá ${p(m.last)}, ${m.last >= m.ma20 ? 'trên' : 'dưới'} mức trung bình 20 phiên (${p(m.ma20)}).`, tone: m.last >= m.ma20 ? 'good' : 'bad' });
  }
  if (m.ma50 !== null && m.ma20 !== null) {
    facts.push({ text: `Trung bình 20 phiên ${m.ma20 >= m.ma50 ? 'cao hơn' : 'thấp hơn'} trung bình 50 phiên (${p(m.ma50)}).`, tone: m.ma20 >= m.ma50 ? 'good' : 'bad' });
  }
  score += m.maTrend;
  if (m.chg20 !== null) {
    facts.push({ text: `20 phiên qua giá ${upDown(m.chg20)} ${pctAbs(m.chg20)}.`, tone: m.chg20 > 0.02 ? 'good' : m.chg20 < -0.02 ? 'bad' : 'neutral' });
    if (m.maTrend === 0) score += m.chg20 > 0.05 ? 1 : m.chg20 < -0.05 ? -1 : 0;
  }
  if (m.rsi14 !== null) {
    const hot = m.rsi14 > 70;
    const cold = m.rsi14 < 30;
    facts.push({
      text: `Sức mạnh giá 14 phiên: ${Math.round(m.rsi14)}/100 (${hot ? 'đang tăng nóng' : cold ? 'đã bị bán mạnh' : 'bình thường'}).`,
      tone: hot ? 'bad' : 'neutral',
    });
    if (hot) score -= 1;
  }
  if (m.drawdown !== null) {
    facts.push({ text: `Thấp hơn đỉnh 52 tuần ${pctAbs(m.drawdown)}.`, tone: m.drawdown >= 0.2 ? 'bad' : m.drawdown <= 0.03 ? 'good' : 'neutral' });
    if (m.drawdown >= 0.2) score -= 1;
  }
  if (m.vol20 !== null) {
    facts.push({ text: `Biến động trung bình mỗi ngày khoảng ${pctAbs(m.vol20)} (20 phiên).`, tone: m.vol20 > 0.025 ? 'bad' : 'neutral' });
  }
  const s = clampScore(score);
  return {
    report: { key: 'technical', label, score: s, facts, note: s > 0 ? 'Giá đang trong xu hướng lên.' : s < 0 ? 'Giá đang yếu đi.' : 'Giá chưa có xu hướng rõ.', available: true },
    metrics: m,
  };
}

// ─── Tin tức ───

export interface Headline { id: string; title: string; publishedAt: string }

function relevance(symbol: string, kind: QuoteKind | null): RegExp {
  if (kind === 'gold_vn' || kind === 'gold_world' || symbol === 'SJC') return /vàng/i;
  if (symbol === 'VNINDEX' || kind === 'index') return /chứng khoán|vn-?index|cổ phiếu|thị trường/i;
  if (kind === 'fund') return /quỹ|chứng khoán|cổ phiếu/i;
  if (kind === 'crypto') return /bitcoin|tiền số|tiền mã hóa|crypto/i;
  return new RegExp(`\\b${symbol}\\b`, 'i');
}

/** Tối đa 10 tiêu đề: liên quan tới mã trước, rồi tin thị trường chung. Bỏ tiêu đề có tên nguồn. */
export function selectHeadlines(news: Headline[], symbol: string, kind: QuoteKind | null, max = 10): Headline[] {
  const re = relevance(symbol, kind);
  const clean = news.filter((n) => !SOURCE_WORDS.test(n.title));
  const hit = clean.filter((n) => re.test(n.title));
  const rest = clean.filter((n) => !re.test(n.title));
  return [...hit, ...rest].slice(0, max);
}

const BAD_WORDS = /giảm|lao dốc|bán tháo|thua lỗ|báo lỗ|sụt|lỗ ròng|khó khăn|cảnh báo|rơi|mất|phá sản|vỡ nợ|bị phạt|chìm/i;
const GOOD_WORDS = /tăng|lãi|kỷ lục|khởi sắc|phục hồi|hồi phục|bứt phá|lợi nhuận|vượt|tích cực|nâng hạng/i;

/** Xếp loại dự phòng khi không có AI: đếm từ khóa, có cả hai → trung tính. */
export function keywordLabel(title: string): DeskTone {
  const bad = BAD_WORDS.test(title);
  const good = GOOD_WORDS.test(title);
  return bad === good ? 'neutral' : bad ? 'bad' : 'good';
}

export function newsReport(headlines: Headline[], labels: DeskTone[], byAi: boolean): DeskAnalystReport {
  const label = 'Tin tức';
  if (!headlines.length) return { key: 'news', label, score: 0, facts: [], note: 'Chưa có tin mới trong 7 ngày.', available: false };
  const good = labels.filter((l) => l === 'good').length;
  const bad = labels.filter((l) => l === 'bad').length;
  const diff = good - bad;
  const score = diff >= 3 ? 2 : diff >= 1 ? 1 : diff <= -3 ? -2 : diff <= -1 ? -1 : 0;
  const facts: DeskFact[] = [
    { text: `${headlines.length} tin gần đây: ${good} tốt, ${bad} xấu, ${headlines.length - good - bad} trung tính.`, tone: score > 0 ? 'good' : score < 0 ? 'bad' : 'neutral' },
  ];
  // Kèm tối đa 2 tiêu đề tiêu biểu (xấu trước — người đang giữ cần biết rủi ro trước)
  const pick = [...headlines.keys()].filter((i) => labels[i] !== 'neutral').sort((a, b) => (labels[a] === 'bad' ? 0 : 1) - (labels[b] === 'bad' ? 0 : 1)).slice(0, 2);
  for (const i of pick) facts.push({ text: `Tin: "${headlines[i].title}"`, tone: labels[i] });
  return {
    key: 'news',
    label,
    score,
    facts,
    note: `${byAi ? 'Tin được AI xếp loại' : 'Tin được xếp loại theo từ khóa'}; điểm do đếm số tin tốt / xấu.`,
    available: true,
  };
}

// ─── Chỉ số cơ bản (chỉ cổ phiếu, nếu lấy được) ───

export interface Ratios { pe?: number; pb?: number; roe?: number; beta?: number; reportDate?: string }

const RATIO_ITEMS: Record<string, keyof Ratios> = { '51006': 'pe', '51012': 'pb', '52002': 'roe', '51007': 'beta' };
const RATIO_URL = (symbol: string) =>
  `https://api-finfo.vndirect.com.vn/v4/ratios/latest?filter=itemCode:${Object.keys(RATIO_ITEMS).join(',')}&where=code:${symbol}&order=reportDate&fields=itemCode,value,reportDate`;

/** Chỉ số mới nhất có ngày báo cáo <= asOf. Lỗi / không có → null (bỏ qua nhà phân tích này). */
export async function fetchRatios(symbol: string, asOf: string): Promise<Ratios | null> {
  if (!/^[A-Z0-9]{3}$/.test(symbol)) return null;
  try {
    const res = await fetch(RATIO_URL(symbol), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36', Accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { itemCode: string; value: number; reportDate?: string }[] };
    const out: Ratios = {};
    for (const r of body.data ?? []) {
      const key = RATIO_ITEMS[r.itemCode];
      if (!key || key === 'reportDate' || !Number.isFinite(r.value) || (r.reportDate && r.reportDate > asOf)) continue;
      out[key] = r.value;
      if (r.reportDate && (!out.reportDate || r.reportDate > out.reportDate)) out.reportDate = r.reportDate;
    }
    return out.pe !== undefined || out.roe !== undefined ? out : null;
  } catch {
    return null;
  }
}

export function fundamentalsReport(r: Ratios | null, kind: QuoteKind | null): DeskAnalystReport {
  const label = 'Chỉ số cơ bản';
  if (kind !== 'stock' || !r) return { key: 'fundamentals', label, score: 0, facts: [], note: 'Không áp dụng hoặc chưa lấy được chỉ số.', available: false };
  const facts: DeskFact[] = [];
  let score = 0;
  if (r.pe !== undefined && r.pe > 0) {
    const tone: DeskTone = r.pe < 10 ? 'good' : r.pe > 25 ? 'bad' : 'neutral';
    facts.push({ text: `Giá gấp ${num(r.pe)} lần lợi nhuận mỗi cổ phiếu một năm (P/E).`, tone });
    score += tone === 'good' ? 1 : tone === 'bad' ? -1 : 0;
  }
  if (r.roe !== undefined) {
    const tone: DeskTone = r.roe >= 0.15 ? 'good' : r.roe < 0.08 ? 'bad' : 'neutral';
    facts.push({ text: `Công ty lãi ${num(r.roe * 100)}% trên vốn chủ sở hữu mỗi năm (ROE).`, tone });
    score += tone === 'good' ? 1 : tone === 'bad' ? -1 : 0;
  }
  if (r.pb !== undefined && r.pb > 0) facts.push({ text: `Giá gấp ${num(r.pb)} lần giá trị sổ sách (P/B).`, tone: r.pb > 4 ? 'bad' : 'neutral' });
  const s = clampScore(score);
  return { key: 'fundamentals', label, score: s, facts, note: s > 0 ? 'Doanh nghiệp làm ăn tốt so với giá.' : s < 0 ? 'Giá cao so với kết quả kinh doanh.' : 'Chỉ số ở mức trung bình.', available: true };
}

// ─── Vĩ mô ───

export interface MacroInput {
  kind: QuoteKind | null;
  breadth: Breadth | null;
  vnindex: Bar[];
  xau: Bar[];
  usd: Bar[];
}

const changeBack = (bars: Bar[], back: number): number | null => {
  if (bars.length <= back) return null;
  const ref = bars[bars.length - 1 - back].close;
  return ref > 0 ? bars[bars.length - 1].close / ref - 1 : null;
};

export function macroReport(input: MacroInput): DeskAnalystReport {
  const { kind, breadth } = input;
  const isGold = kind === 'gold_vn' || kind === 'gold_world';
  const equity = kind === 'stock' || kind === 'fund' || kind === 'index';
  const facts: DeskFact[] = [];
  let score = 0;
  const idxChg = breadth?.indexChangePct != null ? breadth.indexChangePct / 100 : changeBack(input.vnindex, 1);
  if (idxChg !== null) {
    const tone: DeskTone = idxChg <= -0.01 ? 'bad' : idxChg >= 0.01 ? 'good' : 'neutral';
    facts.push({ text: `VN-Index phiên gần nhất ${upDown(idxChg)} ${pctAbs(idxChg, 2)}.`, tone: equity ? tone : 'neutral' });
    if (equity) score += tone === 'good' ? 1 : tone === 'bad' ? -1 : 0;
  }
  if (breadth?.advancers != null && breadth.decliners != null) {
    const { advancers: a, decliners: d } = breadth;
    const tone: DeskTone = d > 1.5 * a ? 'bad' : a > 1.5 * d ? 'good' : 'neutral';
    facts.push({ text: `Sàn HOSE: ${a} mã tăng, ${d} mã giảm.`, tone: equity ? tone : 'neutral' });
    if (equity) score += tone === 'good' ? 1 : tone === 'bad' ? -1 : 0;
  }
  const xau5 = changeBack(input.xau, 5);
  if (xau5 !== null) {
    const tone: DeskTone = xau5 >= 0.02 ? 'good' : xau5 <= -0.02 ? 'bad' : 'neutral';
    facts.push({ text: `Vàng thế giới 5 phiên qua ${upDown(xau5)} ${pctAbs(xau5)}.`, tone: isGold ? tone : 'neutral' });
    if (isGold) score += tone === 'good' ? 1 : tone === 'bad' ? -1 : 0;
  }
  const usd5 = changeBack(input.usd, 5);
  if (usd5 !== null) {
    facts.push({ text: `Tỷ giá USD 5 phiên qua ${upDown(usd5)} ${pctAbs(usd5, 2)}.`, tone: equity && usd5 >= 0.01 ? 'bad' : 'neutral' });
    if (equity && usd5 >= 0.01) score -= 1;
  }
  const s = clampScore(score);
  return {
    key: 'macro',
    label: 'Vĩ mô',
    score: s,
    facts,
    note: facts.length ? (s > 0 ? 'Bối cảnh chung thuận lợi.' : s < 0 ? 'Bối cảnh chung bất lợi.' : 'Bối cảnh chung trung tính.') : 'Chưa có dữ liệu thị trường chung.',
    available: facts.length > 0,
  };
}

// ─── Tranh luận (câu mẫu khi không có AI) ───

export function templateDebate(analysts: DeskAnalystReport[]): { optimist: string[]; cautious: string[] } {
  const facts = analysts.filter((a) => a.available).flatMap((a) => a.facts);
  const good = facts.filter((f) => f.tone === 'good').map((f) => f.text).slice(0, 3);
  const bad = facts.filter((f) => f.tone === 'bad').map((f) => f.text).slice(0, 3);
  return {
    optimist: good.length ? good : ['Chưa thấy tín hiệu tốt rõ ràng, nhưng cũng chưa có dấu hiệu bất thường.'],
    cautious: bad.length ? bad : ['Chưa thấy tín hiệu xấu rõ ràng; vẫn nên giữ tỷ trọng vừa phải.'],
  };
}

// ─── Người tổng hợp: phần code tính ───

const RISK_ORDER: DeskRiskLevel[] = ['thap', 'vua', 'cao'];
export const maxRisk = (a: DeskRiskLevel, b: DeskRiskLevel): DeskRiskLevel => (RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b);
const bump = (r: DeskRiskLevel): DeskRiskLevel => RISK_ORDER[Math.min(2, RISK_ORDER.indexOf(r) + 1)];

/** Kết luận do code tính — nền cho AI, và là kết luận dùng luôn khi không có AI. */
export function codeVerdict(analysts: DeskAnalystReport[], m: TechnicalMetrics | null): DeskVerdict {
  const live = analysts.filter((a) => a.available);
  const total = live.reduce((s, a) => s + a.score, 0);
  const chg20 = m?.chg20 ?? null;
  const maTrend = m?.maTrend ?? 0;
  const vol20 = m?.vol20 ?? null;
  const drawdown = m?.drawdown ?? null;
  let trend: DeskTrend;
  if (chg20 !== null && chg20 > 0.03 && maTrend >= 0) trend = 'tang';
  else if (chg20 !== null && chg20 < -0.03 && maTrend <= 0) trend = 'giam';
  else trend = total >= 2 ? 'tang' : total <= -2 ? 'giam' : 'di_ngang';

  let risk: DeskRiskLevel = vol20 === null ? 'vua' : vol20 > 0.025 ? 'cao' : vol20 > 0.012 ? 'vua' : 'thap';
  if (drawdown !== null && drawdown >= 0.2) risk = bump(risk);
  if (total <= -3) risk = bump(risk);

  const sign = trend === 'tang' ? 1 : trend === 'giam' ? -1 : 0;
  const agree = live.filter((a) => Math.sign(a.score) === sign).length;
  const confidence = Math.round(Math.min(0.9, Math.max(0.2, 0.2 + 0.55 * (agree / (live.length || 1)) + 0.15 * (live.length / 4))) * 100) / 100;

  // Lý do: dữ kiện cùng chiều kết luận trước, rồi dữ kiện còn lại
  const facts = live.flatMap((a) => a.facts);
  const want: DeskTone = trend === 'tang' ? 'good' : trend === 'giam' ? 'bad' : 'neutral';
  const ordered = [...facts.filter((f) => f.tone === want), ...facts.filter((f) => f.tone !== want)].map((f) => f.text);
  const reasons = [...new Set(ordered)].slice(0, 3);
  while (reasons.length < 3) reasons.push(reasons.length === 0 ? 'Chưa đủ dữ liệu để kết luận chắc chắn.' : 'Các tín hiệu còn lại chưa rõ chiều.');
  return { trend, risk, confidence, reasons };
}
