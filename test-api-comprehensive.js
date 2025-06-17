#!/usr/bin/env node

/**
 * CPrice 系统全面API测试脚本
 * 测试所有API端点，识别404错误和功能问题
 */

const https = require('https');
const http = require('http');

// 配置
const API_BASE_URL = 'https://cprice-api.20990909.xyz';
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

// 测试结果存储
const testResults = {
  passed: [],
  failed: [],
  errors: []
};

// HTTP请求工具函数
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CPrice-API-Tester/1.0',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
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

// 测试用例定义
const testCases = [
  // 1. 健康检查
  {
    name: '健康检查',
    url: '/health',
    method: 'GET',
    expectedStatus: 200,
    requiresAuth: false
  },
  
  // 2. 公开API测试
  {
    name: '获取业务类型（公开）',
    url: '/api/public/business-types',
    method: 'GET',
    expectedStatus: 200,
    requiresAuth: false
  },
  {
    name: '获取公开价格',
    url: '/api/public/prices',
    method: 'GET',
    expectedStatus: 200,
    requiresAuth: false
  },
  {
    name: '提交客户咨询',
    url: '/api/public/inquiries',
    method: 'POST',
    expectedStatus: 200,
    requiresAuth: false,
    body: {
      customerName: '测试客户',
      customerEmail: 'test@example.com',
      customerPhone: '13800138000',
      customerRegion: '中国',
      businessType: 'SEA',
      origin: '上海',
      destination: '洛杉矶',
      cargoDescription: '测试货物',
      estimatedWeight: '1000',
      estimatedVolume: '10'
    }
  },
  
  // 3. 认证API测试
  {
    name: '管理员登录',
    url: '/api/auth/login',
    method: 'POST',
    expectedStatus: 200,
    requiresAuth: false,
    body: ADMIN_CREDENTIALS,
    saveToken: true
  },
  
  // 4. 仪表板API测试（需要认证）
  {
    name: '获取仪表板统计',
    url: '/api/dashboard/stats',
    method: 'GET',
    expectedStatus: 200,
    requiresAuth: true
  },
  {
    name: '获取最新公告',
    url: '/api/dashboard/announcements',
    method: 'GET',
    expectedStatus: 200,
    requiresAuth: true
  },
  {
    name: '获取待抢单咨询',
    url: '/api/dashboard/pending-inquiries',
    method: 'GET',
    expectedStatus: 200,
    requiresAuth: true
  },
  
  // 5. 价格管理API测试
  {
    name: '获取价格列表',
    url: '/api/prices',
    method: 'GET',
    expectedStatus: 200,
    requiresAuth: true
  },
  
  // 6. 咨询管理API测试
  {
    name: '获取咨询列表',
    url: '/api/inquiries',
    method: 'GET',
    expectedStatus: 200,
    requiresAuth: true
  },
  
  // 7. 公告管理API测试
  {
    name: '获取公告列表',
    url: '/api/announcements',
    method: 'GET',
    expectedStatus: 200,
    requiresAuth: true
  },
  
  // 8. 业务类型管理API测试
  {
    name: '获取业务类型列表（管理）',
    url: '/api/business-types',
    method: 'GET',
    expectedStatus: 200,
    requiresAuth: true
  },
  
  // 9. 用户管理API测试
  {
    name: '获取用户列表',
    url: '/api/users',
    method: 'GET',
    expectedStatus: 200,
    requiresAuth: true
  }
];

// 执行测试
async function runTests() {
  console.log('🚀 开始CPrice系统API全面测试...\n');
  console.log(`📍 API基础地址: ${API_BASE_URL}\n`);
  
  let authToken = null;
  
  for (const testCase of testCases) {
    try {
      console.log(`🧪 测试: ${testCase.name}`);
      
      const options = {
        method: testCase.method,
        headers: {}
      };
      
      // 添加认证头
      if (testCase.requiresAuth && authToken) {
        options.headers.Authorization = `Bearer ${authToken}`;
      }
      
      // 添加请求体
      if (testCase.body) {
        options.body = testCase.body;
      }
      
      const response = await makeRequest(`${API_BASE_URL}${testCase.url}`, options);
      
      // 保存认证令牌
      if (testCase.saveToken && response.data.token) {
        authToken = response.data.token;
        console.log(`   🔑 已保存认证令牌`);
      }
      
      // 检查响应状态
      if (response.status === testCase.expectedStatus) {
        console.log(`   ✅ 状态码: ${response.status} (期望: ${testCase.expectedStatus})`);
        testResults.passed.push({
          name: testCase.name,
          status: response.status,
          data: response.data
        });
      } else {
        console.log(`   ❌ 状态码: ${response.status} (期望: ${testCase.expectedStatus})`);
        testResults.failed.push({
          name: testCase.name,
          expectedStatus: testCase.expectedStatus,
          actualStatus: response.status,
          data: response.data
        });
      }
      
      // 显示响应数据摘要
      if (response.data && typeof response.data === 'object') {
        if (response.data.success !== undefined) {
          console.log(`   📊 成功状态: ${response.data.success}`);
        }
        if (response.data.data && Array.isArray(response.data.data)) {
          console.log(`   📋 数据条数: ${response.data.data.length}`);
        }
        if (response.data.error) {
          console.log(`   ⚠️  错误信息: ${response.data.error}`);
        }
      }
      
    } catch (error) {
      console.log(`   💥 请求失败: ${error.message}`);
      testResults.errors.push({
        name: testCase.name,
        error: error.message
      });
    }
    
    console.log(''); // 空行分隔
  }
  
  // 输出测试总结
  console.log('📊 测试总结:');
  console.log(`✅ 通过: ${testResults.passed.length}`);
  console.log(`❌ 失败: ${testResults.failed.length}`);
  console.log(`💥 错误: ${testResults.errors.length}`);
  console.log(`📈 总计: ${testCases.length}`);
  
  // 详细失败报告
  if (testResults.failed.length > 0) {
    console.log('\n❌ 失败的测试详情:');
    testResults.failed.forEach(test => {
      console.log(`   - ${test.name}: ${test.actualStatus} (期望: ${test.expectedStatus})`);
      if (test.data && test.data.error) {
        console.log(`     错误: ${test.data.error}`);
      }
    });
  }
  
  // 错误报告
  if (testResults.errors.length > 0) {
    console.log('\n💥 错误的测试详情:');
    testResults.errors.forEach(test => {
      console.log(`   - ${test.name}: ${test.error}`);
    });
  }
  
  return testResults;
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testResults };
