-- Intentional Spending: tag giá trị cho giao dịch chi tiêu.
-- NULL = chưa tag (không ép user tag mọi giao dịch).

ALTER TABLE transactions ADD COLUMN value_tag TEXT DEFAULT NULL
  CHECK (value_tag IS NULL OR value_tag IN ('essential', 'useful', 'joy', 'growth', 'regret'));
