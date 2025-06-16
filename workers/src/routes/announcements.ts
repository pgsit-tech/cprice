import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { Env } from '../index';

export const announcementRoutes = new Hono<{ Bindings: Env }>();

// 检查权限的辅助函数
function hasPermission(permissions: any[], module: string, action: string): boolean {
  return permissions.some(p => p.module === module && p.action === action);
}

// 获取公告列表
announcementRoutes.get('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'announcements', 'view')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const {
      page = '1',
      pageSize = '20',
      search,
      priority,
      isActive,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = c.req.query();
    
    let query = `
      SELECT a.*, u.username as created_by_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (search) {
      query += ` AND (a.title LIKE ? OR a.content LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (priority) {
      query += ` AND a.priority = ?`;
      params.push(priority);
    }
    
    if (isActive !== undefined) {
      query += ` AND a.is_active = ?`;
      params.push(isActive === 'true' ? 1 : 0);
    }
    
    // 计算总数
    const countQuery = query.replace(
      'SELECT a.*, u.username as created_by_name',
      'SELECT COUNT(*) as total'
    );
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    
    // 分页查询
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const validSortColumns = ['created_at', 'title', 'priority'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY a.${sortColumn} ${order} LIMIT ? OFFSET ?`;
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
    console.error('Error fetching announcements:', error);
    return c.json({ success: false, error: 'Failed to fetch announcements' }, 500);
  }
});

// 获取单个公告
announcementRoutes.get('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'announcements', 'view')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    
    const result = await c.env.DB.prepare(`
      SELECT a.*, u.username as created_by_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `).bind(id).first();
    
    if (!result) {
      return c.json({ success: false, error: 'Announcement not found' }, 404);
    }
    
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return c.json({ success: false, error: 'Failed to fetch announcement' }, 500);
  }
});

// 创建公告
announcementRoutes.post('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'announcements', 'create')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const { title, content, priority = 'medium', isActive = true } = await c.req.json();
    
    // 验证必填字段
    if (!title || !content) {
      return c.json({ success: false, error: 'Title and content are required' }, 400);
    }
    
    // 验证优先级
    if (!['low', 'medium', 'high'].includes(priority)) {
      return c.json({ success: false, error: 'Invalid priority' }, 400);
    }
    
    const id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await c.env.DB.prepare(`
      INSERT INTO announcements (id, title, content, priority, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, title, content, priority, isActive ? 1 : 0, payload.userId).run();
    
    if (result.success) {
      return c.json({ success: true, data: { id }, message: 'Announcement created successfully' });
    } else {
      throw new Error('Failed to create announcement');
    }
  } catch (error) {
    console.error('Error creating announcement:', error);
    return c.json({ success: false, error: 'Failed to create announcement' }, 500);
  }
});

// 更新公告
announcementRoutes.put('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'announcements', 'update')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    const { title, content, priority, isActive } = await c.req.json();
    
    // 检查公告是否存在
    const existingAnnouncement = await c.env.DB.prepare(`
      SELECT id FROM announcements WHERE id = ?
    `).bind(id).first();
    
    if (!existingAnnouncement) {
      return c.json({ success: false, error: 'Announcement not found' }, 404);
    }
    
    // 验证优先级
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return c.json({ success: false, error: 'Invalid priority' }, 400);
    }
    
    const result = await c.env.DB.prepare(`
      UPDATE announcements SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        priority = COALESCE(?, priority),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(title, content, priority, isActive !== undefined ? (isActive ? 1 : 0) : null, id).run();
    
    if (result.success) {
      return c.json({ success: true, message: 'Announcement updated successfully' });
    } else {
      throw new Error('Failed to update announcement');
    }
  } catch (error) {
    console.error('Error updating announcement:', error);
    return c.json({ success: false, error: 'Failed to update announcement' }, 500);
  }
});

// 删除公告
announcementRoutes.delete('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'announcements', 'delete')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    
    const result = await c.env.DB.prepare(`
      DELETE FROM announcements WHERE id = ?
    `).bind(id).run();
    
    if (result.success && result.changes > 0) {
      return c.json({ success: true, message: 'Announcement deleted successfully' });
    } else {
      return c.json({ success: false, error: 'Announcement not found' }, 404);
    }
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return c.json({ success: false, error: 'Failed to delete announcement' }, 500);
  }
});

// 批量更新公告状态
announcementRoutes.put('/batch/status', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'announcements', 'update')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const { ids, isActive } = await c.req.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ success: false, error: 'Invalid IDs array' }, 400);
    }
    
    if (typeof isActive !== 'boolean') {
      return c.json({ success: false, error: 'isActive must be a boolean' }, 400);
    }
    
    const placeholders = ids.map(() => '?').join(',');
    const result = await c.env.DB.prepare(`
      UPDATE announcements SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `).bind(isActive ? 1 : 0, ...ids).run();
    
    if (result.success) {
      return c.json({
        success: true,
        message: `${result.changes} announcements updated successfully`
      });
    } else {
      throw new Error('Failed to update announcements');
    }
  } catch (error) {
    console.error('Error batch updating announcements:', error);
    return c.json({ success: false, error: 'Failed to update announcements' }, 500);
  }
});
