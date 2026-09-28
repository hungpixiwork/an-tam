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

/** Mã xác thực chủ tài khoản: "AT" + 6 ký tự chữ in hoa/số (ngẫu nhiên an toàn). */
export function newVerifyCode(): string {
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ 0/O, 1/I để dễ gõ — 32 ký tự nên chia hết 256, không lệch
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `AT${[...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')}`;
}

/** Nội dung chuyển khoản có chứa mã không (không phân biệt hoa thường, bỏ khoảng trắng). */
export const hasVerifyCode = (content: string, code: string) => {
  const squash = (s: string) => s.replace(/\s+/g, '').toUpperCase();
  return squash(content).includes(squash(code));
};

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

export type WebhookResult =
  | { status: 'created'; transactionId: string; userId: string }
  | { status: 'duplicate' }
  | { status: 'unmatched' }
  | { status: 'pending_verification' };

/**
 * Ghi sự kiện (chống trùng) → nếu khớp tài khoản đã liên kết thì thêm giao dịch (source 'sepay', external_id)
 * và một dòng nhật ký. Không chạy lại engine ở đây — caller gọi afterChange khi có userId.
 */
export async function handleSepayEvent(env: { DB: D1Database; AUDIT_HASH_SALT?: string }, p: SepayPayload): Promise<WebhookResult> {
  const db = env.DB;
  const externalId = (p.referenceCode || '').trim() || `id:${p.id}`;
  const bank = await db
    .prepare("SELECT id, user_id, status, verify_code FROM bank_accounts WHERE account_hash = ? AND status != 'revoked' ORDER BY created_at DESC LIMIT 1")
    .bind(await accountHash(p.accountNumber))
    .first<{ id: string; user_id: string; status: string; verify_code: string | null }>();

  // Lưu payload đã bỏ số tài khoản đầy đủ
  const stored = JSON.stringify({ ...p, accountNumber: maskAccount(p.accountNumber) });
  let eventId: string = crypto.randomUUID();
  const ins = await db
    .prepare("INSERT OR IGNORE INTO bank_webhook_events (id, provider, external_id, user_id, payload_json) VALUES (?, 'sepay', ?, ?, ?)")
    .bind(eventId, externalId, bank?.user_id ?? null, stored)
    .run();
  if (!ins.meta.changes) {
    // Trùng: nếu lần trước chưa khớp được ai (liên kết sau khi SePay gửi) mà giờ đã khớp → gán lại và ghi giao dịch.
    // Giao dịch vẫn không bị nhân đôi nhờ INSERT OR IGNORE + idx_transactions_external.
    const prev = await db
      .prepare("SELECT id, user_id FROM bank_webhook_events WHERE provider = 'sepay' AND external_id = ?")
      .bind(externalId)
      .first<{ id: string; user_id: string | null }>();
    if (!prev || prev.user_id !== null || !bank) return { status: 'duplicate' };
    const claimed = await db.prepare('UPDATE bank_webhook_events SET user_id = ? WHERE id = ? AND user_id IS NULL').bind(bank.user_id, prev.id).run();
    if (!claimed.meta.changes) return { status: 'duplicate' };
    eventId = prev.id;
  }
  if (!bank) return { status: 'unmatched' };

  // Giao dịch xác thực: nội dung chứa mã của tài khoản đang chờ → ghi nhận để POST /sepay/verify cho kích hoạt.
  if (bank.status === 'pending' && bank.verify_code && hasVerifyCode(`${p.content} ${p.description ?? ''}`, bank.verify_code)) {
    await db.prepare('UPDATE bank_accounts SET verified_by_event_id = ? WHERE id = ? AND verified_by_event_id IS NULL').bind(eventId, bank.id).run();
  }

  // Tài khoản chưa xác thực: chỉ giữ sự kiện, chưa ghi vào sổ (tránh người khai nhầm/giả nhận giao dịch của người khác).
  // Xác thực xong, replayPendingEvents ghi bù.
  if (bank.status !== 'active') return { status: 'pending_verification' };
  return recordTransaction(env, bank, p, externalId);
}

/** Ghi 1 giao dịch SePay vào sổ thu chi (chống trùng theo external_id) + nhật ký. */
async function recordTransaction(
  env: { DB: D1Database; AUDIT_HASH_SALT?: string },
  bank: { id: string; user_id: string },
  p: SepayPayload,
  externalId: string,
): Promise<WebhookResult> {
  const db = env.DB;
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

/**
 * Sau khi tài khoản được xác thực: ghi bù các giao dịch nhận trong lúc chờ (chỉ sự kiện của đúng người này,
 * nhận sau khi liên kết). Trả về số giao dịch được ghi.
 */
export async function replayPendingEvents(
  env: { DB: D1Database; AUDIT_HASH_SALT?: string },
  bank: { id: string; user_id: string; created_at: string },
): Promise<number> {
  const rows = await env.DB
    .prepare("SELECT external_id, payload_json FROM bank_webhook_events WHERE provider = 'sepay' AND user_id = ? AND received_at >= ? AND payload_json != '{}' ORDER BY received_at")
    .bind(bank.user_id, bank.created_at)
    .all<{ external_id: string; payload_json: string }>();
  let created = 0;
  for (const r of rows.results) {
    // Payload lưu đã che số tài khoản → thay bằng giá trị hợp lệ (tài khoản đã biết qua bank).
    const parsed = sepayPayload.safeParse({ ...JSON.parse(r.payload_json), accountNumber: '0000' });
    if (!parsed.success) continue;
    if ((await recordTransaction(env, bank, parsed.data, r.external_id)).status === 'created') created++;
  }
  return created;
}
