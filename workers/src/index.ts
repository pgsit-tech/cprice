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
