-- 为 parts 表添加 vehicle_models 字段
ALTER TABLE parts ADD COLUMN vehicle_models TEXT DEFAULT '';

-- 为 customers 表添加新字段
ALTER TABLE customers ADD COLUMN vehicle_brand TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN vehicle_model TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN vin TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN engine_number TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN purchase_date TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN vehicle_color TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN insurance_date TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN insurance_company TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN license_plate TEXT DEFAULT '';

-- 索引
CREATE INDEX IF NOT EXISTS idx_customers_vin ON customers(vin);
CREATE INDEX IF NOT EXISTS idx_customers_license_plate ON customers(license_plate);
CREATE INDEX IF NOT EXISTS idx_parts_vehicle_models ON parts(vehicle_models);