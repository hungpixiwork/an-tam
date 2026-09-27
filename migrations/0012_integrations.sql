-- Tích hợp bên ngoài (Google Calendar trước; Notion / ngân hàng dùng chung bảng).
-- Token lưu đã mã hóa AES-256-GCM (worker/lib/crypto.ts, AAD = user_id:provider).

CREATE TABLE integrations (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider           TEXT NOT NULL CHECK (provider IN ('google', 'notion', 'sepay')),
  status             TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'error', 'revoked')),
  account_email      TEXT,
  scopes             TEXT NOT NULL DEFAULT '',
  access_token_enc   TEXT,
  refresh_token_enc  TEXT,
  token_expires_at   TEXT,                   -- ISO UTC
  meta_json          TEXT NOT NULL DEFAULT '{}', -- calendarId (lịch "An Tâm"), syncToken…
  last_synced_at     TEXT,
  last_error         TEXT,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, provider)
);

-- PKCE: state → code_verifier, hết hạn sau 10 phút, dùng một lần.
CREATE TABLE oauth_states (
  state          TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider       TEXT NOT NULL,
  code_verifier  TEXT NOT NULL,
  return_to      TEXT NOT NULL DEFAULT '/lich-ai',
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at     TEXT NOT NULL
);
CREATE INDEX idx_oauth_states_expires ON oauth_states(expires_at);

CREATE TABLE bank_accounts (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL DEFAULT 'sepay',
  bank_code       TEXT NOT NULL,
  account_masked  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE bank_webhook_events (
  id            TEXT PRIMARY KEY,
  provider      TEXT NOT NULL DEFAULT 'sepay',
  external_id   TEXT NOT NULL,
  user_id       TEXT,
  payload_json  TEXT NOT NULL,
  received_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (provider, external_id)
);
