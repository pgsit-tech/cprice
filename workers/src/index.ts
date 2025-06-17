import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { authRoutes } from './routes/auth';
import { priceRoutes } from './routes/prices';
import { inquiryRoutes } from './routes/inquiries';
import { announcementRoutes } from './routes/announcements';
import { businessTypeRoutes } from './routes/business-types';
import { userRoutes } from './routes/users';
import { dashboardRoutes } from './routes/dashboard';
import { settingsRoutes } from './routes/settings';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS配置
app.use('*', cors({
  origin: (origin, c) => {
    const allowedOrigins = c.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 健康检查
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 数据库初始化端点（仅用于调试，不需要认证）
app.get('/init-db', async (c) => {
  try {
    // 检查是否已有数据
    const existingData = await c.env.DB.prepare('SELECT COUNT(*) as count FROM business_types').first();
    if (existingData && existingData.count > 0) {
      return c.json({ success: true, message: 'Database already initialized', count: existingData.count });
    }

    // 插入默认业务类型
    const businessTypes = [
      { id: 'bt_001', name: '海运', code: 'SEA', description: '海运货物运输服务' },
      { id: 'bt_002', name: '空运', code: 'AIR', description: '航空货物运输服务' },
      { id: 'bt_003', name: 'FBA', code: 'FBA', description: 'Amazon FBA头程服务' },
      { id: 'bt_004', name: '卡派', code: 'TRUCK', description: '卡车派送服务' },
      { id: 'bt_005', name: '卡航', code: 'TRUCK_AIR', description: '卡车+航空联运服务' }
    ];

    for (const bt of businessTypes) {
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO business_types (id, name, code, description)
        VALUES (?, ?, ?, ?)
      `).bind(bt.id, bt.name, bt.code, bt.description).run();
    }

    // 插入默认权限
    const permissions = [
      { id: 'perm_001', module: 'dashboard', action: 'view', description: '查看仪表板' },
      { id: 'perm_002', module: 'prices', action: 'view', description: '查看价格' },
      { id: 'perm_003', module: 'prices', action: 'create', description: '创建价格' },
      { id: 'perm_004', module: 'prices', action: 'update', description: '更新价格' },
      { id: 'perm_005', module: 'prices', action: 'delete', description: '删除价格' },
      { id: 'perm_006', module: 'prices', action: 'export', description: '导出价格' },
      { id: 'perm_007', module: 'inquiries', action: 'view', description: '查看咨询' },
      { id: 'perm_008', module: 'inquiries', action: 'update', description: '更新咨询' },
      { id: 'perm_009', module: 'inquiries', action: 'export', description: '导出咨询' },
      { id: 'perm_010', module: 'announcements', action: 'view', description: '查看公告' },
      { id: 'perm_011', module: 'announcements', action: 'create', description: '创建公告' },
      { id: 'perm_012', module: 'announcements', action: 'update', description: '更新公告' },
      { id: 'perm_013', module: 'announcements', action: 'delete', description: '删除公告' },
      { id: 'perm_014', module: 'business_types', action: 'view', description: '查看业务类型' },
      { id: 'perm_015', module: 'business_types', action: 'create', description: '创建业务类型' },
      { id: 'perm_016', module: 'business_types', action: 'update', description: '更新业务类型' },
      { id: 'perm_017', module: 'business_types', action: 'delete', description: '删除业务类型' },
      { id: 'perm_018', module: 'users', action: 'view', description: '查看用户' },
      { id: 'perm_019', module: 'users', action: 'create', description: '创建用户' },
      { id: 'perm_020', module: 'users', action: 'update', description: '更新用户' },
      { id: 'perm_021', module: 'users', action: 'delete', description: '删除用户' }
    ];

    for (const perm of permissions) {
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO permissions (id, module, action, description)
        VALUES (?, ?, ?, ?)
      `).bind(perm.id, perm.module, perm.action, perm.description).run();
    }

    // 插入默认管理员用户
    const adminPasswordHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO users (id, username, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).bind('user_001', 'admin', 'admin@cprice.com', adminPasswordHash, 'admin').run();

    // 为管理员分配所有权限
    for (const perm of permissions) {
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO user_permissions (user_id, permission_id)
        VALUES (?, ?)
      `).bind('user_001', perm.id).run();
    }

    // 插入默认系统设置
    const defaultSettings = [
      { key: 'system_name', value: 'CPrice 物流价格系统', type: 'string', description: '系统名称' },
      { key: 'system_subtitle', value: '专业的货运代理物流服务平台', type: 'string', description: '系统副标题' },
      { key: 'system_logo', value: '', type: 'string', description: '系统图标URL' },
      { key: 'footer_text', value: '© 2024 CPrice 物流. 保留所有权利.', type: 'string', description: '页脚文本' },
      { key: 'contact_email', value: 'contact@cprice.com', type: 'string', description: '联系邮箱' },
      { key: 'contact_phone', value: '400-123-4567', type: 'string', description: '联系电话' },
      { key: 'company_address', value: '中国上海市浦东新区', type: 'string', description: '公司地址' }
    ];

    for (const setting of defaultSettings) {
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO system_settings (key, value, type, description, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(setting.key, setting.value, setting.type, setting.description).run();
    }

    return c.json({
      success: true,
      message: 'Database initialized successfully',
      data: {
        businessTypes: businessTypes.length,
        permissions: permissions.length,
        adminUser: 1,
        systemSettings: defaultSettings.length
      }
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return c.json({ success: false, error: 'Failed to initialize database', details: error.message }, 500);
  }
});

// 公开路由（不需要认证）
app.route('/api/auth', authRoutes);

// 公开价格查询路由
app.get('/api/public/prices', async (c) => {
  const { businessType, origin, destination, page = '1', pageSize = '20' } = c.req.query();
  
  try {
    let query = `
      SELECT p.*, bt.name as business_type_name, bt.code as business_type_code
      FROM prices p
      LEFT JOIN business_types bt ON p.business_type_id = bt.id
      WHERE p.is_active = 1 AND p.price_type = 'public'
      AND (p.valid_to IS NULL OR p.valid_to >= date('now'))
    `;
    
    const params: any[] = [];
    
    if (businessType) {
      query += ` AND bt.code = ?`;
      params.push(businessType);
    }
    
    if (origin) {
      query += ` AND p.origin LIKE ?`;
      params.push(`%${origin}%`);
    }
    
    if (destination) {
      query += ` AND p.destination LIKE ?`;
      params.push(`%${destination}%`);
    }
    
    // 计算总数
    const countQuery = query.replace('SELECT p.*, bt.name as business_type_name, bt.code as business_type_code', 'SELECT COUNT(*) as total');
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    
    // 分页查询
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), offset);
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({
      success: true,
      data: {
        data: result.results,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('Error fetching public prices:', error);
    return c.json({ success: false, error: 'Failed to fetch prices' }, 500);
  }
});

// 公开咨询表单提交
app.post('/api/public/inquiries', async (c) => {
  try {
    const body = await c.req.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      customerRegion,
      businessType,
      origin,
      destination,
      cargoDescription,
      estimatedWeight,
      estimatedVolume,
      expectedShipDate,
      additionalRequirements
    } = body;
    
    // 验证必填字段
    if (!customerName || !customerEmail || !customerPhone || !customerRegion || 
        !businessType || !origin || !destination) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }
    
    const id = `inq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await c.env.DB.prepare(`
      INSERT INTO customer_inquiries (
        id, customer_name, customer_email, customer_phone, customer_region,
        business_type, origin, destination, cargo_description, estimated_weight,
        estimated_volume, expected_ship_date, additional_requirements
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, customerName, customerEmail, customerPhone, customerRegion,
      businessType, origin, destination, cargoDescription, estimatedWeight,
      estimatedVolume, expectedShipDate, additionalRequirements
    ).run();
    
    if (result.success) {
      return c.json({ success: true, message: 'Inquiry submitted successfully' });
    } else {
      throw new Error('Failed to insert inquiry');
    }
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    return c.json({ success: false, error: 'Failed to submit inquiry' }, 500);
  }
});

// 获取业务类型（公开）
app.get('/api/public/business-types', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT id, name, code, description
      FROM business_types
      WHERE is_active = 1
      ORDER BY name
    `).all();

    return c.json({ success: true, data: result.results });
  } catch (error) {
    console.error('Error fetching business types:', error);
    return c.json({ success: false, error: 'Failed to fetch business types' }, 500);
  }
});

// 获取公开系统设置
app.get('/api/public/settings', async (c) => {
  try {
    const settings = await c.env.DB.prepare(`
      SELECT key, value FROM system_settings
      WHERE key IN ('system_name', 'system_subtitle', 'system_logo', 'footer_text', 'contact_email', 'contact_phone', 'company_address')
    `).all();

    const publicSettings: any = {};
    settings.results?.forEach((setting: any) => {
      publicSettings[setting.key] = setting.value;
    });

    // 如果没有设置，返回默认值
    if (Object.keys(publicSettings).length === 0) {
      publicSettings.system_name = 'CPrice 物流价格系统';
      publicSettings.system_subtitle = '专业的货运代理物流服务平台';
      publicSettings.footer_text = '© 2024 CPrice 物流. 保留所有权利.';
      publicSettings.contact_email = 'contact@cprice.com';
      publicSettings.contact_phone = '400-123-4567';
      publicSettings.company_address = '中国上海市浦东新区';
    }

    return c.json({ success: true, data: publicSettings });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    return c.json({ success: false, error: 'Failed to fetch public settings' }, 500);
  }
});

// JWT中间件（保护需要认证的路由）
app.use('/api/*', async (c, next) => {
  // 跳过公开路由
  const path = c.req.path;
  if (path.startsWith('/api/auth') || path.startsWith('/api/public')) {
    return next();
  }
  
  return jwt({
    secret: c.env.JWT_SECRET,
  })(c, next);
});

// 受保护的路由
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/prices', priceRoutes);
app.route('/api/inquiries', inquiryRoutes);
app.route('/api/announcements', announcementRoutes);
app.route('/api/business-types', businessTypeRoutes);
app.route('/api/users', userRoutes);
app.route('/api/settings', settingsRoutes);

// 404处理
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

export default app;
