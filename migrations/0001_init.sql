-- An Tâm AI — schema khởi tạo
-- Quy ước: tiền = INTEGER (VND), tháng = TEXT 'YYYY-MM', thời điểm = TEXT ISO-8601 (UTC).
-- Chỉ số dẫn xuất (điểm an tâm, xác suất đạt mục tiêu...) KHÔNG lưu ở đây — engine tính khi đọc.

PRAGMA foreign_keys = ON;

-- ───────────── Người dùng & phiên đăng nhập ─────────────
CREATE TABLE users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash  TEXT NOT NULL,              -- base64 PBKDF2-SHA256
  password_salt  TEXT NOT NULL,              -- base64, 16 byte
  full_name      TEXT NOT NULL,
  salutation     TEXT NOT NULL DEFAULT 'bạn' CHECK (salutation IN ('anh', 'chị', 'bạn')),
  avatar_seed    INTEGER NOT NULL DEFAULT 1,
  member_status  TEXT NOT NULL DEFAULT 'Thành viên',
  is_demo_data   INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,              -- hex SHA-256 của token trong cookie
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ───────────── Hồ sơ tài chính ─────────────
CREATE TABLE financial_profiles (
  user_id                  TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  monthly_income           INTEGER NOT NULL DEFAULT 0,
  monthly_expense          INTEGER NOT NULL DEFAULT 0,
  emergency_target_months  INTEGER NOT NULL DEFAULT 6,
  risk_self_score          INTEGER NOT NULL DEFAULT 5 CHECK (risk_self_score BETWEEN 0 AND 10)
);

CREATE TABLE holdings (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('cash', 'fund', 'stock', 'bond', 'other')),
  value       INTEGER NOT NULL CHECK (value >= 0),
  role        TEXT NOT NULL,                 -- Tăng trưởng, Ổn định, An toàn, Cân bằng, Dự phòng
  volatility  TEXT NOT NULL CHECK (volatility IN ('low', 'mid', 'high')),
  risk_group  TEXT NOT NULL,                 -- nhóm rủi ro tập trung (màn 06)
  is_main     INTEGER NOT NULL DEFAULT 0,    -- hiển thị ở bảng "Các khoản chính"
  order_idx   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_holdings_user ON holdings(user_id);

-- Ảnh chụp cuối mỗi tháng — dùng cho biểu đồ 12 tháng và % thay đổi
CREATE TABLE net_worth_snapshots (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month      TEXT NOT NULL,
  total      INTEGER NOT NULL,
  emergency  INTEGER NOT NULL,
  invested   INTEGER NOT NULL,
  cashflow   INTEGER NOT NULL,
  PRIMARY KEY (user_id, month)
);

CREATE TABLE goals (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind                  TEXT NOT NULL CHECK (kind IN ('home', 'education', 'retirement', 'emergency', 'custom')),
  title                 TEXT NOT NULL,
  target_amount         INTEGER NOT NULL CHECK (target_amount > 0),
  current_amount        INTEGER NOT NULL DEFAULT 0,
  target_month          TEXT NOT NULL,
  monthly_contribution  INTEGER NOT NULL DEFAULT 0,  -- số tiền người dùng đang để dành / tháng
  priority              INTEGER NOT NULL DEFAULT 2,  -- 1 cao · 2 vừa · 3 thấp
  order_idx             INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_goals_user ON goals(user_id);

-- ───────────── Mô phỏng ─────────────
CREATE TABLE simulation_presets (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  icon         TEXT NOT NULL,
  params_json  TEXT NOT NULL,                -- SimulationParams
  order_idx    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE simulation_runs (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  params_json  TEXT NOT NULL,
  result_json  TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_runs_user ON simulation_runs(user_id, created_at DESC);

-- ───────────── Thói quen ─────────────
CREATE TABLE habit_scenarios (
  id            TEXT PRIMARY KEY,
  prompt        TEXT NOT NULL,
  context       TEXT NOT NULL,
  icon          TEXT NOT NULL,
  options_json  TEXT NOT NULL,               -- [{ key, label, risk }] risk 0..10
  order_idx     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE habit_answers (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id  TEXT NOT NULL REFERENCES habit_scenarios(id) ON DELETE CASCADE,
  choice       TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, scenario_id)
);

-- ───────────── Kế hoạch an toàn ─────────────
CREATE TABLE safety_plans (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('draft', 'applied', 'archived')),
  steps_json  TEXT NOT NULL,
  applied_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_plans_user ON safety_plans(user_id);

CREATE TABLE plan_tasks (
  id        TEXT PRIMARY KEY,
  plan_id   TEXT NOT NULL REFERENCES safety_plans(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  tag       TEXT NOT NULL,                   -- Quan trọng · Nên làm
  done      INTEGER NOT NULL DEFAULT 0,
  order_idx INTEGER NOT NULL DEFAULT 0
);

-- ───────────── AI theo dõi ─────────────
CREATE TABLE ai_events (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('alert', 'simulation', 'reminder', 'analysis')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_events_user ON ai_events(user_id, created_at DESC);

CREATE TABLE ai_alerts (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_key     TEXT NOT NULL,                -- khóa luật trong engine (goal_delay, volatile_share...)
  severity     TEXT NOT NULL CHECK (severity IN ('danger', 'warning', 'action')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at  TEXT
);
CREATE UNIQUE INDEX idx_alerts_open_rule ON ai_alerts(user_id, rule_key) WHERE status = 'open';

-- ───────────── Cộng đồng ─────────────
CREATE TABLE lessons (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  kind         TEXT NOT NULL CHECK (kind IN ('lesson', 'story', 'history')),
  title        TEXT NOT NULL,
  excerpt      TEXT NOT NULL,
  body_md      TEXT NOT NULL DEFAULT '',
  category     TEXT NOT NULL,
  icon         TEXT NOT NULL,
  read_time    TEXT NOT NULL DEFAULT '5 phút',
  is_featured  INTEGER NOT NULL DEFAULT 0,
  order_idx    INTEGER NOT NULL DEFAULT 0
);

-- ───────────── Cài đặt ─────────────
CREATE TABLE user_settings (
  user_id                   TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data_encrypted            INTEGER NOT NULL DEFAULT 1,
  advanced_analysis         INTEGER NOT NULL DEFAULT 0,
  notify_goal_delay         INTEGER NOT NULL DEFAULT 1,
  notify_portfolio_risk     INTEGER NOT NULL DEFAULT 1,
  notify_weekly_email       INTEGER NOT NULL DEFAULT 0,
  notify_community_lessons  INTEGER NOT NULL DEFAULT 1
);
