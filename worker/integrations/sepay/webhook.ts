// Webhook SePay → giao dịch trong sổ thu chi.
// SePay gọi POST /api/webhooks/sepay với header `Authorization: Apikey <SEPAY_WEBHOOK_KEY>`.
// Chống trùng: bank_webhook_events UNIQUE(provider, external_id) — external_id = referenceCode hoặc id.
// Khớp người dùng: hash số tài khoản nhận (bank_accounts.account_hash) — không lưu số tài khoản đầy đủ.

import { z } from 'zod';
import { sha256Hex, timingSafeEqual } from '../../lib/crypto';
import { writeAudit } from '../../lib/audit';

export const sepayPayload = z.object({
  id: z.union([z.number(), z.string()]),
  gateway: z.string().max(60),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'transactionDate không hợp lệ'),
  accountNumber: z.string().regex(/^[\d\s-]{4,30}$/, 'accountNumber không hợp lệ'),
  code: z.string().nullish(),
  content: z.string().max(500).default(''),
  transferType: z.enum(['in', 'out']),
  transferAmount: z.number().int().positive().max(10_000_000_000_000),
  accumulated: z.number().nullish(),
  subAccount: z.string().nullish(),
  referenceCode: z.string().max(80).nullish(),
  description: z.string().max(1000).nullish(),
});
export type SepayPayload = z.infer<typeof sepayPayload>;

export const digitsOnly = (s: string) => s.replace(/\D/g, '');
/** Hash số tài khoản để khớp webhook mà không lưu số đầy đủ. */
export const accountHash = (accountNumber: string) => sha256Hex(`antam-bank:${digitsOnly(accountNumber)}`);
export const maskAccount = (accountNumber: string) => `•••• ${digitsOnly(accountNumber).slice(-4)}`;

/** Kiểm tra header `Authorization: Apikey <key>` (so sánh thời gian hằng). */
export function sepayAuthorized(header: string | undefined, key: string | undefined): boolean {
  if (!key || !header) return false;
  const m = /^Apikey\s+(.+)$/i.exec(header.trim());
  return !!m && timingSafeEqual(m[1].trim(), key);
}

/** Bỏ dấu tiếng Việt, về chữ thường — để dò từ khóa trong nội dung chuyển khoản. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

const RULES: [RegExp, string][] = [
  [/\b(grab|gojek|xang|petrolimex|gui xe|vetc|taxi|xanh sm)\b/, 'transport'],
  [/\b(an trua|an toi|com|pho|bun|cafe|ca phe|highlands|starbucks|tra sua|baemin|shopeefood|circle k|winmart|bach hoa|sieu thi|di cho)\b/, 'food'],
  [/\b(tien nha|thue nha|dien|nuoc|evn|internet|fpt|viettel|vnpt)\b/, 'housing'],
  [/\b(shopee|lazada|tiki|mua sam|uniqlo)\b/, 'shopping'],
  [/\b(benh vien|nha thuoc|pharmacity|long chau|kham|bao hiem)\b/, 'health'],
  [/\b(cgv|netflix|spotify|phim|game|du lich)\b/, 'entertainment'],
  [/\b(hoc phi|truong|mam non)\b/, 'children'],
];

/** Tự đoán danh mục từ nội dung chuyển khoản. */
export function autoCategory(kind: 'income' | 'expense', content: string): string {
  const t = fold(content);
  if (kind === 'income') {
    if (/\b(luong|salary)\b/.test(t)) return 'salary';
    if (/\b(thuong|bonus)\b/.test(t)) return 'bonus';
    if (/\b(lai|co tuc|dividend)\b/.test(t)) return 'invest_income';
    if (/\b(freelance|du an|thiet ke|job)\b/.test(t)) return 'freelance';
    return 'other_income';
  }
  return RULES.find(([re]) => re.test(t))?.[1] ?? 'other_expense';
}

export type WebhookResult = { status: 'created'; transactionId: string; userId: string } | { status: 'duplicate' } | { status: 'unmatched' };

/**
 * Ghi sự kiện (chống trùng) → nếu khớp tài khoản đã liên kết thì thêm giao dịch (source 'sepay', external_id)
 * và một dòng nhật ký. Không chạy lại engine ở đây — caller gọi afterChange khi có userId.
 */
export async function handleSepayEvent(env: { DB: D1Database; AUDIT_HASH_SALT?: string }, p: SepayPayload): Promise<WebhookResult> {
  const db = env.DB;
  const externalId = (p.referenceCode || '').trim() || `id:${p.id}`;
  const bank = await db
    .prepare("SELECT id, user_id FROM bank_accounts WHERE account_hash = ? AND status != 'revoked' ORDER BY created_at DESC LIMIT 1")
    .bind(await accountHash(p.accountNumber))
    .first<{ id: string; user_id: string }>();

  // Lưu payload đã bỏ số tài khoản đầy đủ
  const stored = JSON.stringify({ ...p, accountNumber: maskAccount(p.accountNumber) });
  const ins = await db
    .prepare("INSERT OR IGNORE INTO bank_webhook_events (id, provider, external_id, user_id, payload_json) VALUES (?, 'sepay', ?, ?, ?)")
    .bind(crypto.randomUUID(), externalId, bank?.user_id ?? null, stored)
    .run();
  if (!ins.meta.changes) return { status: 'duplicate' };
  if (!bank) return { status: 'unmatched' };

  const kind = p.transferType === 'in' ? 'income' : 'expense';
  const category = autoCategory(kind, p.content);
  const occurredOn = p.transactionDate.slice(0, 10);
  const note = (p.content || p.description || `Giao dịch ${p.gateway}`).trim().slice(0, 120);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO transactions (id, user_id, kind, amount, category, note, occurred_on, source, external_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'sepay', ?)")
      .bind(id, bank.user_id, kind, p.transferAmount, category, note, occurredOn, `sepay:${externalId}`),
    db.prepare('UPDATE bank_accounts SET last_event_at = ? WHERE id = ?').bind(now, bank.id),
  ]);
  await writeAudit(
    db,
    {
      userId: bank.user_id, actor: 'webhook', agent: 'bank', action: 'bank.transaction', entityType: 'transaction', entityId: id,
      summaryMasked: `Nhận giao dịch ${kind === 'income' ? 'tiền vào' : 'tiền ra'} từ ${p.gateway}, tự xếp vào danh mục`,
      dataLabel: 'Dữ liệu giao dịch (đã ẩn danh)', status: 'completed', approver: 'auto',
    },
    { salt: env.AUDIT_HASH_SALT },
  );
  return { status: 'created', transactionId: id, userId: bank.user_id };
}
