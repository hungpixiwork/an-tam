import { beforeEach, describe, expect, it } from 'vitest';
import type { AuditEntry } from '../shared/types/api';
import { auditStmt, auditStmts, batchWithAudit, lastAuditHash, maskSummary, verifyAuditChain, writeAudit, type AuditRow } from '../worker/lib/audit';
import { hasSqlite, insertUser, openMigratedD1, type TestD1 } from './helpers/sqlite-d1';

const entry = (over: Partial<AuditEntry> = {}): AuditEntry => ({
  userId: 'u1',
  actor: 'agent',
  agent: 'calendar',
  action: 'calendar.create_event',
  summaryMasked: 'Tạo lịch "Ôn tập tài chính"',
  dataLabel: 'Dữ liệu lịch (đã ẩn danh)',
  status: 'approved',
  approver: 'user',
  ...over,
});

describe('maskSummary', () => {
  it('che số tiền, con số và email', () => {
    expect(maskSummary('Chuyển 1.500.000đ vào quỹ, còn 3 tháng')).toBe('Chuyển [số tiền] vào quỹ, còn [số] tháng');
    expect(maskSummary('Chi 2,5 triệu cho ăn uống')).toBe('Chi [số tiền] cho ăn uống');
    expect(maskSummary('Gửi email tới minh.nguyen@example.com lúc 9h')).toBe('Gửi email tới [email] lúc [số]h');
    expect(maskSummary('Mua ¥1200 và $50')).toBe('Mua [số tiền] và [số tiền]');
    expect(maskSummary('5 trong số đó')).toBe('[số] trong số đó');
    expect(maskSummary('Không có số')).toBe('Không có số');
  });
});

const hasDb = await hasSqlite();

describe.skipIf(!hasDb)('audit_log — chuỗi hash + append-only (node:sqlite)', () => {
  let t: TestD1;
  const rows = (userId = 'u1') => t.raw.prepare('SELECT * FROM audit_log WHERE user_id = ? ORDER BY rowid').all(userId).map((r: object) => ({ ...r })) as AuditRow[];

  beforeEach(async () => {
    t = (await openMigratedD1())!;
    insertUser(t.raw, 'u1');
    insertUser(t.raw, 'u2');
  });

  it('writeAudit nối chuỗi: prev_hash = row_hash dòng trước, verify ok', async () => {
    await writeAudit(t.d1, entry());
    await writeAudit(t.d1, entry({ status: 'completed', approver: null }));
    await writeAudit(t.d1, entry({ userId: 'u2' }));
    await writeAudit(t.d1, entry({ actor: 'user', agent: null, action: 'action.reject', status: 'rejected' }));
    const r = rows();
    expect(r).toHaveLength(3);
    expect(r[0].prev_hash).toBeNull();
    expect(r[1].prev_hash).toBe(r[0].row_hash);
    expect(r[2].prev_hash).toBe(r[1].row_hash);
    expect(await lastAuditHash(t.d1, 'u1')).toBe(r[2].row_hash);
    expect(await verifyAuditChain(r)).toEqual({ ok: true, brokenAt: null });
    expect(rows('u2')[0].prev_hash).toBeNull(); // chuỗi riêng từng user
  });

  it('verifyAuditChain phát hiện dòng bị sửa', async () => {
    await writeAudit(t.d1, entry());
    await writeAudit(t.d1, entry());
    const r = rows();
    r[0] = { ...r[0], summary_masked: 'đã bị sửa' };
    expect((await verifyAuditChain(r)).brokenAt).toBe(r[0].id);
  });

  it('salt → HMAC, hash khác SHA-256 thường và verify cần đúng salt', async () => {
    await writeAudit(t.d1, entry({ id: 'a1', at: '2026-09-27T00:00:00.000Z' }), { salt: 's3cret' });
    await writeAudit(t.d1, entry({ userId: 'u2', id: 'a2', at: '2026-09-27T00:00:00.000Z' }));
    const salted = rows();
    expect(await verifyAuditChain(salted, { salt: 's3cret' })).toEqual({ ok: true, brokenAt: null });
    expect((await verifyAuditChain(salted)).ok).toBe(false);
  });

  it('auditStmts nhiều dòng trong một batch nối chuỗi đúng', async () => {
    await writeAudit(t.d1, entry());
    await t.d1.batch(await auditStmts(t.d1, [entry(), entry({ userId: 'u2' }), entry()]));
    const r = rows();
    expect(r).toHaveLength(3);
    expect(await verifyAuditChain(r)).toEqual({ ok: true, brokenAt: null });
  });

  it('ghi đồng thời với prev_hash cũ → trigger ABORT, lệnh ghi đi kèm cũng rollback', async () => {
    const stale = await auditStmt(t.d1, entry());
    await writeAudit(t.d1, entry()); // request khác ghi trước
    const sideEffect = t.d1.prepare("INSERT INTO liabilities (id, user_id, name, kind) VALUES ('l1', 'u1', 'Vay', 'other')");
    await expect(t.d1.batch([sideEffect, stale])).rejects.toThrow(/chain conflict/);
    expect(t.raw.prepare('SELECT COUNT(*) AS n FROM liabilities').get().n).toBe(0);
    expect(rows()).toHaveLength(1);
  });

  it('batchWithAudit tự thử lại khi chain conflict', async () => {
    let raced = false;
    const racingDb = {
      ...t.d1,
      prepare: t.d1.prepare.bind(t.d1),
      batch: async (stmts: D1PreparedStatement[]) => {
        if (!raced) {
          raced = true;
          await writeAudit(t.d1, entry({ action: 'race' })); // chen vào giữa lúc đọc prev và lúc ghi
        }
        return t.d1.batch(stmts);
      },
    } as unknown as D1Database;
    await batchWithAudit(racingDb, [t.d1.prepare("INSERT INTO liabilities (id, user_id, name, kind) VALUES ('l1', 'u1', 'Vay', 'other')")], entry());
    const r = rows();
    expect(r.map((x) => x.action)).toEqual(['race', 'calendar.create_event']);
    expect(await verifyAuditChain(r)).toEqual({ ok: true, brokenAt: null });
    expect(t.raw.prepare('SELECT COUNT(*) AS n FROM liabilities').get().n).toBe(1);
  });

  it('UPDATE bị chặn; DELETE bị chặn trừ khi user có erasure_requests', async () => {
    await writeAudit(t.d1, entry());
    expect(() => t.raw.prepare("UPDATE audit_log SET summary_masked = 'x'").run()).toThrow(/append-only/);
    expect(() => t.raw.prepare("DELETE FROM audit_log WHERE user_id = 'u1'").run()).toThrow(/append-only/);
    t.raw.prepare("INSERT INTO erasure_requests (user_id, requested_at) VALUES ('u1', '2026-09-27T00:00:00Z')").run();
    t.raw.prepare("DELETE FROM audit_log WHERE user_id = 'u1'").run();
    expect(rows()).toHaveLength(0);
  });

  it('xóa user không cascade vào audit_log (không FK)', async () => {
    await writeAudit(t.d1, entry());
    t.raw.prepare("DELETE FROM users WHERE id = 'u1'").run();
    expect(rows()).toHaveLength(1);
  });
});
