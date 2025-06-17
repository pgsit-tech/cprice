#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 通过API调用初始化数据库
 */

const https = require('https');

// 配置
const API_BASE_URL = 'https://cprice-api-dev.20990909.xyz';

// HTTP请求工具函数
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CPrice-DB-Init/1.0',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// 初始化数据库
async function initializeDatabase() {
  console.log('🚀 开始数据库初始化...\n');
  
  try {
    console.log('📡 调用数据库初始化API...');
    const response = await makeRequest(`${API_BASE_URL}/init-db`, {
      method: 'POST'
    });
    
    console.log(`📊 响应状态: ${response.status}`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ 数据库初始化成功！');
      console.log('📋 初始化数据:');
      if (response.data.data) {
        console.log(`   - 业务类型: ${response.data.data.businessTypes} 条`);
        console.log(`   - 权限配置: ${response.data.data.permissions} 条`);
        console.log(`   - 管理员用户: ${response.data.data.adminUser} 个`);
      }
      console.log(`💬 消息: ${response.data.message}`);
      
      // 验证初始化结果
      await verifyInitialization();
      
    } else {
      console.log('❌ 数据库初始化失败');
      console.log('错误:', response.data.error);
      if (response.data.details) {
        console.log('详情:', response.data.details);
      }
    }
    
  } catch (error) {
    console.log('💥 初始化请求失败:', error.message);
  }
}

// 验证初始化结果
async function verifyInitialization() {
  console.log('\n🔍 验证初始化结果...');
  
  try {
    // 测试业务类型查询
    console.log('📋 测试业务类型查询...');
    const btResponse = await makeRequest(`${API_BASE_URL}/api/public/business-types`);
    
    if (btResponse.status === 200 && btResponse.data.success) {
      console.log(`✅ 业务类型查询成功: ${btResponse.data.data.length} 条记录`);
      btResponse.data.data.forEach(bt => {
        console.log(`   - ${bt.name} (${bt.code}): ${bt.description}`);
      });
    } else {
      console.log('❌ 业务类型查询失败');
      console.log('状态:', btResponse.status);
      console.log('错误:', btResponse.data.error);
    }
    
    // 测试管理员登录
    console.log('\n🔐 测试管理员登录...');
    const loginResponse = await makeRequest(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
    if (loginResponse.status === 200 && loginResponse.data.success) {
      console.log('✅ 管理员登录成功');
      console.log('🔑 JWT令牌已生成');
      console.log(`👤 用户信息: ${loginResponse.data.data.user.username} (${loginResponse.data.data.user.role})`);
      console.log(`🛡️ 权限数量: ${loginResponse.data.data.user.permissions.length}`);
      
      // 测试受保护的API
      await testProtectedAPIs(loginResponse.data.data.token);
      
    } else {
      console.log('❌ 管理员登录失败');
      console.log('状态:', loginResponse.status);
      console.log('错误:', loginResponse.data.error);
    }
    
  } catch (error) {
    console.log('💥 验证过程出错:', error.message);
  }
}

// 测试受保护的API
async function testProtectedAPIs(token) {
  console.log('\n🛡️ 测试受保护的API...');
  
  const testCases = [
    { name: '仪表板统计', url: '/api/dashboard/stats' },
    { name: '用户列表', url: '/api/users' },
    { name: '业务类型管理', url: '/api/business-types' }
  ];
  
  for (const testCase of testCases) {
    try {
      const response = await makeRequest(`${API_BASE_URL}${testCase.url}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 200 && response.data.success) {
        console.log(`✅ ${testCase.name}: 正常`);
      } else {
        console.log(`❌ ${testCase.name}: 失败 (${response.status})`);
        if (response.data.error) {
          console.log(`   错误: ${response.data.error}`);
        }
      }
    } catch (error) {
      console.log(`💥 ${testCase.name}: 请求错误 (${error.message})`);
    }
  }
}

// 主函数
async function main() {
  console.log('🎯 CPrice 数据库初始化工具');
  console.log('=' .repeat(50));
  console.log(`📍 API地址: ${API_BASE_URL}\n`);
  
  await initializeDatabase();
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 数据库初始化流程完成！');
}

// 运行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { initializeDatabase, verifyInitialization };
