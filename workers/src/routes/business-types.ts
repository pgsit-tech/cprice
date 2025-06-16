import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { Env } from '../index';

export const businessTypeRoutes = new Hono<{ Bindings: Env }>();

// 检查权限的辅助函数
function hasPermission(permissions: any[], module: string, action: string): boolean {
  return permissions.some(p => p.module === module && p.action === action);
}

// 获取业务类型列表
businessTypeRoutes.get('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'business_types', 'view')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const {
      page = '1',
      pageSize = '20',
      search,
      isActive,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = c.req.query();
    
    let query = `
      SELECT * FROM business_types WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (search) {
      query += ` AND (name LIKE ? OR code LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (isActive !== undefined) {
      query += ` AND is_active = ?`;
      params.push(isActive === 'true' ? 1 : 0);
    }
    
    // 计算总数
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    
    // 分页查询
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const validSortColumns = ['created_at', 'name', 'code'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`;
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
    console.error('Error fetching business types:', error);
    return c.json({ success: false, error: 'Failed to fetch business types' }, 500);
  }
});

// 获取单个业务类型
businessTypeRoutes.get('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'business_types', 'view')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    
    const result = await c.env.DB.prepare(`
      SELECT * FROM business_types WHERE id = ?
    `).bind(id).first();
    
    if (!result) {
      return c.json({ success: false, error: 'Business type not found' }, 404);
    }
    
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching business type:', error);
    return c.json({ success: false, error: 'Failed to fetch business type' }, 500);
  }
});

// 创建业务类型
businessTypeRoutes.post('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'business_types', 'create')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const { name, code, description, isActive = true } = await c.req.json();
    
    // 验证必填字段
    if (!name || !code) {
      return c.json({ success: false, error: 'Name and code are required' }, 400);
    }
    
    // 检查代码是否已存在
    const existingType = await c.env.DB.prepare(`
      SELECT id FROM business_types WHERE code = ?
    `).bind(code).first();
    
    if (existingType) {
      return c.json({ success: false, error: 'Business type code already exists' }, 400);
    }
    
    const id = `bt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await c.env.DB.prepare(`
      INSERT INTO business_types (id, name, code, description, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, name, code, description, isActive ? 1 : 0).run();
    
    if (result.success) {
      return c.json({ success: true, data: { id }, message: 'Business type created successfully' });
    } else {
      throw new Error('Failed to create business type');
    }
  } catch (error) {
    console.error('Error creating business type:', error);
    return c.json({ success: false, error: 'Failed to create business type' }, 500);
  }
});

// 更新业务类型
businessTypeRoutes.put('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'business_types', 'update')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    const { name, code, description, isActive } = await c.req.json();
    
    // 检查业务类型是否存在
    const existingType = await c.env.DB.prepare(`
      SELECT id FROM business_types WHERE id = ?
    `).bind(id).first();
    
    if (!existingType) {
      return c.json({ success: false, error: 'Business type not found' }, 404);
    }
    
    // 如果更新代码，检查是否与其他记录冲突
    if (code) {
      const conflictingType = await c.env.DB.prepare(`
        SELECT id FROM business_types WHERE code = ? AND id != ?
      `).bind(code, id).first();
      
      if (conflictingType) {
        return c.json({ success: false, error: 'Business type code already exists' }, 400);
      }
    }
    
    const result = await c.env.DB.prepare(`
      UPDATE business_types SET
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        description = ?,
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(name, code, description, isActive !== undefined ? (isActive ? 1 : 0) : null, id).run();
    
    if (result.success) {
      return c.json({ success: true, message: 'Business type updated successfully' });
    } else {
      throw new Error('Failed to update business type');
    }
  } catch (error) {
    console.error('Error updating business type:', error);
    return c.json({ success: false, error: 'Failed to update business type' }, 500);
  }
});

// 删除业务类型（软删除）
businessTypeRoutes.delete('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'business_types', 'delete')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    
    // 检查是否有关联的价格记录
    const relatedPrices = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM prices WHERE business_type_id = ? AND is_active = 1
    `).bind(id).first();
    
    if (relatedPrices && relatedPrices.count > 0) {
      return c.json({
        success: false,
        error: 'Cannot delete business type with active price records'
      }, 400);
    }
    
    const result = await c.env.DB.prepare(`
      UPDATE business_types SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_active = 1
    `).bind(id).run();
    
    if (result.success && result.changes > 0) {
      return c.json({ success: true, message: 'Business type deleted successfully' });
    } else {
      return c.json({ success: false, error: 'Business type not found' }, 404);
    }
  } catch (error) {
    console.error('Error deleting business type:', error);
    return c.json({ success: false, error: 'Failed to delete business type' }, 500);
  }
});

// 获取业务类型统计信息
businessTypeRoutes.get('/:id/stats', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'business_types', 'view')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    
    // 检查业务类型是否存在
    const businessType = await c.env.DB.prepare(`
      SELECT * FROM business_types WHERE id = ?
    `).bind(id).first();
    
    if (!businessType) {
      return c.json({ success: false, error: 'Business type not found' }, 404);
    }
    
    // 获取相关价格统计
    const priceStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_prices,
        COUNT(CASE WHEN price_type = 'cost' THEN 1 END) as cost_prices,
        COUNT(CASE WHEN price_type = 'public' THEN 1 END) as public_prices,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM prices 
      WHERE business_type_id = ? AND is_active = 1
    `).bind(id).first();
    
    // 获取相关咨询统计
    const inquiryStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_inquiries,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_inquiries,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_inquiries,
        COUNT(CASE WHEN status = 'quoted' THEN 1 END) as quoted_inquiries,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_inquiries
      FROM customer_inquiries 
      WHERE business_type = ?
    `).bind(businessType.code).first();
    
    return c.json({
      success: true,
      data: {
        businessType,
        priceStats,
        inquiryStats
      }
    });
  } catch (error) {
    console.error('Error fetching business type stats:', error);
    return c.json({ success: false, error: 'Failed to fetch business type stats' }, 500);
  }
});
