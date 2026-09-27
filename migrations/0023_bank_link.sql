-- Liên kết tài khoản ngân hàng qua SePay (trang 9).
-- Chỉ lưu 4 số cuối (account_masked) + hash số tài khoản để khớp webhook — không lưu số đầy đủ.
ALTER TABLE bank_accounts ADD COLUMN account_hash TEXT;
ALTER TABLE bank_accounts ADD COLUMN verified_at TEXT;
ALTER TABLE bank_accounts ADD COLUMN last_event_at TEXT;
CREATE INDEX idx_bank_accounts_hash ON bank_accounts(account_hash);
CREATE INDEX idx_bank_accounts_user ON bank_accounts(user_id);
