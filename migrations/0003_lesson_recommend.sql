-- Thêm cột recommend theo mức an tâm
ALTER TABLE lessons ADD COLUMN recommended_for TEXT DEFAULT NULL;
