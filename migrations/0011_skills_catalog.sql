-- Kỹ năng đang học (lộ trình kỹ năng → thu nhập) + danh mục cơ hội việc làm / làm thêm / khóa học.
-- Nhóm kỹ năng `tag` dùng để ghép kỹ năng với cơ hội: data, ai_automation, nocode, other.
-- Thu nhập luôn là VND/tháng (ƯỚC TÍNH — không phải lời hứa tăng lương).

CREATE TABLE skill_plan_items (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  tag             TEXT NOT NULL DEFAULT 'other' CHECK (tag IN ('data', 'ai_automation', 'nocode', 'other')),
  stage           TEXT NOT NULL DEFAULT 'foundation' CHECK (stage IN ('foundation', 'practice', 'portfolio')),
  status          TEXT NOT NULL DEFAULT 'learning' CHECK (status IN ('planned', 'learning', 'done')),
  months_min      INTEGER NOT NULL DEFAULT 1 CHECK (months_min BETWEEN 0 AND 60),
  months_max      INTEGER NOT NULL DEFAULT 3 CHECK (months_max BETWEEN 0 AND 60),
  hours_per_week  REAL NOT NULL DEFAULT 2 CHECK (hours_per_week BETWEEN 0 AND 40),
  progress        INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  order_idx       INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (months_max >= months_min)
);
CREATE INDEX idx_skill_plan_items_user ON skill_plan_items(user_id, order_idx);

-- Danh mục chung (không theo người dùng). Nhu cầu: high = nhu cầu cao, rising = doanh nghiệp đang tìm nhiều.
CREATE TABLE opportunities (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('freelance', 'job', 'course')),
  title       TEXT NOT NULL,
  tag         TEXT NOT NULL DEFAULT 'other' CHECK (tag IN ('data', 'ai_automation', 'nocode', 'other')),
  income_min  INTEGER NOT NULL DEFAULT 0 CHECK (income_min >= 0),
  income_max  INTEGER NOT NULL DEFAULT 0 CHECK (income_max >= income_min),
  demand      TEXT NOT NULL DEFAULT 'normal' CHECK (demand IN ('high', 'rising', 'normal')),
  remote      INTEGER NOT NULL DEFAULT 0 CHECK (remote IN (0, 1)),
  order_idx   INTEGER NOT NULL DEFAULT 0
);

INSERT INTO opportunities (id, kind, title, tag, income_min, income_max, demand, remote, order_idx) VALUES
  ('opp-fl-data',   'freelance', 'Freelance phân tích dữ liệu',             'data',          5000000,  15000000, 'high',   1, 1),
  ('opp-fl-ai',     'freelance', 'Tự động hóa quy trình với AI',            'ai_automation', 5000000,  15000000, 'rising', 1, 2),
  ('opp-fl-nocode', 'freelance', 'Thiết kế website / No-code',              'nocode',        3000000,  10000000, 'normal', 1, 3),
  ('opp-job-data',  'job',       'Freelance phân tích dữ liệu (Data Analyst)', 'data',       5000000,  15000000, 'high',   1, 1),
  ('opp-job-ai',    'job',       'Tối ưu quy trình với AI cho doanh nghiệp', 'ai_automation', 8000000, 20000000, 'rising', 1, 2),
  ('opp-job-web',   'job',       'Thiết kế website bằng No-code (Webflow)', 'nocode',        3000000,  10000000, 'normal', 1, 3),
  ('opp-course-sql','course',    'Khóa SQL & Power BI thực hành',           'data',                0,         0, 'high',   1, 1),
  ('opp-course-ai', 'course',    'Khóa Tự động hóa công việc với AI',       'ai_automation',       0,         0, 'rising', 1, 2);
