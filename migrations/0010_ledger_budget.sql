-- Sổ thu chi: ngân sách tháng, hóa đơn định kỳ, chia đều chi phí (VietQR), nguồn giao dịch.

-- Ngân sách tháng. category = 'all' cho tổng chi. Tháng chưa đặt → dùng ngân sách gần nhất trước đó (mang sang).
CREATE TABLE budgets (
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month         TEXT NOT NULL,                 -- 'YYYY-MM'
  category      TEXT NOT NULL DEFAULT 'all',
  limit_amount  INTEGER NOT NULL CHECK (limit_amount > 0),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, month, category)
);

-- Hóa đơn & đăng ký định kỳ hàng tháng. Trạng thái (sắp đến hạn / tự gia hạn / đã trả) tính khi đọc, không lưu.
CREATE TABLE recurring_bills (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  amount        INTEGER NOT NULL CHECK (amount > 0),
  category      TEXT NOT NULL DEFAULT 'housing',
  day_of_month  INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  auto_renew    INTEGER NOT NULL DEFAULT 0 CHECK (auto_renew IN (0, 1)),
  icon          TEXT NOT NULL DEFAULT 'receipt',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_recurring_bills_user ON recurring_bills(user_id);

-- Nguồn giao dịch: manual | bill | bank | import. external_id chống trùng khi đồng bộ ngân hàng.
ALTER TABLE transactions ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN external_id TEXT DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN bill_id TEXT DEFAULT NULL;
CREATE UNIQUE INDEX idx_transactions_external ON transactions(user_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_transactions_bill ON transactions(user_id, bill_id) WHERE bill_id IS NOT NULL;

-- Chia đều chi phí: lưu lần chia gần đây (người tham gia + phần mỗi người).
CREATE TABLE split_bills (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  total         INTEGER NOT NULL CHECK (total > 0),
  shares_json   TEXT NOT NULL,                 -- [{ name, amount }]
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_split_bills_user ON split_bills(user_id, created_at DESC);

-- Tài khoản nhận tiền VietQR.
ALTER TABLE user_settings ADD COLUMN payout_bank_bin TEXT DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN payout_account_no TEXT DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN payout_account_name TEXT DEFAULT NULL;
