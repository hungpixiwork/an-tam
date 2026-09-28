-- Xác thực chủ tài khoản ngân hàng: khi liên kết, sinh mã (vd "AT7K2Q9X"); người dùng chuyển 2.000đ với nội dung là mã này.
-- Webhook thấy mã trong nội dung → ghi id sự kiện vào verified_by_event_id → lúc đó mới cho bấm Xác thực.
ALTER TABLE bank_accounts ADD COLUMN verify_code TEXT;
ALTER TABLE bank_accounts ADD COLUMN verified_by_event_id TEXT;
