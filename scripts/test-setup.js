#!/usr/bin/env node

/**
 * CPrice 项目设置测试脚本
 * 验证项目结构和依赖是否正确配置
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 CPrice 项目设置检查\n');

// 检查文件是否存在
function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`);
  return exists;
}

// 检查目录是否存在
function checkDirectory(dirPath, description) {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  console.log(`${exists ? '✅' : '❌'} ${description}: ${dirPath}`);
  return exists;
}

// 检查 package.json 中的依赖
function checkDependency(packagePath, depName, description) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const hasDep = packageJson.dependencies?.[depName] || packageJson.devDependencies?.[depName];
    console.log(`${hasDep ? '✅' : '❌'} ${description}: ${depName}`);
    return !!hasDep;
  } catch (error) {
    console.log(`❌ 无法读取 ${packagePath}`);
    return false;
  }
}

let allChecks = true;

console.log('📁 检查项目结构...');
allChecks &= checkDirectory('src', '前端源码目录');
allChecks &= checkDirectory('src/app', 'Next.js App Router');
allChecks &= checkDirectory('src/components', 'React 组件目录');
allChecks &= checkDirectory('src/types', 'TypeScript 类型定义');
allChecks &= checkDirectory('workers', 'Cloudflare Workers 目录');
allChecks &= checkDirectory('workers/src', 'Workers 源码目录');
allChecks &= checkDirectory('workers/src/routes', 'API 路由目录');
allChecks &= checkDirectory('database', '数据库目录');

console.log('\n📄 检查关键文件...');
allChecks &= checkFile('src/app/page.tsx', '首页组件');
allChecks &= checkFile('src/app/admin/login/page.tsx', '管理后台登录页');
allChecks &= checkFile('src/app/admin/dashboard/page.tsx', '管理后台仪表板');
allChecks &= checkFile('src/components/Hero.tsx', '首页英雄区组件');
allChecks &= checkFile('src/components/PriceSearch.tsx', '价格查询组件');
allChecks &= checkFile('src/components/InquiryForm.tsx', '咨询表单组件');
allChecks &= checkFile('src/components/admin/AdminLayout.tsx', '管理后台布局');
allChecks &= checkFile('src/types/index.ts', 'TypeScript 类型定义');

console.log('\n🔧 检查 Workers 文件...');
allChecks &= checkFile('workers/src/index.ts', 'Workers 入口文件');
allChecks &= checkFile('workers/src/routes/auth.ts', '认证路由');
allChecks &= checkFile('workers/src/routes/dashboard.ts', '仪表板路由');
allChecks &= checkFile('workers/src/routes/prices.ts', '价格管理路由');
allChecks &= checkFile('workers/src/routes/inquiries.ts', '咨询管理路由');
allChecks &= checkFile('workers/src/routes/announcements.ts', '公告管理路由');
allChecks &= checkFile('workers/src/routes/business-types.ts', '业务类型路由');
allChecks &= checkFile('workers/src/routes/users.ts', '用户管理路由');
allChecks &= checkFile('workers/package.json', 'Workers package.json');
allChecks &= checkFile('workers/wrangler.toml', 'Wrangler 配置文件');

console.log('\n🗄️ 检查数据库文件...');
allChecks &= checkFile('database/schema.sql', '数据库结构文件');

console.log('\n📋 检查配置文件...');
allChecks &= checkFile('package.json', '前端 package.json');
allChecks &= checkFile('tsconfig.json', 'TypeScript 配置');
allChecks &= checkFile('tailwind.config.ts', 'Tailwind CSS 配置');
allChecks &= checkFile('next.config.ts', 'Next.js 配置');
allChecks &= checkFile('.env.local', '环境变量配置');

console.log('\n📚 检查文档文件...');
allChecks &= checkFile('README.md', '项目说明文档');
allChecks &= checkFile('DEPLOYMENT.md', '部署指南文档');

console.log('\n📦 检查前端依赖...');
allChecks &= checkDependency('package.json', 'react', 'React');
allChecks &= checkDependency('package.json', 'next', 'Next.js');
allChecks &= checkDependency('package.json', 'typescript', 'TypeScript');
allChecks &= checkDependency('package.json', 'tailwindcss', 'Tailwind CSS');
allChecks &= checkDependency('package.json', '@heroicons/react', 'Heroicons');
allChecks &= checkDependency('package.json', 'react-hook-form', 'React Hook Form');
allChecks &= checkDependency('package.json', 'zod', 'Zod');

console.log('\n🔧 检查 Workers 依赖...');
allChecks &= checkDependency('workers/package.json', 'hono', 'Hono 框架');

console.log('\n📊 检查结果总结:');
if (allChecks) {
  console.log('🎉 所有检查通过！项目设置正确。');
  console.log('\n🚀 下一步操作:');
  console.log('1. 安装依赖: npm install');
  console.log('2. 安装 Workers 依赖: cd workers && npm install');
  console.log('3. 启动开发服务器: npm run dev');
  console.log('4. 启动 Workers: cd workers && npm run dev');
  console.log('5. 访问 http://localhost:3000');
} else {
  console.log('❌ 部分检查失败，请检查项目设置。');
  console.log('\n🔧 可能的解决方案:');
  console.log('1. 确保所有文件都已正确创建');
  console.log('2. 检查文件路径是否正确');
  console.log('3. 运行 npm install 安装依赖');
}

console.log('\n📞 如需帮助，请查看:');
console.log('- README.md: 项目说明');
console.log('- DEPLOYMENT.md: 部署指南');
console.log('- GitHub Issues: https://github.com/pgsit-tech/cprice/issues');

process.exit(allChecks ? 0 : 1);
