import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { Env } from '../index';

export const dashboardRoutes = new Hono<{ Bindings: Env }>();

// 获取仪表板数据
dashboardRoutes.get('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    // 获取最新5条公告
    const announcements = await c.env.DB.prepare(`
      SELECT a.*, u.username as created_by_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.is_active = 1
      ORDER BY a.priority DESC, a.created_at DESC
      LIMIT 5
    `).all();
    
    // 获取未处理的咨询表单（待抢单）
    const pendingInquiries = await c.env.DB.prepare(`
      SELECT *
      FROM customer_inquiries
      WHERE status = 'pending'
      ORDER BY created_at DESC
      LIMIT 10
    `).all();
    
    // 获取已被抢单的咨询（显示加密联系方式）
    const assignedInquiries = await c.env.DB.prepare(`
      SELECT ci.*, u.username as assigned_to_name
      FROM customer_inquiries ci
      LEFT JOIN users u ON ci.assigned_to = u.id
      WHERE ci.status = 'assigned' AND ci.assigned_to != ?
      ORDER BY ci.assigned_at DESC
      LIMIT 10
    `).bind(payload.userId).all();
    
    // 加密联系方式
    const encryptedAssignedInquiries = assignedInquiries.results?.map((inquiry: any) => ({
      ...inquiry,
      customer_email: inquiry.customer_email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      customer_phone: inquiry.customer_phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    }));
    
    // 获取我抢单的咨询
    const myInquiries = await c.env.DB.prepare(`
      SELECT *
      FROM customer_inquiries
      WHERE assigned_to = ? AND status IN ('assigned', 'quoted')
      ORDER BY assigned_at DESC
      LIMIT 10
    `).bind(payload.userId).all();
    
    // 统计数据
    const stats = {
      totalPrices: 0,
      totalInquiries: 0,
      pendingInquiries: 0,
      myInquiries: 0,
    };
    
    // 获取价格统计
    const priceCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM prices WHERE is_active = 1
    `).first();
    stats.totalPrices = priceCount?.count || 0;
    
    // 获取咨询统计
    const inquiryCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM customer_inquiries
    `).first();
    stats.totalInquiries = inquiryCount?.count || 0;
    
    // 获取待处理咨询统计
    const pendingCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM customer_inquiries WHERE status = 'pending'
    `).first();
    stats.pendingInquiries = pendingCount?.count || 0;
    
    // 获取我的咨询统计
    const myCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM customer_inquiries WHERE assigned_to = ?
    `).bind(payload.userId).first();
    stats.myInquiries = myCount?.count || 0;
    
    return c.json({
      success: true,
      data: {
        announcements: announcements.results,
        pendingInquiries: pendingInquiries.results,
        assignedInquiries: encryptedAssignedInquiries,
        myInquiries: myInquiries.results,
        stats
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return c.json({ success: false, error: 'Failed to fetch dashboard data' }, 500);
  }
});

// 抢单功能
dashboardRoutes.post('/claim-inquiry/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    const inquiryId = c.req.param('id');
    
    // 检查咨询是否存在且状态为pending
    const inquiry = await c.env.DB.prepare(`
      SELECT * FROM customer_inquiries WHERE id = ? AND status = 'pending'
    `).bind(inquiryId).first();
    
    if (!inquiry) {
      return c.json({ success: false, error: 'Inquiry not found or already claimed' }, 404);
    }
    
    // 计算自动释放时间（7天后）
    const autoReleaseAt = new Date();
    autoReleaseAt.setDate(autoReleaseAt.getDate() + 7);
    
    // 更新咨询状态
    const result = await c.env.DB.prepare(`
      UPDATE customer_inquiries
      SET status = 'assigned', assigned_to = ?, assigned_at = CURRENT_TIMESTAMP,
          auto_release_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'pending'
    `).bind(payload.userId, autoReleaseAt.toISOString(), inquiryId).run();
    
    if (result.success && result.changes > 0) {
      return c.json({ success: true, message: 'Inquiry claimed successfully' });
    } else {
      return c.json({ success: false, error: 'Failed to claim inquiry' }, 400);
    }
  } catch (error) {
    console.error('Claim inquiry error:', error);
    return c.json({ success: false, error: 'Failed to claim inquiry' }, 500);
  }
});

// 释放咨询（手动释放或管理员操作）
dashboardRoutes.post('/release-inquiry/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    const inquiryId = c.req.param('id');
    
    // 检查咨询是否存在
    const inquiry = await c.env.DB.prepare(`
      SELECT * FROM customer_inquiries WHERE id = ?
    `).bind(inquiryId).first();
    
    if (!inquiry) {
      return c.json({ success: false, error: 'Inquiry not found' }, 404);
    }
    
    // 检查权限：只有分配给自己的咨询或管理员可以释放
    if (inquiry.assigned_to !== payload.userId && payload.role !== 'admin') {
      return c.json({ success: false, error: 'Permission denied' }, 403);
    }
    
    // 释放咨询
    const result = await c.env.DB.prepare(`
      UPDATE customer_inquiries
      SET status = 'pending', assigned_to = NULL, assigned_at = NULL,
          auto_release_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(inquiryId).run();
    
    if (result.success) {
      return c.json({ success: true, message: 'Inquiry released successfully' });
    } else {
      return c.json({ success: false, error: 'Failed to release inquiry' }, 500);
    }
  } catch (error) {
    console.error('Release inquiry error:', error);
    return c.json({ success: false, error: 'Failed to release inquiry' }, 500);
  }
});

// 更新咨询状态
dashboardRoutes.put('/inquiry/:id/status', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    const inquiryId = c.req.param('id');
    const { status, notes } = await c.req.json();
    
    if (!['assigned', 'quoted', 'completed'].includes(status)) {
      return c.json({ success: false, error: 'Invalid status' }, 400);
    }
    
    // 检查咨询是否存在且分配给当前用户
    const inquiry = await c.env.DB.prepare(`
      SELECT * FROM customer_inquiries WHERE id = ? AND assigned_to = ?
    `).bind(inquiryId, payload.userId).first();
    
    if (!inquiry) {
      return c.json({ success: false, error: 'Inquiry not found or not assigned to you' }, 404);
    }
    
    // 更新状态
    const result = await c.env.DB.prepare(`
      UPDATE customer_inquiries
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, inquiryId).run();
    
    if (result.success) {
      return c.json({ success: true, message: 'Status updated successfully' });
    } else {
      return c.json({ success: false, error: 'Failed to update status' }, 500);
    }
  } catch (error) {
    console.error('Update inquiry status error:', error);
    return c.json({ success: false, error: 'Failed to update status' }, 500);
  }
});

// 自动释放过期咨询的定时任务（可以通过Cron Triggers调用）
dashboardRoutes.post('/auto-release-expired', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      UPDATE customer_inquiries
      SET status = 'pending', assigned_to = NULL, assigned_at = NULL,
          auto_release_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE status = 'assigned' AND auto_release_at <= datetime('now')
    `).run();
    
    return c.json({
      success: true,
      message: `Released ${result.changes} expired inquiries`
    });
  } catch (error) {
    console.error('Auto release error:', error);
    return c.json({ success: false, error: 'Failed to auto release inquiries' }, 500);
  }
});
