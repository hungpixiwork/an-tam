-- Số lần Agent queue gọi lại cùng run. Không đổi dữ liệu hay trạng thái của lịch sử cũ.
ALTER TABLE agent_runs ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
