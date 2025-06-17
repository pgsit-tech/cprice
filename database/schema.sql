-- Cloudflare D1 数据库设计
-- 货运代理物流价格发布和查询系统

-- 用户表
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 权限表
CREATE TABLE permissions (
    id TEXT PRIMARY KEY,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户权限关联表
CREATE TABLE user_permissions (
    user_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, permission_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- 业务类型表
CREATE TABLE business_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 价格表
CREATE TABLE prices (
    id TEXT PRIMARY KEY,
    business_type_id TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    price_type TEXT NOT NULL CHECK (price_type IN ('cost', 'public')),
    price DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CNY',
    unit TEXT NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_type_id) REFERENCES business_types(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 客户咨询表单表
CREATE TABLE customer_inquiries (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_region TEXT NOT NULL,
    business_type TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    cargo_description TEXT,
    estimated_weight DECIMAL(10,2),
    estimated_volume DECIMAL(10,2),
    expected_ship_date DATE,
    additional_requirements TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'quoted', 'completed')),
    assigned_to TEXT,
    assigned_at DATETIME,
    auto_release_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- 公告表
CREATE TABLE announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX idx_prices_business_type ON prices(business_type_id);
CREATE INDEX idx_prices_origin_destination ON prices(origin, destination);
CREATE INDEX idx_prices_price_type ON prices(price_type);
CREATE INDEX idx_prices_valid_dates ON prices(valid_from, valid_to);
CREATE INDEX idx_customer_inquiries_status ON customer_inquiries(status);
CREATE INDEX idx_customer_inquiries_assigned_to ON customer_inquiries(assigned_to);
CREATE INDEX idx_customer_inquiries_region ON customer_inquiries(customer_region);
CREATE INDEX idx_announcements_active ON announcements(is_active);
CREATE INDEX idx_announcements_priority ON announcements(priority);

-- 插入默认数据
-- 默认业务类型
INSERT INTO business_types (id, name, code, description) VALUES
('bt_001', '海运', 'SEA', '海运货物运输服务'),
('bt_002', '空运', 'AIR', '航空货物运输服务'),
('bt_003', 'FBA', 'FBA', 'Amazon FBA头程服务'),
('bt_004', '卡派', 'TRUCK', '卡车派送服务'),
('bt_005', '卡航', 'TRUCK_AIR', '卡车+航空联运服务');

-- 默认权限
INSERT INTO permissions (id, module, action, description) VALUES
('perm_001', 'dashboard', 'view', '查看仪表板'),
('perm_002', 'prices', 'view', '查看价格'),
('perm_003', 'prices', 'create', '创建价格'),
('perm_004', 'prices', 'update', '更新价格'),
('perm_005', 'prices', 'delete', '删除价格'),
('perm_006', 'prices', 'export', '导出价格'),
('perm_007', 'inquiries', 'view', '查看咨询'),
('perm_008', 'inquiries', 'update', '更新咨询'),
('perm_009', 'inquiries', 'export', '导出咨询'),
('perm_010', 'announcements', 'view', '查看公告'),
('perm_011', 'announcements', 'create', '创建公告'),
('perm_012', 'announcements', 'update', '更新公告'),
('perm_013', 'announcements', 'delete', '删除公告'),
('perm_014', 'business_types', 'view', '查看业务类型'),
('perm_015', 'business_types', 'create', '创建业务类型'),
('perm_016', 'business_types', 'update', '更新业务类型'),
('perm_017', 'business_types', 'delete', '删除业务类型'),
('perm_018', 'users', 'view', '查看用户'),
('perm_019', 'users', 'create', '创建用户'),
('perm_020', 'users', 'update', '更新用户'),
('perm_021', 'users', 'delete', '删除用户');

-- 默认管理员用户 (密码: admin123)
INSERT INTO users (id, username, email, password_hash, role) VALUES
('user_001', 'admin', 'admin@cprice.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin');

-- 为管理员分配所有权限
INSERT INTO user_permissions (user_id, permission_id)
SELECT 'user_001', id FROM permissions;
