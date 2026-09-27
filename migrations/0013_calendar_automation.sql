-- Lịch AI & tự động hóa (tối thiểu cho màn Tổng quan; màn Lịch AI mở rộng tiếp).
-- Giờ lưu dạng giờ địa phương Việt Nam 'YYYY-MM-DDTHH:MM' (+07:00).

CREATE TABLE calendar_events (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  note             TEXT NOT NULL DEFAULT '',
  category         TEXT NOT NULL DEFAULT 'personal'
                     CHECK (category IN ('finance', 'skill', 'work', 'rest', 'personal')),
  starts_at        TEXT NOT NULL,
  ends_at          TEXT NOT NULL,
  source           TEXT NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'google', 'agent')),
  google_event_id  TEXT DEFAULT NULL,
  action_id        TEXT DEFAULT NULL,
  done             INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (ends_at > starts_at)
);
CREATE INDEX idx_calendar_events_user_start ON calendar_events(user_id, starts_at);
CREATE UNIQUE INDEX idx_calendar_events_google ON calendar_events(user_id, google_event_id) WHERE google_event_id IS NOT NULL;

CREATE TABLE automation_rules (
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key                TEXT NOT NULL CHECK (key IN ('weekly_review', 'bill_reminder', 'skill_block', 'freelance_followup')),
  enabled            INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  requires_approval  INTEGER NOT NULL DEFAULT 1 CHECK (requires_approval IN (0, 1)),
  config_json        TEXT NOT NULL DEFAULT '{}',
  last_fired_at      TEXT DEFAULT NULL,
  PRIMARY KEY (user_id, key)
);

-- "Ẩn hôm nay" trên thẻ đề xuất của AI (theo ngày giờ Việt Nam).
CREATE TABLE suggestion_dismissals (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key      TEXT NOT NULL,
  day      TEXT NOT NULL,   -- 'YYYY-MM-DD'
  PRIMARY KEY (user_id, key, day)
);
