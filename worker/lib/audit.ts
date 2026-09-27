// Nhật ký kiểm toán append-only có chuỗi hash theo từng user.
//
// row_hash = H(prev_hash + '|' + canonical JSON)   H = HMAC-SHA256(AUDIT_HASH_SALT) nếu có salt, ngược lại SHA-256.
//
// Tính đúng dưới D1 batch: D1 không có hàm sha256 trong SQL nên hash phải tính ở worker, nghĩa là
// prev_hash được đọc TRƯỚC khi batch chạy. Để hai request đồng thời không tạo ra chuỗi rẽ nhánh,
// trigger `audit_log_chain` (migrations/0008) ABORT mọi INSERT có prev_hash khác row_hash mới nhất của user.
// Mỗi batch D1 là một transaction → dòng audit và lệnh ghi mà nó mô tả cùng rollback; caller đọc lại
// prev_hash rồi thử lại (`batchWithAudit` / `writeAudit` tự làm việc này).

import type { AuditEntry } from '../../shared/types/api';
import { hmacSha256Hex, sha256Hex } from './crypto';

export interface AuditOptions {
  /** env.AUDIT_HASH_SALT — nếu có thì dùng HMAC để hash không tự tính lại được khi chỉ có quyền đọc DB. */
  salt?: string;
}

/** Dòng audit đầy đủ (đã điền id / at / null) — đúng thứ tự cột dùng để hash. */
export interface AuditRow {
  id: string;
  user_id: string;
  at: string;
  actor: string;
  agent: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  summary_masked: string;
  data_label: string | null;
  status: string;
  approver: string | null;
  run_id: string | null;
  action_id: string | null;
  prev_hash: string | null;
  row_hash: string;
}

type HashedFields = Omit<AuditRow, 'prev_hash' | 'row_hash'>;

const toFields = (e: AuditEntry): HashedFields => ({
  id: e.id ?? crypto.randomUUID(),
  user_id: e.userId,
  at: e.at ?? new Date().toISOString(),
  actor: e.actor,
  agent: e.agent ?? null,
  action: e.action,
  entity_type: e.entityType ?? null,
  entity_id: e.entityId ?? null,
  summary_masked: e.summaryMasked,
  data_label: e.dataLabel ?? null,
  status: e.status,
  approver: e.approver ?? null,
  run_id: e.runId ?? null,
  action_id: e.actionId ?? null,
});

/** JSON mảng theo thứ tự cột cố định — không phụ thuộc thứ tự khóa object. */
export const canonicalAudit = (f: HashedFields): string =>
  JSON.stringify([f.id, f.user_id, f.at, f.actor, f.agent, f.action, f.entity_type, f.entity_id, f.summary_masked, f.data_label, f.status, f.approver, f.run_id, f.action_id]);

export async function auditRowHash(prevHash: string | null, f: HashedFields, salt?: string): Promise<string> {
  const msg = `${prevHash ?? ''}|${canonicalAudit(f)}`;
  return salt ? hmacSha256Hex(salt, msg) : sha256Hex(msg);
}

export async function lastAuditHash(db: D1Database, userId: string): Promise<string | null> {
  const row = await db.prepare('SELECT row_hash FROM audit_log WHERE user_id = ? ORDER BY rowid DESC LIMIT 1').bind(userId).first<{ row_hash: string }>();
  return row?.row_hash ?? null;
}

const INSERT_SQL = `INSERT INTO audit_log
  (id, user_id, at, actor, agent, action, entity_type, entity_id, summary_masked, data_label, status, approver, run_id, action_id, prev_hash, row_hash)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

async function insertStmt(db: D1Database, f: HashedFields, prevHash: string | null, salt?: string) {
  const rowHash = await auditRowHash(prevHash, f, salt);
  const stmt = db.prepare(INSERT_SQL).bind(
    f.id, f.user_id, f.at, f.actor, f.agent, f.action, f.entity_type, f.entity_id,
    f.summary_masked, f.data_label, f.status, f.approver, f.run_id, f.action_id, prevHash, rowHash,
  );
  return { stmt, rowHash };
}

/**
 * Các lệnh INSERT audit (có thể nhiều user) để batch chung với lệnh ghi chúng mô tả.
 * Dòng thứ n của một user nối vào dòng n-1 trong cùng batch. Phải được đưa vào batch
 * SAU mọi lệnh audit khác của cùng user, và không batch hai lần gọi `auditStmts` cho cùng user.
 */
export async function auditStmts(db: D1Database, entries: AuditEntry[], opts: AuditOptions = {}): Promise<D1PreparedStatement[]> {
  const heads = new Map<string, string | null>();
  const out: D1PreparedStatement[] = [];
  for (const e of entries) {
    if (!heads.has(e.userId)) heads.set(e.userId, await lastAuditHash(db, e.userId));
    const { stmt, rowHash } = await insertStmt(db, toFields(e), heads.get(e.userId) ?? null, opts.salt);
    heads.set(e.userId, rowHash);
    out.push(stmt);
  }
  return out;
}

/** Một lệnh INSERT audit — đọc prev_hash hiện tại của user. */
export async function auditStmt(db: D1Database, entry: AuditEntry, opts: AuditOptions = {}): Promise<D1PreparedStatement> {
  const [stmt] = await auditStmts(db, [entry], opts);
  return stmt;
}

export const isChainConflict = (err: unknown): boolean => err instanceof Error && err.message.includes('audit_log chain conflict');

/**
 * Chạy `statements` + dòng audit trong một batch (một transaction). Nếu trigger báo chain conflict
 * (có request khác vừa ghi audit cho cùng user), cả batch đã rollback → đọc lại prev_hash và thử lại.
 * `statements` phải an toàn khi chạy lại sau rollback (điều kiện WHERE status = 'pending'... vẫn đúng).
 */
export async function batchWithAudit(
  db: D1Database,
  statements: D1PreparedStatement[],
  entries: AuditEntry | AuditEntry[],
  opts: AuditOptions & { retries?: number } = {},
): Promise<D1Result[]> {
  // Cố định id / at để các lần thử lại ghi cùng một dòng logic
  const fixed = (Array.isArray(entries) ? entries : [entries]).map((e) => ({ ...e, id: e.id ?? crypto.randomUUID(), at: e.at ?? new Date().toISOString() }));
  const retries = opts.retries ?? 3;
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.batch([...statements, ...(await auditStmts(db, fixed, opts))]);
    } catch (err) {
      if (!isChainConflict(err) || attempt >= retries) throw err;
    }
  }
}

/** Ghi riêng một dòng audit (không kèm lệnh ghi nào khác). */
export async function writeAudit(db: D1Database, entry: AuditEntry, opts: AuditOptions & { retries?: number } = {}): Promise<void> {
  await batchWithAudit(db, [], entry, opts);
}

/** Thao tác ghi do chính người dùng làm (sổ thu chi, tài sản, mục tiêu, ngân sách). */
export interface UserWrite {
  agent: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  /** Câu mô tả — sẽ được che số / email trước khi ghi. */
  summary: string;
  dataLabel: string;
}

/** Ghi một dòng nhật ký cho thao tác của người dùng (actor 'user', người duyệt 'user'). */
export async function auditUserWrite(env: { DB: D1Database; AUDIT_HASH_SALT?: string }, userId: string, w: UserWrite): Promise<void> {
  await writeAudit(
    env.DB,
    { userId, actor: 'user', agent: w.agent, action: w.action, entityType: w.entityType, entityId: w.entityId ?? null, summaryMasked: maskSummary(w.summary), dataLabel: w.dataLabel, status: 'completed', approver: 'user' },
    { salt: env.AUDIT_HASH_SALT },
  );
}

/** Kiểm tra chuỗi hash của một user (rows theo thứ tự ghi — ORDER BY rowid). */
export async function verifyAuditChain(rows: AuditRow[], opts: AuditOptions = {}): Promise<{ ok: boolean; brokenAt: string | null }> {
  let prev: string | null = null;
  for (const r of rows) {
    const { prev_hash, row_hash, ...fields } = r;
    if (prev_hash !== prev || row_hash !== (await auditRowHash(prev, fields, opts.salt))) return { ok: false, brokenAt: r.id };
    prev = row_hash;
  }
  return { ok: true, brokenAt: null };
}

// ───────────── Che số liệu ─────────────

const UNIT = String.raw`(?:tỷ|triệu|tr|nghìn|ngàn|k|đồng|đ|₫|vnđ|vnd|usd|cny|yuan|\$|¥)`;
const NUMBER = new RegExp(String.raw`(?:[$¥₫]\s*)?\d(?:[\d.,]*\d)?(?:\s*${UNIT}(?![\p{L}\d]))?`, 'giu');
const EMAIL = /[\p{L}\d._%+-]+@[\p{L}\d.-]+\.[\p{L}]{2,}/giu;

/** Bỏ email, số tiền và mọi con số khỏi văn bản tự do trước khi ghi audit / gửi LLM. */
export function maskSummary(text: string): string {
  return text
    .replace(EMAIL, '[email]')
    .replace(NUMBER, (m) => (/[^\d.,\s]/.test(m) ? '[số tiền]' : '[số]'))
    .replace(/\s{2,}/g, ' ')
    .trim();
}
