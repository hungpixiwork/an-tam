-- Hồ sơ nghề nghiệp (B2) + rủi ro tập trung ngành (B4) + mục tiêu theo kỳ hạn + nợ.
-- Nhóm ngành (ba.md §5.2): technology, finance, real_estate, manufacturing, consumer, healthcare, education_public, other.

ALTER TABLE holdings ADD COLUMN sector TEXT NOT NULL DEFAULT 'other'
  CHECK (sector IN ('technology', 'finance', 'real_estate', 'manufacturing', 'consumer', 'healthcare', 'education_public', 'other'));
ALTER TABLE holdings ADD COLUMN is_employer_stock INTEGER NOT NULL DEFAULT 0 CHECK (is_employer_stock IN (0, 1));

ALTER TABLE income_profiles ADD COLUMN sector TEXT DEFAULT NULL
  CHECK (sector IS NULL OR sector IN ('technology', 'finance', 'real_estate', 'manufacturing', 'consumer', 'healthcare', 'education_public', 'other'));
ALTER TABLE income_profiles ADD COLUMN isco_code TEXT DEFAULT NULL;   -- ISCO-08, 1–4 chữ số

ALTER TABLE financial_profiles ADD COLUMN birth_year INTEGER DEFAULT NULL
  CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2100);
ALTER TABLE financial_profiles ADD COLUMN retirement_age INTEGER NOT NULL DEFAULT 60
  CHECK (retirement_age BETWEEN 40 AND 80);

ALTER TABLE goals ADD COLUMN icon TEXT DEFAULT NULL;
ALTER TABLE goals ADD COLUMN horizon TEXT DEFAULT NULL
  CHECK (horizon IS NULL OR horizon IN ('short', 'mid', 'long'));

-- Tách tài sản ròng: tiền mặt / tài sản khác / nợ (màn Danh mục 4 KPI)
ALTER TABLE net_worth_snapshots ADD COLUMN cash INTEGER NOT NULL DEFAULT 0;
ALTER TABLE net_worth_snapshots ADD COLUMN other INTEGER NOT NULL DEFAULT 0;
ALTER TABLE net_worth_snapshots ADD COLUMN debt INTEGER NOT NULL DEFAULT 0;

CREATE TABLE liabilities (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  kind             TEXT NOT NULL CHECK (kind IN ('mortgage', 'consumer', 'credit_card', 'student', 'other')),
  balance          INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  monthly_payment  INTEGER NOT NULL DEFAULT 0 CHECK (monthly_payment >= 0),
  rate_bp          INTEGER NOT NULL DEFAULT 0 CHECK (rate_bp BETWEEN 0 AND 10000),   -- 1250 = 12,5%/năm
  order_idx        INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_liabilities_user ON liabilities(user_id);
