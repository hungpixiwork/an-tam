// Phân loại ý định bằng Workers AI (Qwen3) — CHỈ nhận lệnh đã che số, chỉ chạy khi có binding `AI`
// và INTENT_PROVIDER = 'workers-ai'. Hết 3 giây, lỗi mạng, JSON sai schema → null (runner dùng luật).

import type { Env } from '../env';
import { INTENTS, IntentSchema, type Intent } from '../../shared/agent/intent';

export const INTENT_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
const TIMEOUT_MS = 3000;

const SYSTEM = `Bạn phân loại lệnh tiếng Việt của người dùng ứng dụng tài chính cá nhân.
Chỉ trả về JSON dạng {"intents": [...]} với các giá trị trong: ${INTENTS.join(', ')}.
plan_week = sắp lịch/kế hoạch tuần; save_more = tiết kiệm, ngân sách; learn_skill = học kỹ năng;
follow_up_clients = khách hàng, freelance; review_goals = mục tiêu tài chính. Không giải thích.`;

export const llmAvailable = (env: Env) => !!env.AI && env.INTENT_PROVIDER === 'workers-ai';

export async function classifyIntentLLM(env: Env, maskedPrompt: string): Promise<Intent[] | null> {
  if (!llmAvailable(env)) return null;
  try {
    const call = env.AI!.run(INTENT_MODEL as Parameters<Ai['run']>[0], {
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: maskedPrompt },
      ],
      max_tokens: 120,
      temperature: 0,
    } as never) as Promise<unknown>;
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS));
    const out = await Promise.race([call, timeout]);
    if (!out) return null;
    const text = typeof out === 'object' && out && 'response' in out ? String((out as { response: unknown }).response) : JSON.stringify(out);
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return null;
    const parsed = IntentSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data.intents : null;
  } catch {
    return null;
  }
}
