-- AI Workspace + nhật ký kiểm toán + chống bấm trùng.
-- Luồng: agent đề xuất (agent_actions 'pending') → người dùng duyệt (Idempotency-Key) → thực thi → audit_log.

-- ───────────── Nhật ký kiểm toán (append-only, chuỗi hash) ─────────────
-- user_id KHÔNG có FK: xóa tài khoản không cascade vào đây. Chỉ xóa được khi user có trong erasure_requests.
CREATE TABLE erasure_requests (
  user_id       TEXT PRIMARY KEY,
  requested_at  TEXT NOT NULL
);

CREATE TABLE audit_log (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  at              TEXT NOT NULL,             -- ISO-8601 UTC
  actor           TEXT NOT NULL CHECK (actor IN ('user', 'agent', 'system', 'mcp', 'webhook')),
  agent           TEXT,                      -- planner, calendar, cashflow, skill, goal...
  action          TEXT NOT NULL,             -- 'action.approve', 'calendar.create_event'...
  entity_type     TEXT,
  entity_id       TEXT,
  summary_masked  TEXT NOT NULL,             -- đã che số tiền / PII
  data_label      TEXT,                      -- "Dữ liệu giao dịch (đã ẩn danh)"
  status          TEXT NOT NULL CHECK (status IN ('completed', 'approved', 'rejected', 'failed')),
  approver        TEXT CHECK (approver IS NULL OR approver IN ('auto', 'user')),
  run_id          TEXT,
  action_id       TEXT,
  prev_hash       TEXT,                      -- row_hash của dòng trước cùng user (NULL = dòng đầu)
  row_hash        TEXT NOT NULL              -- sha256(prev_hash | canonical JSON) — worker/lib/audit.ts
);
CREATE INDEX idx_audit_user_at ON audit_log(user_id, at DESC);
CREATE INDEX idx_audit_user_agent ON audit_log(user_id, agent, at DESC);

-- Chuỗi hash tuyến tính theo user: prev_hash phải đúng bằng row_hash của dòng mới nhất (theo rowid).
-- Hai request ghi đồng thời với cùng prev_hash → request sau bị ABORT (cả batch rollback), caller thử lại.
CREATE TRIGGER audit_log_chain
BEFORE INSERT ON audit_log
WHEN NEW.prev_hash IS NOT (SELECT row_hash FROM audit_log WHERE user_id = NEW.user_id ORDER BY rowid DESC LIMIT 1)
BEGIN
  SELECT RAISE(ABORT, 'audit_log chain conflict');
END;

CREATE TRIGGER audit_log_no_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

CREATE TRIGGER audit_log_no_delete
BEFORE DELETE ON audit_log
WHEN OLD.user_id NOT IN (SELECT user_id FROM erasure_requests)
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

-- ───────────── Chống bấm trùng (Idempotency-Key) ─────────────
CREATE TABLE idempotency_keys (
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key            TEXT NOT NULL,
  request_hash   TEXT NOT NULL,              -- sha256(method path body)
  status         TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'done')),
  status_code    INTEGER,
  response_json  TEXT,
  created_at     TEXT NOT NULL,
  expires_at     TEXT NOT NULL,              -- created_at + 24h
  PRIMARY KEY (user_id, key)
);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

-- ───────────── AI Workspace ─────────────
CREATE TABLE agent_runs (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source         TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'mcp', 'automation')),
  prompt_masked  TEXT NOT NULL,              -- lệnh người dùng đã che số
  intent         TEXT,                       -- intent đã phân loại (LLM hoặc luật)
  agents_json    TEXT NOT NULL DEFAULT '[]', -- các agent phối hợp
  status         TEXT NOT NULL DEFAULT 'running'
                 CHECK (status IN ('running', 'awaiting_approval', 'completed', 'failed', 'cancelled')),
  error          TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at   TEXT
);
CREATE INDEX idx_agent_runs_user ON agent_runs(user_id, created_at DESC);

CREATE TABLE agent_steps (
  id             TEXT PRIMARY KEY,
  run_id         TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idx            INTEGER NOT NULL,           -- thứ tự trong timeline
  agent          TEXT NOT NULL,
  kind           TEXT NOT NULL CHECK (kind IN ('plan', 'tool', 'propose', 'note', 'error')),
  title          TEXT NOT NULL,
  detail_masked  TEXT,
  status         TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('pending', 'running', 'done', 'failed', 'skipped')),
  started_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  finished_at    TEXT,
  UNIQUE (run_id, idx)
);
CREATE INDEX idx_agent_steps_user ON agent_steps(user_id);

-- pending → approved → executing → done | failed; hoặc rejected | changes_requested | expired (24h)
CREATE TABLE agent_actions (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_id             TEXT REFERENCES agent_runs(id) ON DELETE SET NULL,
  source             TEXT NOT NULL DEFAULT 'agent' CHECK (source IN ('agent', 'mcp', 'automation', 'user')),
  agent              TEXT,
  type               TEXT NOT NULL,          -- khóa trong ACTION_TYPES (shared/agent/actions.ts)
  title              TEXT NOT NULL,
  payload_json       TEXT NOT NULL,
  preview_json       TEXT,                   -- trước / sau để hiển thị khi duyệt
  integration        TEXT NOT NULL DEFAULT 'local'
                     CHECK (integration IN ('local', 'google_calendar', 'google_sheets', 'gmail', 'notion')),
  risk               TEXT NOT NULL DEFAULT 'low' CHECK (risk IN ('low', 'mid', 'high')),
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'executing', 'done', 'rejected', 'changes_requested', 'failed', 'expired')),
  requires_approval  INTEGER NOT NULL DEFAULT 1,
  approver           TEXT CHECK (approver IS NULL OR approver IN ('auto', 'user')),
  note               TEXT,                   -- ghi chú khi "Yêu cầu điều chỉnh"
  result_json        TEXT,
  error              TEXT,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at         TEXT NOT NULL,
  decided_at         TEXT,
  executed_at        TEXT
);
CREATE INDEX idx_agent_actions_user_status ON agent_actions(user_id, status, created_at DESC);
CREATE INDEX idx_agent_actions_run ON agent_actions(run_id);
CREATE INDEX idx_agent_actions_expiry ON agent_actions(status, expires_at);
