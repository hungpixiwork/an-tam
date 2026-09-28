-- Hành động 1 chạm từ gợi ý (Mô phỏng / Lựa chọn / dải liên kết trên trang CRUD):
-- gắn với bước gợi ý + lựa chọn để không đề xuất lại việc đã làm; hoàn tác trong ít phút.
ALTER TABLE agent_actions ADD COLUMN step_key TEXT DEFAULT NULL;
ALTER TABLE agent_actions ADD COLUMN choice_id TEXT DEFAULT NULL;
ALTER TABLE agent_actions ADD COLUMN undone_at TEXT DEFAULT NULL;
CREATE INDEX idx_agent_actions_step ON agent_actions(user_id, choice_id, step_key);

-- Việc trong kế hoạch lựa chọn có thể mang theo hành động (JSON {type, payload}) và đường dẫn tới trang liên quan
ALTER TABLE life_choice_tasks ADD COLUMN action_json TEXT DEFAULT NULL;
ALTER TABLE life_choice_tasks ADD COLUMN link TEXT DEFAULT NULL;
