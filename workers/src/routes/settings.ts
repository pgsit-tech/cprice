import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { Env } from '../index';

export const settingsRoutes = new Hono<{ Bindings: Env }>();

// 检查权限的辅助函数
function hasPermission(permissions: any[], module: string, action: string): boolean {
  return permissions.some(p => p.module === module && p.action === action);
}

// 获取系统设置
settingsRoutes.get('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    // 只有管理员可以查看系统设置
    if (payload.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }
    
    // 从数据库获取系统设置
    const settings = await c.env.DB.prepare(`
      SELECT * FROM system_settings ORDER BY key
    `).all();
    
    // 转换为键值对格式
    let settingsMap: any = {};
    settings.results?.forEach((setting: any) => {
      settingsMap[setting.key] = {
        value: setting.value,
        type: setting.type,
        description: setting.description,
        updated_at: setting.updated_at
      };
    });

    // 如果没有设置，返回默认值
    if (Object.keys(settingsMap).length === 0) {
      settingsMap = {
        system_name: {
          value: 'CPrice 物流价格系统',
          type: 'string',
          description: '系统名称'
        },
        system_subtitle: {
          value: '专业的货运代理物流服务平台',
          type: 'string',
          description: '系统副标题'
        },
        system_logo: {
          value: '',
          type: 'string',
          description: '系统图标URL'
        },
        footer_text: {
          value: '© 2024 CPrice 物流. 保留所有权利.',
          type: 'string',
          description: '页脚文本'
        },
        contact_email: {
          value: 'contact@cprice.com',
          type: 'string',
          description: '联系邮箱'
        },
        contact_phone: {
          value: '400-123-4567',
          type: 'string',
          description: '联系电话'
        },
        company_address: {
          value: '中国上海市浦东新区',
          type: 'string',
          description: '公司地址'
        }
      };
    }
    
    return c.json({ success: true, data: settingsMap });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return c.json({ success: false, error: 'Failed to fetch settings' }, 500);
  }
});

// 更新系统设置
settingsRoutes.put('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    // 只有管理员可以修改系统设置
    if (payload.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }
    
    const settings = await c.req.json();
    
    if (!settings || typeof settings !== 'object') {
      return c.json({ success: false, error: 'Invalid settings data' }, 400);
    }
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    // 定义允许的设置键和类型
    const allowedSettings = {
      system_name: { type: 'string', description: '系统名称' },
      system_subtitle: { type: 'string', description: '系统副标题' },
      system_logo: { type: 'string', description: '系统图标URL' },
      footer_text: { type: 'string', description: '页脚文本' },
      contact_email: { type: 'string', description: '联系邮箱' },
      contact_phone: { type: 'string', description: '联系电话' },
      company_address: { type: 'string', description: '公司地址' }
    };
    
    for (const [key, value] of Object.entries(settings)) {
      try {
        // 验证设置键是否允许
        if (!allowedSettings[key as keyof typeof allowedSettings]) {
          results.failed++;
          results.errors.push(`不允许的设置键: ${key}`);
          continue;
        }
        
        const settingConfig = allowedSettings[key as keyof typeof allowedSettings];
        
        // 验证值类型
        if (settingConfig.type === 'string' && typeof value !== 'string') {
          results.failed++;
          results.errors.push(`${key}: 值必须是字符串类型`);
          continue;
        }
        
        // 更新或插入设置
        const result = await c.env.DB.prepare(`
          INSERT OR REPLACE INTO system_settings (key, value, type, description, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(key, value, settingConfig.type, settingConfig.description).run();
        
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`${key}: 数据库更新失败`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`${key}: ${error.message}`);
      }
    }
    
    return c.json({
      success: true,
      data: results,
      message: `设置更新完成: 成功 ${results.success} 项，失败 ${results.failed} 项`
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return c.json({ success: false, error: 'Failed to update settings' }, 500);
  }
});

// 重置系统设置为默认值
settingsRoutes.post('/reset', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    const payload = await verify(token!, c.env.JWT_SECRET);
    
    // 只有管理员可以重置系统设置
    if (payload.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }
    
    // 删除所有现有设置
    await c.env.DB.prepare(`DELETE FROM system_settings`).run();
    
    // 插入默认设置
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
        INSERT INTO system_settings (key, value, type, description, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(setting.key, setting.value, setting.type, setting.description).run();
    }
    
    return c.json({ success: true, message: '系统设置已重置为默认值' });
  } catch (error) {
    console.error('Error resetting settings:', error);
    return c.json({ success: false, error: 'Failed to reset settings' }, 500);
  }
});

// 获取公开系统信息（不需要认证）
settingsRoutes.get('/public', async (c) => {
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
