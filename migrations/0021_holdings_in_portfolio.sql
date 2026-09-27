-- Trang Danh mục: tách "tài sản đầu tư" (vào danh mục) khỏi "tài sản khác" (quỹ dự phòng, tài khoản chi tiêu, nhà, xe).
-- Dữ liệu cũ: cổ phiếu / quỹ / trái phiếu vào danh mục, tiền mặt / khác thì không (giữ nguyên số trang Tổng quan).
ALTER TABLE holdings ADD COLUMN in_portfolio INTEGER NOT NULL DEFAULT 1 CHECK (in_portfolio IN (0, 1));
UPDATE holdings SET in_portfolio = CASE WHEN category IN ('stock', 'fund', 'bond') THEN 1 ELSE 0 END;
