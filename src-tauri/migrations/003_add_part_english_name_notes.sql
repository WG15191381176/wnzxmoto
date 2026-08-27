-- 为 parts 表添加 english_name（英文名称）和 notes（备注）字段
ALTER TABLE parts ADD COLUMN english_name TEXT DEFAULT '';
ALTER TABLE parts ADD COLUMN notes TEXT DEFAULT '';

-- 索引
CREATE INDEX IF NOT EXISTS idx_parts_english_name ON parts(english_name);