import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { Env } from '../index';

export const priceRoutes = new Hono<{ Bindings: Env }>();

// 检查权限的辅助函数
function hasPermission(permissions: any[], module: string, action: string): boolean {
  return permissions.some(p => p.module === module && p.action === action);
}

// 获取价格列表
priceRoutes.get('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'prices', 'view')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const {
      page = '1',
      pageSize = '20',
      search,
      businessType,
      origin,
      destination,
      priceType,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = c.req.query();
    
    let query = `
      SELECT p.*, bt.name as business_type_name, bt.code as business_type_code,
             u.username as created_by_name
      FROM prices p
      LEFT JOIN business_types bt ON p.business_type_id = bt.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.is_active = 1
    `;
    
    const params: any[] = [];
    
    if (search) {
      query += ` AND (p.origin LIKE ? OR p.destination LIKE ? OR p.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (businessType) {
      query += ` AND p.business_type_id = ?`;
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
    
    if (priceType) {
      query += ` AND p.price_type = ?`;
      params.push(priceType);
    }
    
    // 计算总数
    const countQuery = query.replace(
      'SELECT p.*, bt.name as business_type_name, bt.code as business_type_code, u.username as created_by_name',
      'SELECT COUNT(*) as total'
    );
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    
    // 分页查询
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const validSortColumns = ['created_at', 'price', 'origin', 'destination', 'valid_from'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY p.${sortColumn} ${order} LIMIT ? OFFSET ?`;
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
    console.error('Error fetching prices:', error);
    return c.json({ success: false, error: 'Failed to fetch prices' }, 500);
  }
});

// 获取单个价格
priceRoutes.get('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'prices', 'view')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    
    const result = await c.env.DB.prepare(`
      SELECT p.*, bt.name as business_type_name, bt.code as business_type_code,
             u.username as created_by_name
      FROM prices p
      LEFT JOIN business_types bt ON p.business_type_id = bt.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ? AND p.is_active = 1
    `).bind(id).first();
    
    if (!result) {
      return c.json({ success: false, error: 'Price not found' }, 404);
    }
    
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching price:', error);
    return c.json({ success: false, error: 'Failed to fetch price' }, 500);
  }
});

// 创建价格
priceRoutes.post('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'prices', 'create')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const {
      businessTypeId,
      origin,
      destination,
      priceType,
      price,
      currency = 'CNY',
      unit,
      validFrom,
      validTo,
      description
    } = await c.req.json();
    
    // 验证必填字段
    if (!businessTypeId || !origin || !destination || !priceType || !price || !unit || !validFrom) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }
    
    // 验证价格类型
    if (!['cost', 'public'].includes(priceType)) {
      return c.json({ success: false, error: 'Invalid price type' }, 400);
    }
    
    // 验证业务类型是否存在
    const businessType = await c.env.DB.prepare(`
      SELECT id FROM business_types WHERE id = ? AND is_active = 1
    `).bind(businessTypeId).first();
    
    if (!businessType) {
      return c.json({ success: false, error: 'Invalid business type' }, 400);
    }
    
    const id = `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await c.env.DB.prepare(`
      INSERT INTO prices (
        id, business_type_id, origin, destination, price_type, price,
        currency, unit, valid_from, valid_to, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, businessTypeId, origin, destination, priceType, price,
      currency, unit, validFrom, validTo, description, payload.userId
    ).run();
    
    if (result.success) {
      return c.json({ success: true, data: { id }, message: 'Price created successfully' });
    } else {
      throw new Error('Failed to create price');
    }
  } catch (error) {
    console.error('Error creating price:', error);
    return c.json({ success: false, error: 'Failed to create price' }, 500);
  }
});

// 更新价格
priceRoutes.put('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'prices', 'update')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    const {
      businessTypeId,
      origin,
      destination,
      priceType,
      price,
      currency,
      unit,
      validFrom,
      validTo,
      description
    } = await c.req.json();
    
    // 检查价格是否存在
    const existingPrice = await c.env.DB.prepare(`
      SELECT id FROM prices WHERE id = ? AND is_active = 1
    `).bind(id).first();
    
    if (!existingPrice) {
      return c.json({ success: false, error: 'Price not found' }, 404);
    }
    
    // 验证价格类型
    if (priceType && !['cost', 'public'].includes(priceType)) {
      return c.json({ success: false, error: 'Invalid price type' }, 400);
    }
    
    // 验证业务类型是否存在
    if (businessTypeId) {
      const businessType = await c.env.DB.prepare(`
        SELECT id FROM business_types WHERE id = ? AND is_active = 1
      `).bind(businessTypeId).first();
      
      if (!businessType) {
        return c.json({ success: false, error: 'Invalid business type' }, 400);
      }
    }
    
    const result = await c.env.DB.prepare(`
      UPDATE prices SET
        business_type_id = COALESCE(?, business_type_id),
        origin = COALESCE(?, origin),
        destination = COALESCE(?, destination),
        price_type = COALESCE(?, price_type),
        price = COALESCE(?, price),
        currency = COALESCE(?, currency),
        unit = COALESCE(?, unit),
        valid_from = COALESCE(?, valid_from),
        valid_to = ?,
        description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      businessTypeId, origin, destination, priceType, price,
      currency, unit, validFrom, validTo, description, id
    ).run();
    
    if (result.success) {
      return c.json({ success: true, message: 'Price updated successfully' });
    } else {
      throw new Error('Failed to update price');
    }
  } catch (error) {
    console.error('Error updating price:', error);
    return c.json({ success: false, error: 'Failed to update price' }, 500);
  }
});

// 删除价格（软删除）
priceRoutes.delete('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'prices', 'delete')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    
    const result = await c.env.DB.prepare(`
      UPDATE prices SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_active = 1
    `).bind(id).run();
    
    if (result.success && result.changes > 0) {
      return c.json({ success: true, message: 'Price deleted successfully' });
    } else {
      return c.json({ success: false, error: 'Price not found' }, 404);
    }
  } catch (error) {
    console.error('Error deleting price:', error);
    return c.json({ success: false, error: 'Failed to delete price' }, 500);
  }
});
