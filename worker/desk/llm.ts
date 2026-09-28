// Gọi Workers AI cho bàn đầu tư: AI chỉ ĐỌC số code đã tính và viết chữ ngắn. Kết quả phải qua zod;
// thiếu binding, hết lượt theo gói, quá giờ, lỗi, JSON sai → null (nơi gọi dùng câu mẫu tất định).

import type { z } from 'zod';
import type { Env } from '../env';
import { consumeAi } from '../lib/usage';

/** Model nhanh: xếp loại tin, hai phe tranh luận. */
export const DESK_QUICK_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
/** Model mạnh hơn cho người tổng hợp (danh mục Workers AI: gpt-oss-120b, nhận `messages`). */
export const DESK_SYNTH_MODEL = '@cf/openai/gpt-oss-120b';

export interface AskOptions {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  timeoutMs?: number;
  /** Có → trừ 1 lượt AI của người này (consumeAi); hết lượt → null. Không có = lần chạy hệ thống (hằng ngày / cảnh báo). */
  userId?: string;
  /** true → không gọi mô hình (hết lượt AI), nơi gọi dùng mẫu tất định. */
  disabled?: boolean;
}

/** Lấy chuỗi trả lời từ các dạng output khác nhau của Workers AI. */
function outputText(out: unknown): string {
  if (typeof out === 'string') return out;
  if (!out || typeof out !== 'object') return '';
  const o = out as Record<string, unknown>;
  if (typeof o.response === 'string') return o.response;
  if (o.response && typeof o.response === 'object') return JSON.stringify(o.response);
  const choices = o.choices as { message?: { content?: unknown } }[] | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  // Dạng Responses API: output[].content[].text
  const items = o.output as { content?: { text?: string }[] }[] | undefined;
  const text = items?.flatMap((i) => i.content ?? []).map((c) => c.text ?? '').join('');
  return text ?? '';
}

export function parseJsonReply<T>(text: string, schema: z.ZodType<T>): T | null {
  const clean = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  const json = clean.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function askJson<T>(env: Env, schema: z.ZodType<T>, opts: AskOptions): Promise<T | null> {
  if (!env.AI || opts.disabled) return null;
  if (opts.userId && !(await consumeAi(env, opts.userId, 'desk')).allowed) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const call = env.AI.run(opts.model as Parameters<Ai['run']>[0], {
      messages: [
        { role: 'system', content: opts.system },
        // Qwen3: tắt chế độ suy nghĩ dài để trả lời nhanh
        { role: 'user', content: opts.model.includes('qwen3') ? `${opts.user}\n/no_think` : opts.user },
      ],
      max_tokens: opts.maxTokens ?? 400,
      temperature: 0.2,
    } as never) as Promise<unknown>;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), opts.timeoutMs ?? 12_000);
    });
    const out = await Promise.race([call, timeout]);
    if (!out) return null;
    return parseJsonReply(outputText(out), schema);
  } catch (e) {
    console.warn(`[desk] AI ${opts.model} lỗi: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
