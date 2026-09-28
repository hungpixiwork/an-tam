// Phân loại ý định từ lệnh ĐÃ CHE (tiếng Việt, có/không dấu). Luật từ khóa là mặc định;
// Workers AI (worker/agents/llm.ts) chỉ được dùng khi có binding và kết quả phải qua `IntentSchema`.
// Tham số (thời gian, chi phí, ngưỡng %) đi qua ký hiệu giữ chỗ AMT_n / DUR_n / PCT_n — số thật do code đổi lại.

import { z } from 'zod';
import { restoreValue, type PlaceholderMap } from './sanitize';

export const INTENTS = ['plan_week', 'save_more', 'learn_skill', 'follow_up_clients', 'review_goals', 'life_decision', 'set_alert', 'ask_desk'] as const;
export type Intent = (typeof INTENTS)[number];
/** Ý định cũ (kế hoạch tuần) — do planRun xử lý. */
export const WEEK_INTENTS = ['plan_week', 'save_more', 'learn_skill', 'follow_up_clients', 'review_goals'] as const satisfies readonly Intent[];

export const LIFE_KINDS = ['study', 'startup', 'sabbatical', 'career_switch', 'other'] as const;
export type LifeKind = (typeof LIFE_KINDS)[number];

const ref = (k: 'AMT' | 'DUR' | 'PCT') => z.string().regex(new RegExp(`^${k}_\\d{1,2}$`));
const symbol = z.string().regex(/^[A-Z][A-Z0-9]{1,9}$/);

/** Khuôn trả về của mô hình AI: chỉ ký hiệu, không có số thật. */
export const IntentSchema = z.object({
  intents: z.array(z.enum(INTENTS)).min(1).max(5),
  life: z.object({
    kind: z.enum(LIFE_KINDS),
    durationRef: ref('DUR').optional(),
    oneTimeCostRef: ref('AMT').optional(),
    monthlyCostRef: ref('AMT').optional(),
    incomeDuringRef: ref('PCT').optional(),
  }).optional(),
  alert: z.object({ symbol, direction: z.enum(['down', 'up']), thresholdRef: ref('PCT').optional() }).optional(),
  desk: z.object({ symbol }).optional(),
});
export type IntentLLMOutput = z.infer<typeof IntentSchema>;

export interface LifeParams {
  kind: LifeKind;
  durationMonths?: number;
  oneTimeCost?: number;
  monthlyCost?: number;
  /** Phần trăm thu nhập còn giữ trong thời gian thực hiện (0 = không có thu nhập). */
  incomeDuringPct?: number;
}
export interface AlertParams { symbol: string; direction: 'down' | 'up'; thresholdPct: number }
export interface IntentParams { life?: LifeParams; alert?: AlertParams; desk?: { symbol: string | null } }

export type IntentResult = { intents: Intent[]; source: 'rules' | 'llm'; params?: IntentParams };

/** Bỏ dấu tiếng Việt + chữ thường để so khớp từ khóa. */
export const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();

const RULES: Record<Intent, RegExp> = {
  plan_week: /\b(sap|xep|len) (lich|ke hoach)|\blich (tuan|tuan toi|lam viec)|ke hoach tuan|tuan toi|tuan sau|\bschedule|\bplan\b|week/,
  save_more: /tiet kiem|de danh|chi tieu|ngan sach|bot chi|giam chi|\bsave|saving|budget/,
  learn_skill: /hoc|ky nang|khoa hoc|\bskill|learn|course/,
  follow_up_clients: /khach|freelance|follow|cham soc khach|client|lam them/,
  review_goals: /muc tieu|tien do|\bgoal|quy du phong|mba/,
  life_decision: /nghi viec|nghi lam|bo viec|di hoc|du hoc|thac si|tien si|\bmba\b|khoi nghiep|startup|mo cong ty|kinh doanh rieng|nghi ngoi|sabbatical|gap year|doi nghe|chuyen nghe|chuyen nganh|chuyen viec|doi viec/,
  set_alert: /\b(bao|canh bao|nhac)( cho)? (toi|minh|em|anh|chi|tui)? ?khi\b|\bcanh bao\b.*\b(giam|tang|do|xanh)\b|^khi .*\b(giam|tang|do|xanh)\b|\balert\b/,
  ask_desk: /co nen (ban|mua|giu|chot)|nen (ban|mua|giu) .* khong|(giam|tang|sap|lao doc).*co sao khong|co sao khong|co anh huong|anh huong gi/,
};

/** Mã tài sản trong câu: vàng → SJC, thị trường → VNINDEX, còn lại mã viết hoa (FPT, VNM, VESAF…). */
const KNOWN_TICKERS = /\b(fpt|vnm|hpg|vcb|mwg|vic|vhm|tcb|mbb|ssi|btc|eth|vesaf|e1vfvn30)\b/;
const NOT_TICKER = new Set(['AMT', 'DUR', 'PCT', 'VND', 'USD', 'CNY', 'AI', 'MBA', 'OK', 'VN']);
export function extractSymbol(maskedPrompt: string): string | null {
  const t = fold(maskedPrompt);
  if (/\bvang\b|\bsjc\b/.test(t)) return 'SJC';
  if (/vn-?index|thi truong|chung khoan|san chung|\bvn30\b/.test(t)) return 'VNINDEX';
  for (const m of maskedPrompt.matchAll(/(?<![\p{L}\d_])([A-Z][A-Z0-9]{2,5})(?![\p{L}\d_])/gu)) if (!NOT_TICKER.has(m[1])) return m[1];
  const k = t.match(KNOWN_TICKERS);
  return k ? k[1].toUpperCase() : null;
}

function lifeKind(t: string): LifeKind {
  if (/khoi nghiep|startup|mo (cong ty|quan|cua hang|shop)|kinh doanh rieng/.test(t)) return 'startup';
  if (/doi nghe|chuyen nghe|chuyen nganh|chuyen viec|doi viec/.test(t)) return 'career_switch';
  if (/hoc|thac si|tien si|\bmba\b/.test(t)) return 'study';
  if (/nghi ngoi|sabbatical|gap year|nghi (mot thoi gian|dai han)/.test(t)) return 'sabbatical';
  return 'other';
}

/** Tham số bằng luật (không cần AI): đọc ký hiệu trong câu đã che và ngữ cảnh chữ quanh nó. */
export function parseParamsRules(maskedPrompt: string, map: PlaceholderMap, intents: Intent[]): IntentParams {
  const t = fold(maskedPrompt);
  const out: IntentParams = {};
  const refs = (kind: string) => [...t.matchAll(new RegExp(`\\b${kind.toLowerCase()}_(\\d+)\\b`, 'g'))].map((m) => ({ key: `${kind}_${m[1]}`, at: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));

  if (intents.includes('life_decision')) {
    const life: LifeParams = { kind: lifeKind(t) };
    const dur = refs('DUR')[0];
    if (dur) life.durationMonths = restoreValue(dur.key, map, 'DUR');
    let oneTime = 0;
    let monthly = 0;
    for (const a of refs('AMT')) {
      const v = restoreValue(a.key, map, 'AMT');
      if (v === undefined) continue;
      const before = t.slice(Math.max(0, a.at - 24), a.at);
      const after = t.slice(a.end, a.end + 16);
      if (/(\bco|dang co|tiet kiem duoc|de danh duoc|luong|thu nhap)\s*$/.test(before)) continue; // tài sản / thu nhập, không phải chi phí
      if (/^\s*(\/\s*(thang|th)\b|moi thang|mot thang|hang thang)/.test(after) || /(moi thang|hang thang|sinh hoat phi|chi phi song)\s*$/.test(before)) monthly += v;
      else oneTime += v;
    }
    if (oneTime > 0) life.oneTimeCost = oneTime;
    if (monthly > 0) life.monthlyCost = monthly;
    const pct = refs('PCT').find((p) => /luong|thu nhap|ban thoi gian|part.?time/.test(t.slice(Math.max(0, p.at - 24), p.end + 16)));
    if (pct) life.incomeDuringPct = restoreValue(pct.key, map, 'PCT');
    else if (/nghi viec|nghi lam|bo viec|khong (co )?luong|khong (co )?thu nhap/.test(t)) life.incomeDuringPct = 0;
    out.life = life;
  }

  if (intents.includes('set_alert')) {
    const symbol = extractSymbol(maskedPrompt) ?? 'VNINDEX';
    const direction = /\b(tang|len|vuot|xanh)\b/.test(t) && !/\b(giam|xuong|sut|do)\b/.test(t) ? 'up' : 'down';
    const p = refs('PCT')[0];
    const pct = p ? restoreValue(p.key, map, 'PCT') : undefined;
    // "khi thị trường đỏ" không nói ngưỡng → báo từ 1%; còn lại mặc định 3%
    const thresholdPct = pct && pct > 0 && pct <= 100 ? pct : /thi truong (do|xanh)/.test(t) ? 1 : 3;
    out.alert = { symbol, direction, thresholdPct };
  }

  if (intents.includes('ask_desk')) out.desk = { symbol: extractSymbol(maskedPrompt) };
  return out;
}

/** Luật: mọi ý định khớp từ khóa. Không khớp gì → lập kế hoạch tuần (mặc định an toàn, chỉ đề xuất). */
export function parseIntentRules(maskedPrompt: string): Intent[] {
  const t = fold(maskedPrompt);
  let special: Intent[] = (['set_alert', 'ask_desk', 'life_decision'] as const).filter((i) => RULES[i].test(t));
  // Câu về cảnh báo giá / hỏi về một mã không phải quyết định lớn — tránh lẫn hai loại
  if (special.includes('set_alert') || special.includes('ask_desk')) special = special.filter((i) => i !== 'life_decision');
  if (special.length) {
    // Câu về quyết định lớn / cảnh báo: chỉ giữ lịch tuần khi người dùng nói rõ "lịch"
    return RULES.plan_week.test(t) && /lich/.test(t) ? [...special, 'plan_week'] : special;
  }
  const out = WEEK_INTENTS.filter((i) => RULES[i].test(t)) as Intent[];
  // Đã nói tới tiết kiệm / kỹ năng / khách mà không nói "lịch" → vẫn cần sắp lịch để thực hiện
  if (!out.includes('plan_week') && out.some((i) => i === 'learn_skill' || i === 'follow_up_clients')) out.unshift('plan_week');
  // Tiết kiệm luôn gắn với mục tiêu (Goal Agent cập nhật mục tiêu)
  if (out.includes('save_more') && !out.includes('review_goals')) out.push('review_goals');
  return out.length ? out : ['plan_week'];
}

/** Gộp kết quả LLM (nếu hợp lệ) với luật: LLM có thể bỏ sót, luật giữ các ý định rõ ràng. */
export function mergeIntents(llm: Intent[] | null, rules: Intent[]): IntentResult {
  if (!llm?.length) return { intents: rules, source: 'rules' };
  return { intents: INTENTS.filter((i) => llm.includes(i) || rules.includes(i)), source: 'llm' };
}

/** Tham số từ AI (đổi ký hiệu → số) — thiếu hoặc sai ký hiệu thì lấy của luật. */
export function paramsFromLLM(out: IntentLLMOutput, map: PlaceholderMap): IntentParams {
  const p: IntentParams = {};
  if (out.life) {
    p.life = {
      kind: out.life.kind,
      durationMonths: restoreValue(out.life.durationRef, map, 'DUR'),
      oneTimeCost: restoreValue(out.life.oneTimeCostRef, map, 'AMT'),
      monthlyCost: restoreValue(out.life.monthlyCostRef, map, 'AMT'),
      incomeDuringPct: restoreValue(out.life.incomeDuringRef, map, 'PCT'),
    };
  }
  if (out.alert) {
    const pct = restoreValue(out.alert.thresholdRef, map, 'PCT');
    p.alert = { symbol: out.alert.symbol, direction: out.alert.direction, thresholdPct: pct && pct > 0 && pct <= 100 ? pct : 0 };
  }
  if (out.desk) p.desk = { symbol: out.desk.symbol };
  return p;
}

const defined = <T extends object>(o: T | undefined): Partial<T> =>
  Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;

/** Gộp tham số: ưu tiên AI khi có giá trị, còn lại lấy từ luật. */
export function mergeParams(llm: IntentParams | null, rules: IntentParams): IntentParams {
  if (!llm) return rules;
  const out: IntentParams = { ...rules };
  if (llm.life || rules.life) out.life = { ...rules.life, ...defined(llm.life) } as LifeParams;
  if (llm.alert || rules.alert) {
    const a = { ...rules.alert, ...defined(llm.alert) } as AlertParams;
    if (!a.thresholdPct) a.thresholdPct = rules.alert?.thresholdPct ?? 3;
    out.alert = a;
  }
  if (llm.desk || rules.desk) out.desk = { symbol: llm.desk?.symbol ?? rules.desk?.symbol ?? null };
  return out;
}
