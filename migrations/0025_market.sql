-- Dữ liệu thị trường + định giá tài sản theo giá thật + luật cảnh báo giá.
-- Holding có symbol + quantity → giá trị = quantity × giá mới nhất (khi đọc). Không có mã → giữ số nhập tay.
ALTER TABLE holdings ADD COLUMN symbol TEXT;
ALTER TABLE holdings ADD COLUMN quantity REAL;

-- Giá mới nhất mỗi mã (mẫu chuẩn Quote). prev_close = giá đóng cửa phiên / ngày trước.
CREATE TABLE market_prices (
  symbol      TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('gold_vn', 'gold_world', 'index', 'stock', 'fund', 'fx', 'crypto')),
  price       REAL NOT NULL,
  prev_close  REAL,
  change_pct  REAL,
  as_of       TEXT NOT NULL,   -- thời điểm nguồn công bố giá (ISO)
  source      TEXT NOT NULL,   -- sjc | pnj | gold-api | ssi | vndirect | fmarket | vietcombank | er-api | coingecko | mau
  fetched_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Giá đóng cửa theo ngày (giờ Việt Nam) — dùng cho chỉ báo kỹ thuật và "giảm trong tuần".
CREATE TABLE market_history (
  symbol  TEXT NOT NULL,
  day     TEXT NOT NULL,   -- YYYY-MM-DD
  close   REAL NOT NULL,
  PRIMARY KEY (symbol, day)
);

-- Độ rộng thị trường HOSE theo ngày.
CREATE TABLE market_breadth (
  day               TEXT PRIMARY KEY,
  index_value       REAL,
  index_change_pct  REAL,
  advancers         INTEGER,
  decliners         INTEGER,
  as_of             TEXT NOT NULL,
  source            TEXT NOT NULL
);

-- Tiêu đề tin (chỉ tiêu đề + link + thời gian, không lưu toàn văn).
CREATE TABLE market_news (
  id            TEXT PRIMARY KEY,   -- hash của url
  symbol        TEXT,
  title         TEXT NOT NULL,
  url           TEXT NOT NULL,
  published_at  TEXT NOT NULL,
  source        TEXT NOT NULL,
  sentiment     TEXT CHECK (sentiment IN ('good', 'bad', 'neutral'))
);
CREATE INDEX idx_market_news_time ON market_news(published_at DESC);

-- Luật cảnh báo giá người dùng tự đặt.
CREATE TABLE alert_rules (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol         TEXT NOT NULL,
  direction      TEXT NOT NULL CHECK (direction IN ('down', 'up')),
  threshold_pct  REAL NOT NULL CHECK (threshold_pct > 0 AND threshold_pct <= 100),
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_alert_rules_user ON alert_rules(user_id);

-- Chống báo dồn: mỗi luật tối đa 1 lần / ngày / người.
CREATE TABLE market_alert_log (
  user_id   TEXT NOT NULL,
  rule_key  TEXT NOT NULL,
  day       TEXT NOT NULL,
  PRIMARY KEY (user_id, rule_key, day)
);

-- Bộ giá mẫu (source = 'mau', tham khảo ngày 25–28/09/2026) để demo không trống khi mọi nguồn lỗi.
-- Lần làm mới đầu tiên sẽ ghi đè bằng giá thật.
INSERT INTO market_prices (symbol, kind, price, prev_close, change_pct, as_of, source, fetched_at) VALUES
  ('SJC',     'gold_vn',    141400000, 141400000, 0,     '2026-09-26T01:34:00Z', 'mau', '2026-09-26T01:34:00Z'),
  ('XAU',     'gold_world', 4236.4,    NULL,      NULL,  '2026-09-28T00:47:00Z', 'mau', '2026-09-28T00:47:00Z'),
  ('XAG',     'gold_world', 63.28,     NULL,      NULL,  '2026-09-28T00:57:00Z', 'mau', '2026-09-28T00:57:00Z'),
  ('VNINDEX', 'index',      1785.11,   1775.09,   0.56,  '2026-09-25T08:00:00Z', 'mau', '2026-09-25T08:00:00Z'),
  ('USD',     'fx',         25790,     NULL,      NULL,  '2026-09-28T00:38:00Z', 'mau', '2026-09-28T00:38:00Z'),
  ('CNY',     'fx',         3810.09,   NULL,      NULL,  '2026-09-28T00:38:00Z', 'mau', '2026-09-28T00:38:00Z'),
  ('BTC',     'crypto',     2191786162, NULL,     0.07,  '2026-09-28T00:47:00Z', 'mau', '2026-09-28T00:47:00Z'),
  ('FPT',     'stock',      64700,     65300,     -0.92, '2026-09-25T08:09:00Z', 'mau', '2026-09-25T08:09:00Z'),
  ('VESAF',   'fund',       31517.61,  31800.63,  -0.89, '2026-09-27T13:00:00Z', 'mau', '2026-09-27T13:00:00Z');
INSERT INTO market_breadth (day, index_value, index_change_pct, advancers, decliners, as_of, source) VALUES
  ('2026-09-25', 1785.11, 0.56, 140, 179, '2026-09-25T08:00:00Z', 'mau');
