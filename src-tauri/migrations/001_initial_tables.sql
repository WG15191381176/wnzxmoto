-- 客户档案
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    vehicle_info TEXT,
    notes TEXT,
    vehicle_brand TEXT,
    vehicle_model TEXT,
    vin TEXT,
    engine_number TEXT,
    purchase_date TEXT,
    vehicle_color TEXT,
    insurance_date TEXT,
    insurance_company TEXT,
    license_plate TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    invoice_title TEXT,
    tax_id TEXT,
    bank_name TEXT,
    bank_account TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 配件/商品
CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    english_name TEXT DEFAULT '',
    spec TEXT DEFAULT '',
    vehicle_qty INTEGER DEFAULT 1,
    unit TEXT DEFAULT '个',
    cost_price REAL DEFAULT 0,
    sale_price REAL DEFAULT 0,
    stock_qty INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    category TEXT DEFAULT '',
    location TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 供应商
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 入库单
CREATE TABLE IF NOT EXISTS in_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    supplier_id INTEGER,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS in_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    part_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES in_orders(id)
);

-- 出库单
CREATE TABLE IF NOT EXISTS out_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    customer_id INTEGER,
    work_order_id INTEGER,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS out_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    part_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES out_orders(id)
);

-- 维修工单
CREATE TABLE IF NOT EXISTS work_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    vehicle_info TEXT,
    status TEXT DEFAULT 'open',
    total_parts_amount REAL DEFAULT 0,
    total_labor_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- 工单配件明细
CREATE TABLE IF NOT EXISTS work_order_parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_id INTEGER NOT NULL,
    part_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
);

-- 工单工时明细
CREATE TABLE IF NOT EXISTS work_order_labors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    hours REAL NOT NULL,
    unit_price REAL NOT NULL,
    amount REAL NOT NULL,
    technician TEXT,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
);

-- 库存流水
CREATE TABLE IF NOT EXISTS stock_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    qty INTEGER NOT NULL,
    before_qty INTEGER NOT NULL,
    after_qty INTEGER NOT NULL,
    ref_type TEXT,
    ref_id INTEGER,
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_parts_code ON parts(code);
CREATE INDEX IF NOT EXISTS idx_parts_name ON parts(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_in_orders_no ON in_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_out_orders_no ON out_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_work_orders_no ON work_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_stock_logs_part ON stock_logs(part_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_created ON stock_logs(created_at);