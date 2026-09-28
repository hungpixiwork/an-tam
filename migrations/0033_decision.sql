-- Mô phỏng cú sốc kép + Lựa chọn cuộc đời theo mockup:
-- thưởng / cổ phiếu thưởng tách khỏi lương, tháng bắt đầu + mức cắt chi của phương án,
-- nhóm việc (tài chính / công việc / quỹ thời gian) và việc "hôm nay", lần chạy mô phỏng gắn với lựa chọn.

ALTER TABLE income_profiles ADD COLUMN bonus_annual INTEGER NOT NULL DEFAULT 0 CHECK (bonus_annual >= 0);
ALTER TABLE income_profiles ADD COLUMN esop_annual INTEGER NOT NULL DEFAULT 0 CHECK (esop_annual >= 0);

ALTER TABLE life_choice_options ADD COLUMN cut_pct REAL DEFAULT NULL CHECK (cut_pct IS NULL OR (cut_pct >= 0 AND cut_pct <= 1));
ALTER TABLE life_choice_options ADD COLUMN start_month TEXT DEFAULT NULL;

ALTER TABLE life_choice_tasks ADD COLUMN category TEXT NOT NULL DEFAULT 'finance'
  CHECK (category IN ('finance', 'career', 'time'));
ALTER TABLE life_choice_tasks ADD COLUMN today INTEGER NOT NULL DEFAULT 0 CHECK (today IN (0, 1));

ALTER TABLE simulation_runs ADD COLUMN choice_id TEXT DEFAULT NULL;
ALTER TABLE simulation_runs ADD COLUMN mode TEXT DEFAULT NULL;
CREATE INDEX idx_simulation_runs_choice ON simulation_runs(choice_id);

-- Lệnh gốc của agent (đã mã hóa, AES-GCM) để "Yêu cầu điều chỉnh" chạy lại đúng số tiền thật, không dùng bản đã che
ALTER TABLE agent_runs ADD COLUMN input_enc TEXT DEFAULT NULL;
