import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { Env } from '../index';

export const authRoutes = new Hono<{ Bindings: Env }>();

// 简单的密码哈希函数（生产环境应使用更安全的方法）
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password);
  return hashedPassword === hash;
}

// 登录
authRoutes.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    
    if (!username || !password) {
      return c.json({ success: false, error: 'Username and password are required' }, 400);
    }
    
    // 查询用户
    const user = await c.env.DB.prepare(`
      SELECT id, username, email, password_hash, role, is_active
      FROM users
      WHERE username = ? AND is_active = 1
    `).bind(username).first();
    
    if (!user) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }
    
    // 验证密码
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }
    
    // 获取用户权限
    const permissions = await c.env.DB.prepare(`
      SELECT p.module, p.action
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = ?
    `).bind(user.id).all();
    
    // 生成JWT token
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: permissions.results,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24小时过期
    };
    
    const token = await sign(payload, c.env.JWT_SECRET);
    
    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: permissions.results,
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

// 验证token
authRoutes.post('/verify', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'No token provided' }, 401);
    }
    
    const token = authHeader.substring(7);
    const payload = await verify(token, c.env.JWT_SECRET);
    
    // 检查用户是否仍然活跃
    const user = await c.env.DB.prepare(`
      SELECT id, username, email, role, is_active
      FROM users
      WHERE id = ? AND is_active = 1
    `).bind(payload.userId).first();
    
    if (!user) {
      return c.json({ success: false, error: 'User not found or inactive' }, 401);
    }
    
    // 获取最新权限
    const permissions = await c.env.DB.prepare(`
      SELECT p.module, p.action
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = ?
    `).bind(user.id).all();
    
    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: permissions.results,
        }
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return c.json({ success: false, error: 'Invalid token' }, 401);
  }
});

// 注册（仅管理员可用）
authRoutes.post('/register', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }
    
    const token = authHeader.substring(7);
    const payload = await verify(token, c.env.JWT_SECRET);
    
    // 检查是否为管理员
    if (payload.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }
    
    const { username, email, password, role = 'user' } = await c.req.json();
    
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
    
    // 创建新用户
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const passwordHash = await hashPassword(password);
    
    const result = await c.env.DB.prepare(`
      INSERT INTO users (id, username, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).bind(userId, username, email, passwordHash, role).run();
    
    if (result.success) {
      return c.json({
        success: true,
        data: {
          id: userId,
          username,
          email,
          role
        }
      });
    } else {
      throw new Error('Failed to create user');
    }
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ success: false, error: 'Registration failed' }, 500);
  }
});

// 修改密码
authRoutes.post('/change-password', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }
    
    const token = authHeader.substring(7);
    const payload = await verify(token, c.env.JWT_SECRET);
    
    const { currentPassword, newPassword } = await c.req.json();
    
    if (!currentPassword || !newPassword) {
      return c.json({ success: false, error: 'Current password and new password are required' }, 400);
    }
    
    // 获取当前用户
    const user = await c.env.DB.prepare(`
      SELECT password_hash FROM users WHERE id = ?
    `).bind(payload.userId).first();
    
    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }
    
    // 验证当前密码
    const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return c.json({ success: false, error: 'Current password is incorrect' }, 400);
    }
    
    // 更新密码
    const newPasswordHash = await hashPassword(newPassword);
    const result = await c.env.DB.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newPasswordHash, payload.userId).run();
    
    if (result.success) {
      return c.json({ success: true, message: 'Password changed successfully' });
    } else {
      throw new Error('Failed to update password');
    }
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ success: false, error: 'Failed to change password' }, 500);
  }
});
