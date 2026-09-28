-- "Bàn đầu tư": mỗi mã chạy tối đa 1 lần / ngày, dùng chung cho mọi người dùng.
-- analysts_json / debate_json / verdict_json: kết quả từng bước (số do code tính, chữ do AI hoặc mẫu viết).
-- lesson / outcome_json: job so kết luận với giá thật sau 5 và 20 phiên, câu "bài học" đưa vào lần phân tích sau.
CREATE TABLE desk_reports (
  symbol         TEXT NOT NULL,
  day            TEXT NOT NULL,   -- YYYY-MM-DD giờ Việt Nam (dữ liệu dùng đều có ngày <= day)
  analysts_json  TEXT NOT NULL,
  debate_json    TEXT NOT NULL,
  verdict_json   TEXT NOT NULL,
  price_at       REAL,
  model          TEXT NOT NULL,   -- model đã viết chữ, hoặc 'mau' khi dùng câu mẫu
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  lesson         TEXT,
  outcome_json   TEXT,
  PRIMARY KEY (symbol, day)
);
CREATE INDEX idx_desk_reports_day ON desk_reports(day);
