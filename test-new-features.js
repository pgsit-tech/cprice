#!/usr/bin/env node

/**
 * CPrice系统新功能测试脚本
 * 测试导出、导入、系统设置等新功能
 */

const https = require('https');

// 配置
const API_BASE_URL = 'https://cprice-api.20990909.xyz';
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

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
        'User-Agent': 'CPrice-Feature-Tester/1.0',
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

// 获取管理员令牌
async function getAdminToken() {
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: ADMIN_CREDENTIALS
    });
    
    if (response.status === 200 && response.data.success) {
      return response.data.data.token;
    }
    return null;
  } catch (error) {
    console.error('获取管理员令牌失败:', error.message);
    return null;
  }
}

// 测试新功能
async function testNewFeatures() {
  console.log('🚀 开始测试CPrice系统新功能...\n');
  
  // 获取管理员令牌
  console.log('🔐 获取管理员令牌...');
  const token = await getAdminToken();
  if (!token) {
    console.log('❌ 无法获取管理员令牌，测试终止');
    return;
  }
  console.log('✅ 管理员令牌获取成功\n');
  
  const authHeaders = { 'Authorization': `Bearer ${token}` };
  
  // 测试结果
  const results = {
    publicSettings: false,
    settingsManagement: false,
    priceExport: false,
    priceImport: false,
    inquiryExport: false
  };
  
  // 1. 测试公开系统设置
  console.log('📋 测试公开系统设置...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/public/settings`);
    if (response.status === 200 && response.data.success) {
      console.log('✅ 公开系统设置正常');
      console.log('📊 设置项:', Object.keys(response.data.data).join(', '));
      results.publicSettings = true;
    } else {
      console.log(`❌ 公开系统设置失败: ${response.status}`);
    }
  } catch (error) {
    console.log(`💥 公开系统设置错误: ${error.message}`);
  }
  
  // 2. 测试系统设置管理
  console.log('\n⚙️ 测试系统设置管理...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/settings`, {
      headers: authHeaders
    });
    if (response.status === 200 && response.data.success) {
      console.log('✅ 系统设置管理正常');
      console.log('📊 管理设置项:', Object.keys(response.data.data).length);
      results.settingsManagement = true;
    } else {
      console.log(`❌ 系统设置管理失败: ${response.status}`);
    }
  } catch (error) {
    console.log(`💥 系统设置管理错误: ${error.message}`);
  }
  
  // 3. 测试价格导出
  console.log('\n📤 测试价格导出...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/prices/export/data?format=csv`, {
      headers: authHeaders
    });
    if (response.status === 200) {
      console.log('✅ 价格导出功能正常');
      console.log('📊 导出格式: CSV');
      results.priceExport = true;
    } else {
      console.log(`❌ 价格导出失败: ${response.status}`);
    }
  } catch (error) {
    console.log(`💥 价格导出错误: ${error.message}`);
  }
  
  // 4. 测试价格导入
  console.log('\n📥 测试价格导入...');
  try {
    const testData = [
      {
        businessTypeCode: 'SEA',
        origin: '上海',
        destination: '洛杉矶',
        priceType: 'public',
        price: 1500,
        currency: 'CNY',
        unit: '20GP',
        validFrom: '2024-01-01',
        description: '测试导入价格'
      }
    ];
    
    const response = await makeRequest(`${API_BASE_URL}/api/prices/import/data`, {
      method: 'POST',
      headers: authHeaders,
      body: { data: testData }
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ 价格导入功能正常');
      console.log('📊 导入结果:', response.data.message);
      results.priceImport = true;
    } else {
      console.log(`❌ 价格导入失败: ${response.status}`);
      if (response.data.error) {
        console.log(`   错误: ${response.data.error}`);
      }
    }
  } catch (error) {
    console.log(`💥 价格导入错误: ${error.message}`);
  }
  
  // 5. 测试咨询导出
  console.log('\n📤 测试咨询导出...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/inquiries/export/data?format=csv`, {
      headers: authHeaders
    });
    if (response.status === 200) {
      console.log('✅ 咨询导出功能正常');
      console.log('📊 导出格式: CSV');
      results.inquiryExport = true;
    } else {
      console.log(`❌ 咨询导出失败: ${response.status}`);
    }
  } catch (error) {
    console.log(`💥 咨询导出错误: ${error.message}`);
  }
  
  // 生成测试报告
  console.log('\n' + '='.repeat(60));
  console.log('📊 新功能测试报告');
  console.log('='.repeat(60));
  
  const features = [
    { name: '公开系统设置', status: results.publicSettings },
    { name: '系统设置管理', status: results.settingsManagement },
    { name: '价格数据导出', status: results.priceExport },
    { name: '价格数据导入', status: results.priceImport },
    { name: '咨询数据导出', status: results.inquiryExport }
  ];
  
  features.forEach(feature => {
    console.log(`${feature.status ? '✅' : '❌'} ${feature.name}`);
  });
  
  const successCount = features.filter(f => f.status).length;
  const totalCount = features.length;
  
  console.log('\n📈 测试统计:');
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${totalCount - successCount}`);
  console.log(`📊 成功率: ${Math.round(successCount / totalCount * 100)}%`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 所有新功能测试通过！');
  } else {
    console.log('\n⚠️ 部分功能需要进一步调试');
    console.log('💡 建议: 检查API部署状态和数据库表结构');
  }
}

// 运行测试
if (require.main === module) {
  testNewFeatures().catch(console.error);
}

module.exports = { testNewFeatures };
