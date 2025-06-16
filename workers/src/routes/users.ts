import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { Env } from '../index';

export const userRoutes = new Hono<{ Bindings: Env }>();

// 检查权限的辅助函数
function hasPermission(permissions: any[], module: string, action: string): boolean {
  return permissions.some(p => p.module === module && p.action === action);
}

// 简单的密码哈希函数
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 获取用户列表
userRoutes.get('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'users', 'view')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const {
      page = '1',
      pageSize = '20',
      search,
      role,
      isActive,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = c.req.query();
    
    let query = `
      SELECT id, username, email, role, is_active, created_at, updated_at
      FROM users WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (search) {
      query += ` AND (username LIKE ? OR email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (role) {
      query += ` AND role = ?`;
      params.push(role);
    }
    
    if (isActive !== undefined) {
      query += ` AND is_active = ?`;
      params.push(isActive === 'true' ? 1 : 0);
    }
    
    // 计算总数
    const countQuery = query.replace(
      'SELECT id, username, email, role, is_active, created_at, updated_at',
      'SELECT COUNT(*) as total'
    );
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    
    // 分页查询
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const validSortColumns = ['created_at', 'username', 'email', 'role'];
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
    console.error('Error fetching users:', error);
    return c.json({ success: false, error: 'Failed to fetch users' }, 500);
  }
});

// 获取单个用户
userRoutes.get('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'users', 'view')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    
    const user = await c.env.DB.prepare(`
      SELECT id, username, email, role, is_active, created_at, updated_at
      FROM users WHERE id = ?
    `).bind(id).first();
    
    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }
    
    // 获取用户权限
    const permissions = await c.env.DB.prepare(`
      SELECT p.id, p.module, p.action, p.description
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = ?
    `).bind(id).all();
    
    return c.json({
      success: true,
      data: {
        ...user,
        permissions: permissions.results
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return c.json({ success: false, error: 'Failed to fetch user' }, 500);
  }
});

// 创建用户
userRoutes.post('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'users', 'create')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const { username, email, password, role = 'user', permissions = [] } = await c.req.json();
    
    // 验证必填字段
    if (!username || !email || !password) {
      return c.json({ success: false, error: 'Username, email, and password are required' }, 400);
    }
    
    // 检查用户名和邮箱是否已存在
    const existingUser = await c.env.DB.prepare(`
      SELECT id FROM users WHERE username = ? OR email = ?
    `).bind(username, email).first();
    
    if (existingUser) {
      return c.json({ success: false, error: 'Username or email already exists' }, 400);
    }
    
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const passwordHash = await hashPassword(password);
    
    // 创建用户
    const userResult = await c.env.DB.prepare(`
      INSERT INTO users (id, username, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).bind(userId, username, email, passwordHash, role).run();
    
    if (!userResult.success) {
      throw new Error('Failed to create user');
    }
    
    // 分配权限
    if (permissions.length > 0) {
      for (const permissionId of permissions) {
        await c.env.DB.prepare(`
          INSERT INTO user_permissions (user_id, permission_id)
          VALUES (?, ?)
        `).bind(userId, permissionId).run();
      }
    }
    
    return c.json({
      success: true,
      data: { id: userId },
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return c.json({ success: false, error: 'Failed to create user' }, 500);
  }
});

// 更新用户
userRoutes.put('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'users', 'update')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    const { username, email, role, isActive, permissions } = await c.req.json();
    
    // 检查用户是否存在
    const existingUser = await c.env.DB.prepare(`
      SELECT id FROM users WHERE id = ?
    `).bind(id).first();
    
    if (!existingUser) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }
    
    // 检查用户名和邮箱是否与其他用户冲突
    if (username || email) {
      const conflictingUser = await c.env.DB.prepare(`
        SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?
      `).bind(username || '', email || '', id).first();
      
      if (conflictingUser) {
        return c.json({ success: false, error: 'Username or email already exists' }, 400);
      }
    }
    
    // 更新用户信息
    const result = await c.env.DB.prepare(`
      UPDATE users SET
        username = COALESCE(?, username),
        email = COALESCE(?, email),
        role = COALESCE(?, role),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(username, email, role, isActive !== undefined ? (isActive ? 1 : 0) : null, id).run();
    
    if (!result.success) {
      throw new Error('Failed to update user');
    }
    
    // 更新权限
    if (permissions !== undefined) {
      // 删除现有权限
      await c.env.DB.prepare(`
        DELETE FROM user_permissions WHERE user_id = ?
      `).bind(id).run();
      
      // 添加新权限
      if (permissions.length > 0) {
        for (const permissionId of permissions) {
          await c.env.DB.prepare(`
            INSERT INTO user_permissions (user_id, permission_id)
            VALUES (?, ?)
          `).bind(id, permissionId).run();
        }
      }
    }
    
    return c.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ success: false, error: 'Failed to update user' }, 500);
  }
});

// 删除用户（软删除）
userRoutes.delete('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'users', 'delete')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    
    // 不能删除自己
    if (id === payload.userId) {
      return c.json({ success: false, error: 'Cannot delete yourself' }, 400);
    }
    
    const result = await c.env.DB.prepare(`
      UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_active = 1
    `).bind(id).run();
    
    if (result.success && result.changes > 0) {
      return c.json({ success: true, message: 'User deleted successfully' });
    } else {
      return c.json({ success: false, error: 'User not found' }, 404);
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ success: false, error: 'Failed to delete user' }, 500);
  }
});

// 获取所有权限
userRoutes.get('/permissions/all', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'users', 'view')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const result = await c.env.DB.prepare(`
      SELECT * FROM permissions ORDER BY module, action
    `).all();
    
    return c.json({ success: true, data: result.results });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return c.json({ success: false, error: 'Failed to fetch permissions' }, 500);
  }
});

// 重置用户密码
userRoutes.post('/:id/reset-password', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    if (!hasPermission(payload.permissions, 'users', 'update')) {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    const id = c.req.param('id');
    const { newPassword } = await c.req.json();
    
    if (!newPassword) {
      return c.json({ success: false, error: 'New password is required' }, 400);
    }
    
    // 检查用户是否存在
    const user = await c.env.DB.prepare(`
      SELECT id FROM users WHERE id = ? AND is_active = 1
    `).bind(id).first();
    
    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }
    
    const passwordHash = await hashPassword(newPassword);
    
    const result = await c.env.DB.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(passwordHash, id).run();
    
    if (result.success) {
      return c.json({ success: true, message: 'Password reset successfully' });
    } else {
      throw new Error('Failed to reset password');
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    return c.json({ success: false, error: 'Failed to reset password' }, 500);
  }
});
