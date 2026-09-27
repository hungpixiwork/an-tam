-- Lựa chọn cuộc đời — màn đầy đủ (trang 6): mẫu tình huống, chi tiết phương án, điều kiện tự tính, mô tả việc cần làm.
-- Điểm khả thi / số tháng an toàn trước-sau vẫn tính khi đọc (shared/engine/lifeChoice.ts), không lưu.

ALTER TABLE life_choices ADD COLUMN kind TEXT NOT NULL DEFAULT 'custom'
  CHECK (kind IN ('study', 'care', 'startup', 'switch', 'sabbatical', 'custom'));
ALTER TABLE life_choices ADD COLUMN outcome TEXT NOT NULL DEFAULT '';          -- mục tiêu sau khi hoàn thành
ALTER TABLE life_choices ADD COLUMN income_uplift_pct INTEGER NOT NULL DEFAULT 0 CHECK (income_uplift_pct BETWEEN -100 AND 300);

ALTER TABLE life_choice_options ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE life_choice_options ADD COLUMN duration_months INTEGER NOT NULL DEFAULT 12 CHECK (duration_months BETWEEN 1 AND 120);
ALTER TABLE life_choice_options ADD COLUMN other_cost INTEGER NOT NULL DEFAULT 0 CHECK (other_cost >= 0);

-- auto_key ≠ NULL: điều kiện do hệ thống tự kiểm tra từ dữ liệu tài chính (vd 'reserve_12m'), không tick tay.
ALTER TABLE life_choice_prereqs ADD COLUMN auto_key TEXT DEFAULT NULL;

ALTER TABLE life_choice_tasks ADD COLUMN detail TEXT NOT NULL DEFAULT '';
