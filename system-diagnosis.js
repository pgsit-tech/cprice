#!/usr/bin/env node

/**
 * CPrice系统全面诊断脚本
 * 检查所有组件的状态并提供修复建议
 */

const https = require('https');

// 配置
const FRONTEND_URL = 'https://cprice.pgs-log.cn';
const API_URLS = {
  production: 'https://cprice-api.itsupport-5c8.workers.dev',
  development: 'https://cprice-api-dev.20990909.xyz',
  custom: 'https://cprice-api.20990909.xyz'
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
        'User-Agent': 'CPrice-System-Diagnosis/1.0',
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

// 诊断前端状态
async function diagnoseFrontend() {
  console.log('🌐 诊断前端状态...');
  
  try {
    const response = await makeRequest(FRONTEND_URL);
    
    if (response.status === 200) {
      console.log('✅ 前端网站可访问');
      console.log(`📊 响应状态: ${response.status}`);
      
      // 检查内容是否包含预期的元素
      const content = response.data.toString();
      if (content.includes('CPrice 物流')) {
        console.log('✅ 前端内容正常');
      } else {
        console.log('⚠️ 前端内容可能有问题');
      }
      
      return true;
    } else {
      console.log(`❌ 前端访问失败: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`💥 前端访问错误: ${error.message}`);
    return false;
  }
}

// 诊断API状态
async function diagnoseAPI(name, url) {
  console.log(`\n🔧 诊断${name}API: ${url}`);
  
  const results = {
    name,
    url,
    health: false,
    publicAPI: false,
    auth: false,
    database: false
  };
  
  try {
    // 1. 健康检查
    console.log('   🏥 健康检查...');
    const healthResponse = await makeRequest(`${url}/health`);
    if (healthResponse.status === 200) {
      console.log('   ✅ 健康检查通过');
      results.health = true;
    } else {
      console.log(`   ❌ 健康检查失败: ${healthResponse.status}`);
    }
    
    // 2. 公开API测试
    console.log('   📋 公开API测试...');
    const publicResponse = await makeRequest(`${url}/api/public/business-types`);
    if (publicResponse.status === 200 && publicResponse.data.success) {
      console.log(`   ✅ 公开API正常: ${publicResponse.data.data?.length || 0} 条业务类型`);
      results.publicAPI = true;
      results.database = true;
    } else {
      console.log(`   ❌ 公开API失败: ${publicResponse.status} - ${publicResponse.data.error || '未知错误'}`);
    }
    
    // 3. 认证测试
    console.log('   🔐 认证测试...');
    const authResponse = await makeRequest(`${url}/api/auth/login`, {
      method: 'POST',
      body: { username: 'admin', password: 'admin123' }
    });
    
    if (authResponse.status === 200 && authResponse.data.success) {
      console.log('   ✅ 认证正常');
      results.auth = true;
    } else {
      console.log(`   ❌ 认证失败: ${authResponse.status} - ${authResponse.data.error || '未知错误'}`);
    }
    
    // 4. 数据库初始化检查
    console.log('   🗄️ 数据库初始化检查...');
    const initResponse = await makeRequest(`${url}/init-db`);
    if (initResponse.status === 200) {
      console.log('   ✅ 数据库初始化端点可用');
    } else {
      console.log(`   ❌ 数据库初始化端点不可用: ${initResponse.status}`);
    }
    
  } catch (error) {
    console.log(`   💥 API诊断错误: ${error.message}`);
  }
  
  return results;
}

// 生成诊断报告
function generateReport(frontendStatus, apiResults) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 系统诊断报告');
  console.log('='.repeat(60));
  
  // 前端状态
  console.log(`🌐 前端状态: ${frontendStatus ? '✅ 正常' : '❌ 异常'}`);
  
  // API状态汇总
  console.log('\n🔧 API状态汇总:');
  apiResults.forEach(result => {
    console.log(`\n   ${result.name}:`);
    console.log(`   📍 地址: ${result.url}`);
    console.log(`   🏥 健康检查: ${result.health ? '✅' : '❌'}`);
    console.log(`   📋 公开API: ${result.publicAPI ? '✅' : '❌'}`);
    console.log(`   🔐 认证: ${result.auth ? '✅' : '❌'}`);
    console.log(`   🗄️ 数据库: ${result.database ? '✅' : '❌'}`);
  });
  
  // 问题分析
  console.log('\n🔍 问题分析:');
  const workingAPIs = apiResults.filter(r => r.health && r.publicAPI);
  const brokenAPIs = apiResults.filter(r => !r.health || !r.publicAPI);
  
  if (workingAPIs.length === 0) {
    console.log('❌ 所有API都无法正常工作');
    console.log('🔧 建议: 需要重新部署API或检查数据库配置');
  } else if (brokenAPIs.length > 0) {
    console.log(`⚠️ ${brokenAPIs.length} 个API有问题:`);
    brokenAPIs.forEach(api => {
      console.log(`   - ${api.name}: ${api.url}`);
    });
    console.log(`✅ ${workingAPIs.length} 个API正常工作:`);
    workingAPIs.forEach(api => {
      console.log(`   - ${api.name}: ${api.url}`);
    });
  } else {
    console.log('✅ 所有API都正常工作');
  }
  
  // 修复建议
  console.log('\n🛠️ 修复建议:');
  
  if (!frontendStatus) {
    console.log('1. 前端问题:');
    console.log('   - 检查Cloudflare Pages部署状态');
    console.log('   - 验证自定义域名配置');
  }
  
  if (brokenAPIs.length > 0) {
    console.log('2. API问题:');
    console.log('   - 重新部署Cloudflare Workers');
    console.log('   - 检查环境变量配置');
    console.log('   - 验证数据库绑定');
  }
  
  const authFailedAPIs = apiResults.filter(r => r.health && !r.auth);
  if (authFailedAPIs.length > 0) {
    console.log('3. 认证问题:');
    console.log('   - 数据库可能未正确初始化');
    console.log('   - 管理员账户可能不存在或密码错误');
    console.log('   - 建议运行数据库初始化脚本');
  }
  
  if (workingAPIs.length > 0) {
    console.log('\n🎯 推荐使用的API:');
    const bestAPI = workingAPIs.find(r => r.auth) || workingAPIs[0];
    console.log(`   ${bestAPI.name}: ${bestAPI.url}`);
    console.log('   建议更新前端配置使用此API地址');
  }
}

// 主诊断流程
async function runDiagnosis() {
  console.log('🚀 开始CPrice系统全面诊断...\n');
  
  // 诊断前端
  const frontendStatus = await diagnoseFrontend();
  
  // 诊断所有API
  const apiResults = [];
  for (const [name, url] of Object.entries(API_URLS)) {
    const result = await diagnoseAPI(name, url);
    apiResults.push(result);
  }
  
  // 生成报告
  generateReport(frontendStatus, apiResults);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 诊断完成！');
}

// 运行诊断
if (require.main === module) {
  runDiagnosis().catch(console.error);
}

module.exports = { runDiagnosis, diagnoseFrontend, diagnoseAPI };
