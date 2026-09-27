import { beforeEach, describe, expect, it } from 'vitest';
import { SECTORS } from '../shared/engine/concentration';
import { hasSqlite, insertUser, openMigratedD1, readMigrations, type TestD1 } from './helpers/sqlite-d1';

const migrations = await readMigrations();
const sqlOf = (prefix: string) => migrations.find((m) => m.name.startsWith(prefix))?.sql ?? '';

describe('migrations — kiểm tra nội dung', () => {
  it('đánh số liên tục 0001..0009', () => {
    expect(migrations.map((m) => m.name.slice(0, 4))).toEqual(['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009']);
  });

  it('0008 có trigger chặn UPDATE / DELETE và chuỗi hash, audit_log không FK', () => {
    const sql = sqlOf('0008');
    expect(sql).toMatch(/CREATE TRIGGER audit_log_no_update\s+BEFORE UPDATE ON audit_log/);
    expect(sql).toMatch(/CREATE TRIGGER audit_log_no_delete\s+BEFORE DELETE ON audit_log\s+WHEN OLD\.user_id NOT IN \(SELECT user_id FROM erasure_requests\)/);
    expect(sql).toMatch(/CREATE TRIGGER audit_log_chain\s+BEFORE INSERT ON audit_log/);
    const auditTable = sql.slice(sql.indexOf('CREATE TABLE audit_log'), sql.indexOf('CREATE INDEX idx_audit_user_at'));
    expect(auditTable).not.toMatch(/REFERENCES/);
  });

  it('CHECK ngành trong 0009 khớp SECTORS của engine', () => {
    const sql = sqlOf('0009');
    for (const s of SECTORS) expect(sql).toContain(`'${s}'`);
    const list = sql.match(/sector IN \(([^)]+)\)/)![1];
    expect(list.split(',').map((x) => x.trim().replace(/'/g, ''))).toEqual(SECTORS);
  });
});

const hasDb = await hasSqlite();

describe.skipIf(!hasDb)('migrations — chạy thật trên SQLite', () => {
  let t: TestD1;
  beforeEach(async () => {
    t = (await openMigratedD1())!;
    insertUser(t.raw, 'u1');
  });

  it('cột mới có giá trị mặc định đúng', () => {
    t.raw.prepare("INSERT INTO holdings (id, user_id, name, category, value, role, volatility, risk_group) VALUES ('h1', 'u1', 'Quỹ', 'fund', 1, 'x', 'mid', 'g')").run();
    expect({ ...t.raw.prepare('SELECT sector, is_employer_stock FROM holdings').get() }).toEqual({ sector: 'other', is_employer_stock: 0 });
    t.raw.prepare("INSERT INTO financial_profiles (user_id) VALUES ('u1')").run();
    expect(t.raw.prepare('SELECT retirement_age AS r FROM financial_profiles').get().r).toBe(60);
    t.raw.prepare("INSERT INTO net_worth_snapshots (user_id, month, total, emergency, invested, cashflow) VALUES ('u1', '2026-09', 1, 1, 1, 1)").run();
    expect({ ...t.raw.prepare('SELECT cash, other, debt FROM net_worth_snapshots').get() }).toEqual({ cash: 0, other: 0, debt: 0 });
  });

  it('CHECK chặn giá trị sai', () => {
    expect(() => t.raw.prepare("INSERT INTO holdings (id, user_id, name, category, value, role, volatility, risk_group, sector) VALUES ('h1', 'u1', 'x', 'fund', 1, 'x', 'mid', 'g', 'crypto')").run()).toThrow();
    expect(() => t.raw.prepare("INSERT INTO goals (id, user_id, kind, title, target_amount, target_month, horizon) VALUES ('g1', 'u1', 'custom', 'x', 1, '2027-01', 'forever')").run()).toThrow();
    expect(() => t.raw.prepare("INSERT INTO liabilities (id, user_id, name, kind) VALUES ('l1', 'u1', 'x', 'loan_shark')").run()).toThrow();
    expect(() =>
      t.raw.prepare("INSERT INTO agent_actions (id, user_id, type, title, payload_json, expires_at, status) VALUES ('a1', 'u1', 't', 'x', '{}', 'z', 'maybe')").run(),
    ).toThrow();
    expect(() =>
      t.raw.prepare("INSERT INTO agent_actions (id, user_id, type, title, payload_json, expires_at, integration) VALUES ('a1', 'u1', 't', 'x', '{}', 'z', 'slack')").run(),
    ).toThrow();
    expect(() => t.raw.prepare("INSERT INTO audit_log (id, user_id, at, actor, action, summary_masked, status, row_hash) VALUES ('x', 'u1', 'z', 'robot', 'a', 's', 'completed', 'h')").run()).toThrow();
  });

  it('xóa user cascade agent_runs / steps / actions / idempotency_keys / liabilities', () => {
    t.raw.exec(`
      INSERT INTO agent_runs (id, user_id, prompt_masked) VALUES ('r1', 'u1', 'p');
      INSERT INTO agent_steps (id, run_id, user_id, idx, agent, kind, title) VALUES ('s1', 'r1', 'u1', 0, 'planner', 'plan', 't');
      INSERT INTO agent_actions (id, user_id, run_id, type, title, payload_json, expires_at) VALUES ('a1', 'u1', 'r1', 't', 'x', '{}', 'z');
      INSERT INTO idempotency_keys (user_id, key, request_hash, created_at, expires_at) VALUES ('u1', 'k', 'h', 'a', 'b');
      INSERT INTO liabilities (id, user_id, name, kind) VALUES ('l1', 'u1', 'Vay', 'mortgage');
    `);
    const a = t.raw.prepare("SELECT status, integration, risk, requires_approval FROM agent_actions WHERE id = 'a1'").get();
    expect({ ...a }).toEqual({ status: 'pending', integration: 'local', risk: 'low', requires_approval: 1 });
    t.raw.prepare("DELETE FROM users WHERE id = 'u1'").run();
    for (const table of ['agent_runs', 'agent_steps', 'agent_actions', 'idempotency_keys', 'liabilities']) {
      expect(t.raw.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, table).toBe(0);
    }
  });
});
