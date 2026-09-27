// D1 giả lập bằng node:sqlite (Node ≥ 22.5) — chạy thật migrations, trigger, CHECK, FK.
// Nếu runtime không có node:sqlite, `openMigratedD1()` trả về null để test tự skip.

/* eslint-disable @typescript-eslint/no-explicit-any */

const dyn = (name: string): Promise<any> => import(/* @vite-ignore */ name);

let sqliteMod: any | null | undefined;
async function sqlite(): Promise<any | null> {
  if (sqliteMod === undefined) {
    try {
      sqliteMod = await dyn('node:sqlite');
    } catch {
      sqliteMod = null;
    }
  }
  return sqliteMod;
}

export const hasSqlite = async (): Promise<boolean> => (await sqlite()) !== null;

/** Đọc toàn bộ migrations/*.sql theo thứ tự tên file. */
export async function readMigrations(): Promise<{ name: string; sql: string }[]> {
  const fs = await dyn('node:fs');
  const dir = new URL('../../migrations/', (import.meta as unknown as { url: string }).url);
  const names: string[] = fs.readdirSync(dir).filter((n: string) => n.endsWith('.sql')).sort();
  return names.map((name) => ({ name, sql: fs.readFileSync(new URL(name, dir), 'utf8') as string }));
}

const plain = (row: any) => (row ? { ...row } : null);
const returnsRows = (sql: string) => /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);

class Stmt {
  constructor(
    private readonly db: any,
    private readonly sql: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...params: unknown[]) {
    return new Stmt(this.db, this.sql, params);
  }

  async first<T>(col?: string): Promise<T | null> {
    const row = plain(this.db.prepare(this.sql).get(...this.params));
    return (row && col ? row[col] : row) as T | null;
  }

  async all<T>() {
    return this.exec() as { results: T[]; success: true; meta: any };
  }

  async run() {
    return this.exec();
  }

  exec() {
    const stmt = this.db.prepare(this.sql);
    if (returnsRows(this.sql)) return { results: stmt.all(...this.params).map(plain), success: true, meta: { changes: 0 } };
    const r = stmt.run(...this.params);
    return { results: [], success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
}

export interface TestD1 {
  d1: D1Database;
  raw: any;
}

/** DB trong bộ nhớ đã chạy mọi migration; null nếu không có node:sqlite. */
export async function openMigratedD1(): Promise<TestD1 | null> {
  const mod = await sqlite();
  if (!mod) return null;
  const raw = new mod.DatabaseSync(':memory:');
  for (const { sql } of await readMigrations()) raw.exec(sql);
  const d1 = {
    prepare: (sql: string) => new Stmt(raw, sql),
    batch: async (stmts: Stmt[]) => {
      raw.exec('BEGIN');
      try {
        const out = stmts.map((s) => s.exec());
        raw.exec('COMMIT');
        return out;
      } catch (err) {
        raw.exec('ROLLBACK');
        throw err;
      }
    },
    exec: async (sql: string) => {
      raw.exec(sql);
      return { count: 0, duration: 0 };
    },
  } as unknown as D1Database;
  return { d1, raw };
}

export function insertUser(raw: any, id = 'u1'): string {
  raw.prepare("INSERT INTO users (id, email, password_hash, password_salt, full_name) VALUES (?, ?, 'h', 's', 'Test')").run(id, `${id}@example.com`);
  return id;
}
