-- EARN layer: thu nhập & phát triển năng lực.
-- Income Growth Plan, Value Hours, Time Allocation (168h/week).

CREATE TABLE income_profiles (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_income  INTEGER NOT NULL DEFAULT 0,
  target_income   INTEGER NOT NULL DEFAULT 0,
  target_months   INTEGER NOT NULL DEFAULT 12 CHECK (target_months BETWEEN 1 AND 120),
  occupation      TEXT NOT NULL DEFAULT '',
  hours_per_week  INTEGER NOT NULL DEFAULT 0 CHECK (hours_per_week BETWEEN 0 AND 80),
  focus_skill     TEXT NOT NULL DEFAULT ''
);

CREATE TABLE value_activities (
  id        TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  order_idx INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_value_activities_user ON value_activities(user_id);

-- Giờ giá trị theo tuần: planned vs actual cho mỗi activity.
CREATE TABLE value_hours_log (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL REFERENCES value_activities(id) ON DELETE CASCADE,
  week        TEXT NOT NULL,          -- 'YYYY-Www' ISO week
  planned     INTEGER NOT NULL DEFAULT 0 CHECK (planned >= 0),
  actual      INTEGER NOT NULL DEFAULT 0 CHECK (actual >= 0),
  UNIQUE(user_id, activity_id, week)
);
CREATE INDEX idx_value_hours_user_week ON value_hours_log(user_id, week DESC);

-- Phân bổ quỹ thời gian (168 giờ / tuần).
CREATE TABLE time_allocations (
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category  TEXT NOT NULL CHECK (category IN ('sleep', 'work', 'life', 'learning', 'side_income', 'unallocated')),
  hours     INTEGER NOT NULL DEFAULT 0 CHECK (hours >= 0),
  PRIMARY KEY (user_id, category)
);
