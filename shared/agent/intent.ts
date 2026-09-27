// Phân loại ý định từ lệnh ĐÃ CHE (tiếng Việt, có/không dấu). Luật từ khóa là mặc định;
// Workers AI (worker/agents/llm.ts) chỉ được dùng khi có binding và kết quả phải qua `IntentSchema`.

import { z } from 'zod';

export const INTENTS = ['plan_week', 'save_more', 'learn_skill', 'follow_up_clients', 'review_goals'] as const;
export type Intent = (typeof INTENTS)[number];

export const IntentSchema = z.object({ intents: z.array(z.enum(INTENTS)).min(1).max(5) });
export type IntentResult = { intents: Intent[]; source: 'rules' | 'llm' };

/** Bỏ dấu tiếng Việt + chữ thường để so khớp từ khóa. */
export const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();

const RULES: Record<Intent, RegExp> = {
  plan_week: /\b(sap|xep|len) (lich|ke hoach)|\blich (tuan|tuan toi|lam viec)|ke hoach tuan|tuan toi|tuan sau|\bschedule|\bplan\b|week/,
  save_more: /tiet kiem|de danh|chi tieu|ngan sach|bot chi|giam chi|\bsave|saving|budget/,
  learn_skill: /hoc|ky nang|khoa hoc|\bskill|learn|course/,
  follow_up_clients: /khach|freelance|follow|cham soc khach|client|lam them/,
  review_goals: /muc tieu|tien do|\bgoal|quy du phong|mba/,
};

/** Luật: mọi ý định khớp từ khóa. Không khớp gì → lập kế hoạch tuần (mặc định an toàn, chỉ đề xuất). */
export function parseIntentRules(maskedPrompt: string): Intent[] {
  const t = fold(maskedPrompt);
  const out = INTENTS.filter((i) => RULES[i].test(t));
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
