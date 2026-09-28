// Workers AI (Qwen3) — CHỈ nhận câu đã che số, chỉ chạy khi có binding `AI` và INTENT_PROVIDER = 'workers-ai'.
// 1) Phân loại ý định + rút tham số bằng ký hiệu AMT_n / DUR_n / PCT_n (số thật do code đổi lại).
// 2) Diễn đạt lại câu trả lời (llmNarrator): số trong câu ra phải đúng bằng số trong câu mẫu, sai → dùng câu mẫu.
// Hết 3 giây, lỗi mạng, JSON sai khuôn, hết lượt → null / câu mẫu (runner dùng luật, không báo lỗi).

import type { Env } from '../env';
import { INTENTS, IntentSchema, LIFE_KINDS, type Intent, type IntentLLMOutput } from '../../shared/agent/intent';
import { maskWithPlaceholders, restoreText } from '../../shared/agent/sanitize';
import { templateNarrator, type TemplateKey, type Vars } from '../../shared/engine/narrate';
import { consumeAi, userPlan } from '../lib/usage';

export const INTENT_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
const TIMEOUT_MS = 3000;

const SYSTEM = `Bạn phân loại lệnh tiếng Việt của người dùng ứng dụng tài chính cá nhân. Số trong lệnh đã được thay bằng ký hiệu:
AMT_n = số tiền, DUR_n = khoảng thời gian, PCT_n = phần trăm. Không bao giờ viết số, chỉ dùng lại ký hiệu có trong lệnh.
Chỉ trả về JSON: {"intents": [...], "life"?: {...}, "alert"?: {...}, "desk"?: {...}}. intents lấy trong: ${INTENTS.join(', ')}.
plan_week = sắp lịch/kế hoạch tuần; save_more = tiết kiệm, ngân sách; learn_skill = học kỹ năng ngắn;
follow_up_clients = khách hàng, làm thêm; review_goals = mục tiêu tài chính;
life_decision = quyết định lớn (nghỉ việc đi học, du học, khởi nghiệp, nghỉ ngơi dài, đổi nghề) → "life": {"kind": ${LIFE_KINDS.map((k) => `"${k}"`).join('|')},
  "durationRef"?: "DUR_n", "oneTimeCostRef"?: "AMT_n" (học phí/vốn một lần), "monthlyCostRef"?: "AMT_n" (chi mỗi tháng), "incomeDuringRef"?: "PCT_n" (phần lương còn giữ)};
set_alert = nhờ báo khi giá thay đổi → "alert": {"symbol": "SJC" nếu vàng, "VNINDEX" nếu thị trường, hoặc mã viết hoa, "direction": "down"|"up", "thresholdRef"?: "PCT_n"};
ask_desk = hỏi có nên mua/bán/giữ một mã, mã giảm có sao không → "desk": {"symbol": ...};
simulate_decision = thử cú sốc (mất việc, ngành suy giảm, thị trường giảm) lên lựa chọn đã có, cập nhật lại kế hoạch lựa chọn. Không giải thích.`;

export const llmAvailable = (env: Env) => !!env.AI && env.INTENT_PROVIDER === 'workers-ai';

/** Gọi mô hình với thời hạn 3 giây; trả chữ hoặc null. */
async function runText(env: Env, system: string, user: string, maxTokens: number): Promise<string | null> {
  try {
    const call = env.AI!.run(INTENT_MODEL as Parameters<Ai['run']>[0], {
      messages: [
        { role: 'system', content: system },
        // Qwen3: tắt chế độ suy nghĩ dài, nếu không hết token trước khi trả JSON
        { role: 'user', content: `${user} /no_think` },
      ],
      max_tokens: maxTokens,
      temperature: 0,
    } as never) as Promise<unknown>;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), TIMEOUT_MS); });
    const out = await Promise.race([call, timeout]).finally(() => { if (timer !== undefined) clearTimeout(timer); });
    if (!out || typeof out !== 'object') return null;
    // Workers AI trả { response } hoặc dạng OpenAI { choices: [{ message: { content } }] }
    const o = out as { response?: unknown; choices?: { message?: { content?: unknown } }[] };
    const text = o.response ?? o.choices?.[0]?.message?.content;
    return typeof text === 'string' ? text : text && typeof text === 'object' ? JSON.stringify(text) : null;
  } catch {
    return null;
  }
}

/** Ý định + tham số (dạng ký hiệu). Có `userId` → trừ 1 lượt AI theo gói; hết lượt → null. */
export async function classifyLLM(env: Env, maskedPrompt: string, userId?: string): Promise<IntentLLMOutput | null> {
  if (!llmAvailable(env)) return null;
  if (userId && !(await consumeAi(env, userId, 'intent')).allowed) return null;
  const text = await runText(env, SYSTEM, maskedPrompt, 200);
  const json = text?.replace(/<think>[\s\S]*?<\/think>/g, '').match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  try {
    const parsed = IntentSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    // Ký hiệu AI trả về phải có trong câu đã che (không cho bịa AMT_9)
    const refs = JSON.stringify(parsed.data).match(/\b(?:AMT|DUR|PCT)_\d+\b/g) ?? [];
    return refs.every((r) => maskedPrompt.includes(r)) ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Chỉ danh sách ý định (giữ cho nơi gọi cũ). */
export async function classifyIntentLLM(env: Env, maskedPrompt: string, userId?: string): Promise<Intent[] | null> {
  return (await classifyLLM(env, maskedPrompt, userId))?.intents ?? null;
}

/* ───────── Diễn đạt lại câu trả lời ───────── */

const NARRATE_SYSTEM = `Viết lại câu tiếng Việt dưới đây cho tự nhiên, thân thiện, ngắn gọn, giữ nguyên ý.
Giữ NGUYÊN mọi ký hiệu AMT_n, DUR_n, PCT_n và chữ trong ngoặc kép. Không thêm số, không thêm lời khuyên. Chỉ trả về câu đã viết lại.`;

/** Tập các con số trong câu ("300.000.000đ", "3,2 tháng" → {"300000000", "3.2"}). */
export function numberSet(text: string): Set<string> {
  return new Set([...text.matchAll(/\d(?:[\d.,]*\d)?/g)].map((m) => {
    const t = m[0];
    return /^\d{1,3}(?:\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t.replace(/\./g, '').replace(',', '.');
  }));
}
const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));

/**
 * Diễn đạt lại `sentence` bằng `rewrite` (nhận câu đã che, trả câu đã che hoặc null).
 * Số trong câu ra (sau khi đổi ký hiệu lại) phải trùng tập số của câu mẫu; không thì trả câu mẫu.
 */
export async function rephraseChecked(sentence: string, rewrite: (masked: string) => Promise<string | null>): Promise<{ text: string; narrated: boolean }> {
  const { masked, map } = maskWithPlaceholders(sentence);
  // Câu mẫu có số trần (không đơn vị) bị che mất → không đổi lại được, giữ câu mẫu
  if (!sameSet(numberSet(restoreText(masked, map)), numberSet(sentence))) return { text: sentence, narrated: false };
  const out = (await rewrite(masked).catch(() => null))?.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (!out || out.length > sentence.length * 2 + 80) return { text: sentence, narrated: false };
  const restored = restoreText(out, map);
  if (/\b(?:AMT|DUR|PCT)_\d+\b/.test(restored) || !sameSet(numberSet(restored), numberSet(sentence))) return { text: sentence, narrated: false };
  return { text: restored, narrated: true };
}

/** Gói Plus / Ngân hàng + còn lượt AI → diễn đạt lại bằng Workers AI; còn lại dùng câu mẫu. */
export async function narrateReply(env: Env, userId: string, sentence: string): Promise<{ text: string; narrated: boolean }> {
  if (!llmAvailable(env)) return { text: sentence, narrated: false };
  const { plan } = await userPlan(env.DB, userId);
  if (plan === 'free' || !(await consumeAi(env, userId, 'narrate', new Date(), plan)).allowed) return { text: sentence, narrated: false };
  return rephraseChecked(sentence, (masked) => runText(env, NARRATE_SYSTEM, masked, 300));
}

/** Narrator bất đồng bộ cho câu mẫu của shared/engine/narrate.ts (cùng kiểm tra con số). */
export const llmNarrator = (env: Env, userId: string): { narrate(key: TemplateKey, vars?: Vars): Promise<string> } => ({
  narrate: async (key, vars) => (await narrateReply(env, userId, templateNarrator.narrate(key, vars))).text,
});
