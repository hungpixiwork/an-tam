-- Lựa chọn cuộc đời (B1) — tối thiểu cho màn Tổng quan; màn Lựa chọn cuộc đời mở rộng tiếp.
-- Kết quả đánh giá (khả thi, số tháng chuẩn bị) tính khi đọc, không lưu.

CREATE TABLE life_choices (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  icon          TEXT NOT NULL DEFAULT 'graduation-cap',
  cost          INTEGER NOT NULL DEFAULT 0 CHECK (cost >= 0),
  steps_json    TEXT NOT NULL DEFAULT '[]',           -- ["Tìm hiểu", "Chuẩn bị tài chính", ...]
  current_step  INTEGER NOT NULL DEFAULT 0 CHECK (current_step >= 0),   -- số mốc đã xong
  pinned        INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'archived')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_life_choices_user ON life_choices(user_id);

CREATE TABLE life_choice_options (
  id          TEXT PRIMARY KEY,
  choice_id   TEXT NOT NULL REFERENCES life_choices(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  cost        INTEGER NOT NULL DEFAULT 0 CHECK (cost >= 0),
  monthly_income_delta INTEGER NOT NULL DEFAULT 0,
  months_without_income INTEGER NOT NULL DEFAULT 0 CHECK (months_without_income >= 0),
  selected    INTEGER NOT NULL DEFAULT 0 CHECK (selected IN (0, 1)),
  order_idx   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_life_choice_options_choice ON life_choice_options(choice_id);

CREATE TABLE life_choice_prereqs (
  id         TEXT PRIMARY KEY,
  choice_id  TEXT NOT NULL REFERENCES life_choices(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  order_idx  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_life_choice_prereqs_choice ON life_choice_prereqs(choice_id);

CREATE TABLE life_choice_tasks (
  id         TEXT PRIMARY KEY,
  choice_id  TEXT NOT NULL REFERENCES life_choices(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  priority   TEXT NOT NULL DEFAULT 'mid' CHECK (priority IN ('high', 'mid', 'low')),
  due_month  TEXT DEFAULT NULL,
  done       INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  order_idx  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_life_choice_tasks_choice ON life_choice_tasks(choice_id);
