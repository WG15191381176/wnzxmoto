-- 为 suppliers 表添加 notes 字段（旧版本迁移遗漏）
ALTER TABLE suppliers ADD COLUMN notes TEXT DEFAULT '';