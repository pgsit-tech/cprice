import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { Env } from '../index';

// CSV导出辅助函数
function generateCSV(data: any[], headers: string[]): string {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row =>
    headers.map(header => {
      const value = row[header] || '';
      // 处理包含逗号、引号或换行符的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
}

export const inquiryRoutes = new Hono<{ Bindings: Env }>();

// 检查权限的辅助函数
function hasPermission(permissions: any[], module: string, action: string): boolean {
  return permissions.some(p => p.module === module && p.action === action);
}

// 获取咨询列表
inquiryRoutes.get('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'inquiries', 'view')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const {
      page = '1',
      pageSize = '20',
      search,
      status,
      businessType,
      region,
      assignedTo,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = c.req.query();
    
    let query = `
      SELECT ci.*, u.username as assigned_to_name
      FROM customer_inquiries ci
      LEFT JOIN users u ON ci.assigned_to = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (search) {
      query += ` AND (ci.customer_name LIKE ? OR ci.customer_email LIKE ? OR ci.origin LIKE ? OR ci.destination LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (status) {
      query += ` AND ci.status = ?`;
      params.push(status);
    }
    
    if (businessType) {
      query += ` AND ci.business_type = ?`;
      params.push(businessType);
    }
    
    if (region) {
      query += ` AND ci.customer_region LIKE ?`;
      params.push(`%${region}%`);
    }
    
    if (assignedTo) {
      if (assignedTo === 'me') {
        query += ` AND ci.assigned_to = ?`;
        params.push(payload.userId);
      } else if (assignedTo === 'unassigned') {
        query += ` AND ci.assigned_to IS NULL`;
      } else {
        query += ` AND ci.assigned_to = ?`;
        params.push(assignedTo);
      }
    }
    
    // 计算总数
    const countQuery = query.replace(
      'SELECT ci.*, u.username as assigned_to_name',
      'SELECT COUNT(*) as total'
    );
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    
    // 分页查询
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const validSortColumns = ['created_at', 'customer_name', 'status', 'assigned_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ci.${sortColumn} ${order} LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), offset);
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    // 对于不是分配给当前用户的咨询，加密联系方式
    const processedResults = result.results?.map((inquiry: any) => {
      if (inquiry.assigned_to && inquiry.assigned_to !== payload.userId && payload.role !== 'admin') {
        return {
          ...inquiry,
          customer_email: inquiry.customer_email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          customer_phone: inquiry.customer_phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        };
      }
      return inquiry;
    });
    
    return c.json({
      success: true,
      data: {
        data: processedResults,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return c.json({ success: false, error: 'Failed to fetch inquiries' }, 500);
  }
});

// 获取单个咨询
inquiryRoutes.get('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'inquiries', 'view')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    
    const result = await c.env.DB.prepare(`
      SELECT ci.*, u.username as assigned_to_name
      FROM customer_inquiries ci
      LEFT JOIN users u ON ci.assigned_to = u.id
      WHERE ci.id = ?
    `).bind(id).first();
    
    if (!result) {
      return c.json({ success: false, error: 'Inquiry not found' }, 404);
    }
    
    // 检查权限：只有分配给自己的咨询、管理员或未分配的咨询可以查看完整信息
    if (result.assigned_to && result.assigned_to !== payload.userId && payload.role !== 'admin') {
      // 加密联系方式
      result.customer_email = result.customer_email.replace(/(.{2}).*(@.*)/, '$1***$2');
      result.customer_phone = result.customer_phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }
    
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    return c.json({ success: false, error: 'Failed to fetch inquiry' }, 500);
  }
});

// 更新咨询状态
inquiryRoutes.put('/:id/status', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'inquiries', 'update')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    const { status, notes } = await c.req.json();
    
    if (!['pending', 'assigned', 'quoted', 'completed'].includes(status)) {
      return c.json({ success: false, error: 'Invalid status' }, 400);
    }
    
    // 检查咨询是否存在
    const inquiry = await c.env.DB.prepare(`
      SELECT * FROM customer_inquiries WHERE id = ?
    `).bind(id).first();
    
    if (!inquiry) {
      return c.json({ success: false, error: 'Inquiry not found' }, 404);
    }
    
    // 检查权限：只有分配给自己的咨询或管理员可以更新状态
    if (inquiry.assigned_to !== payload.userId && payload.role !== 'admin') {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const result = await c.env.DB.prepare(`
      UPDATE customer_inquiries
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, id).run();
    
    if (result.success) {
      return c.json({ success: true, message: 'Status updated successfully' });
    } else {
      throw new Error('Failed to update status');
    }
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    return c.json({ success: false, error: 'Failed to update status' }, 500);
  }
});

// 分配咨询
inquiryRoutes.put('/:id/assign', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    // 只有管理员可以分配咨询
    if (payload.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }
    
    const id = c.req.param('id');
    const { assignedTo } = await c.req.json();
    
    // 检查咨询是否存在
    const inquiry = await c.env.DB.prepare(`
      SELECT * FROM customer_inquiries WHERE id = ?
    `).bind(id).first();
    
    if (!inquiry) {
      return c.json({ success: false, error: 'Inquiry not found' }, 404);
    }
    
    // 检查用户是否存在
    if (assignedTo) {
      const user = await c.env.DB.prepare(`
        SELECT id FROM users WHERE id = ? AND is_active = 1
      `).bind(assignedTo).first();
      
      if (!user) {
        return c.json({ success: false, error: 'User not found' }, 400);
      }
    }
    
    // 计算自动释放时间（7天后）
    const autoReleaseAt = assignedTo ? new Date() : null;
    if (autoReleaseAt) {
      autoReleaseAt.setDate(autoReleaseAt.getDate() + 7);
    }
    
    const result = await c.env.DB.prepare(`
      UPDATE customer_inquiries
      SET assigned_to = ?, assigned_at = ?, auto_release_at = ?,
          status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      assignedTo,
      assignedTo ? new Date().toISOString() : null,
      autoReleaseAt ? autoReleaseAt.toISOString() : null,
      assignedTo ? 'assigned' : 'pending',
      id
    ).run();
    
    if (result.success) {
      return c.json({ success: true, message: 'Inquiry assigned successfully' });
    } else {
      throw new Error('Failed to assign inquiry');
    }
  } catch (error) {
    console.error('Error assigning inquiry:', error);
    return c.json({ success: false, error: 'Failed to assign inquiry' }, 500);
  }
});

// 导出咨询数据
inquiryRoutes.get('/export/data', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'inquiries', 'export')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const { status, businessType, region, assignedTo, format = 'csv' } = c.req.query();
    
    let query = `
      SELECT ci.*, u.username as assigned_to_name
      FROM customer_inquiries ci
      LEFT JOIN users u ON ci.assigned_to = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (status) {
      query += ` AND ci.status = ?`;
      params.push(status);
    }
    
    if (businessType) {
      query += ` AND ci.business_type = ?`;
      params.push(businessType);
    }
    
    if (region) {
      query += ` AND ci.customer_region LIKE ?`;
      params.push(`%${region}%`);
    }
    
    if (assignedTo) {
      if (assignedTo === 'me') {
        query += ` AND ci.assigned_to = ?`;
        params.push(payload.userId);
      } else if (assignedTo === 'unassigned') {
        query += ` AND ci.assigned_to IS NULL`;
      } else {
        query += ` AND ci.assigned_to = ?`;
        params.push(assignedTo);
      }
    }
    
    query += ` ORDER BY ci.created_at DESC`;
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    // 对于不是分配给当前用户的咨询，加密联系方式
    const processedResults = result.results?.map((inquiry: any) => {
      if (inquiry.assigned_to && inquiry.assigned_to !== payload.userId && payload.role !== 'admin') {
        return {
          ...inquiry,
          customer_email: inquiry.customer_email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          customer_phone: inquiry.customer_phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        };
      }
      return inquiry;
    });
    
    if (format === 'csv') {
      // 生成CSV格式
      const headers = [
        'ID', '客户姓名', '客户邮箱', '客户电话', '客户地区', '业务类型',
        '起始地', '目的地', '货物描述', '预估重量', '预估体积', '预期发货日期',
        '附加要求', '状态', '分配给', '创建时间'
      ];
      
      let csv = headers.join(',') + '\n';
      
      processedResults?.forEach((inquiry: any) => {
        const row = [
          inquiry.id,
          inquiry.customer_name,
          inquiry.customer_email,
          inquiry.customer_phone,
          inquiry.customer_region,
          inquiry.business_type,
          inquiry.origin,
          inquiry.destination,
          inquiry.cargo_description || '',
          inquiry.estimated_weight || '',
          inquiry.estimated_volume || '',
          inquiry.expected_ship_date || '',
          inquiry.additional_requirements || '',
          inquiry.status,
          inquiry.assigned_to_name || '',
          inquiry.created_at
        ];
        csv += row.map(field => `"${field}"`).join(',') + '\n';
      });
      
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="inquiries.csv"'
        }
      });
    }
    
    return c.json({ success: true, data: processedResults });
  } catch (error) {
    console.error('Error exporting inquiries:', error);
    return c.json({ success: false, error: 'Failed to export inquiries' }, 500);
  }
});
