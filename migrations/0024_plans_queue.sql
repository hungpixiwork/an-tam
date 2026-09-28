-- Gói trả phí + hạn mức AI + thanh toán gói qua VietQR/SePay + gợi ý phân loại tự học.
-- Giới hạn từng gói nằm ở shared/plans.ts (một nguồn duy nhất).

ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'plus', 'bank'));
ALTER TABLE users ADD COLUMN plan_until TEXT;   -- ISO-8601 UTC; NULL = không hết hạn (free / bank theo hợp đồng)

-- Số lượt AI đã dùng mỗi ngày (ngày theo giờ Việt Nam, YYYY-MM-DD)
CREATE TABLE ai_usage (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day      TEXT NOT NULL,
  kind     TEXT NOT NULL,              -- 'intent', 'narrate', 'categorize'...
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, kind)
);

-- Đơn nâng gói: người dùng chuyển khoản với nội dung chứa mã ANTAMxxxxxx
CREATE TABLE plan_payments (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        TEXT NOT NULL UNIQUE,
  amount      INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  paid_at     TEXT
);
CREATE INDEX idx_plan_payments_user ON plan_payments(user_id, status);

-- Gợi ý phân loại giao dịch tự học. user_id = '' là gợi ý chung cho mọi người
-- (không dùng NULL vì NULL trong PRIMARY KEY của SQLite không chặn trùng).
CREATE TABLE category_hints (
  user_id   TEXT NOT NULL DEFAULT '',
  pattern   TEXT NOT NULL,
  category  TEXT NOT NULL,
  hits      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, pattern)
);
