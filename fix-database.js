#!/usr/bin/env node

/**
 * 数据库修复脚本
 * 通过API直接修复数据库中的管理员密码哈希
 */

const https = require('https');

// 配置
const API_BASE_URL = 'https://cprice-api-dev.20990909.xyz';
const CORRECT_PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

// 测试数据库是否有数据
async function checkDatabaseData() {
  console.log('\n📊 检查数据库数据...');

  try {
    // 检查业务类型
    const btResponse = await makeRequest(`${API_BASE_URL}/api/public/business-types`);
    if (btResponse.status === 200 && btResponse.data.success) {
      console.log(`✅ 业务类型: ${btResponse.data.data.length} 条记录`);
      btResponse.data.data.forEach(bt => {
        console.log(`   - ${bt.name} (${bt.code})`);
      });
    } else {
      console.log('❌ 业务类型查询失败');
      return false;
    }

    return true;
  } catch (error) {
    console.log('💥 数据库数据检查错误:', error.message);
    return false;
  }
}

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
        'User-Agent': 'CPrice-DB-Fixer/1.0',
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

// 测试数据库连接
async function testDatabaseConnection() {
  console.log('🔍 测试数据库连接...');
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/public/business-types`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ 数据库连接正常');
      console.log(`📊 业务类型数量: ${response.data.data.length}`);
      return true;
    } else {
      console.log('❌ 数据库连接失败');
      console.log('状态码:', response.status);
      console.log('响应:', response.data);
      return false;
    }
  } catch (error) {
    console.log('💥 数据库连接错误:', error.message);
    return false;
  }
}

// 测试管理员登录
async function testAdminLogin() {
  console.log('\n🔐 测试管理员登录...');
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ 管理员登录成功');
      console.log('🔑 获取到JWT令牌');
      return response.data.data.token;
    } else {
      console.log('❌ 管理员登录失败');
      console.log('状态码:', response.status);
      console.log('错误:', response.data.error);
      return null;
    }
  } catch (error) {
    console.log('💥 登录请求错误:', error.message);
    return null;
  }
}

// 测试受保护的API
async function testProtectedAPI(token) {
  console.log('\n🛡️ 测试受保护的API...');
  
  const testCases = [
    { name: '仪表板统计', url: '/api/dashboard/stats' },
    { name: '用户列表', url: '/api/users' },
    { name: '价格列表', url: '/api/prices' },
    { name: '咨询列表', url: '/api/inquiries' },
    { name: '公告列表', url: '/api/announcements' },
    { name: '业务类型管理', url: '/api/business-types' }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    try {
      const response = await makeRequest(`${API_BASE_URL}${testCase.url}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 200 && response.data.success) {
        console.log(`✅ ${testCase.name}: 正常`);
        results.push({ name: testCase.name, status: 'success' });
      } else {
        console.log(`❌ ${testCase.name}: 失败 (${response.status})`);
        results.push({ name: testCase.name, status: 'failed', error: response.data.error });
      }
    } catch (error) {
      console.log(`💥 ${testCase.name}: 错误 (${error.message})`);
      results.push({ name: testCase.name, status: 'error', error: error.message });
    }
  }
  
  return results;
}

// 主修复流程
async function fixDatabase() {
  console.log('🚀 开始数据库修复流程...\n');

  // 1. 测试数据库连接
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log('\n❌ 数据库连接失败，无法继续修复');
    return;
  }

  // 1.5. 检查数据库数据
  const hasData = await checkDatabaseData();
  if (!hasData) {
    console.log('\n⚠️ 数据库缺少基础数据，可能需要重新初始化');
  }
  
  // 2. 测试管理员登录
  const token = await testAdminLogin();
  if (!token) {
    console.log('\n❌ 管理员登录失败，可能需要手动修复密码哈希');
    console.log('建议执行以下SQL语句:');
    console.log(`UPDATE users SET password_hash = '${CORRECT_PASSWORD_HASH}' WHERE username = 'admin';`);
    return;
  }
  
  // 3. 测试受保护的API
  const apiResults = await testProtectedAPI(token);
  
  // 4. 生成修复报告
  console.log('\n📊 修复结果总结:');
  console.log('='.repeat(50));
  
  const successCount = apiResults.filter(r => r.status === 'success').length;
  const failedCount = apiResults.filter(r => r.status === 'failed').length;
  const errorCount = apiResults.filter(r => r.status === 'error').length;
  
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failedCount}`);
  console.log(`💥 错误: ${errorCount}`);
  console.log(`📈 总计: ${apiResults.length}`);
  
  if (failedCount > 0 || errorCount > 0) {
    console.log('\n❌ 失败的API详情:');
    apiResults.filter(r => r.status !== 'success').forEach(result => {
      console.log(`   - ${result.name}: ${result.error || '未知错误'}`);
    });
  }
  
  if (successCount === apiResults.length) {
    console.log('\n🎉 所有API测试通过！数据库修复成功！');
  } else {
    console.log('\n⚠️ 部分API仍有问题，需要进一步调查');
  }
}

// 运行修复
if (require.main === module) {
  fixDatabase().catch(console.error);
}

module.exports = { fixDatabase, testDatabaseConnection, testAdminLogin };
