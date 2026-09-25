-- Tài khoản thật: bỏ dữ liệu demo, thêm trạng thái hoàn tất "Bắt đầu" và sổ thu chi.

ALTER TABLE users ADD COLUMN onboarded_at TEXT;   -- NULL = chưa qua màn "Bắt đầu"
ALTER TABLE users DROP COLUMN is_demo_data;
-- Tài khoản cũ đã có dữ liệu thì coi như đã hoàn tất, không bắt đi lại màn "Bắt đầu"
UPDATE users SET onboarded_at = created_at WHERE EXISTS (SELECT 1 FROM holdings h WHERE h.user_id = users.id);

-- Sổ thu chi: thu nhập / chi tiêu thực tế theo từng giao dịch.
-- Engine lấy trung bình các tháng đã trọn làm thu nhập / chi tiêu tháng (xem shared/engine/ledger.ts).
CREATE TABLE transactions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  amount       INTEGER NOT NULL CHECK (amount > 0),
  category     TEXT NOT NULL,                -- khóa trong TRANSACTION_CATEGORIES
  note         TEXT NOT NULL DEFAULT '',
  occurred_on  TEXT NOT NULL,                -- 'YYYY-MM-DD'
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, occurred_on DESC);
