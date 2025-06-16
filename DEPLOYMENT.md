# CPrice 物流价格系统部署指南

## 项目概述

CPrice 是一个基于 Cloudflare 生态的货运代理物流价格发布和查询系统，包含：

- **前端**: Next.js + TypeScript + Tailwind CSS
- **后端API**: Cloudflare Workers + Hono框架
- **数据库**: Cloudflare D1 (SQLite)
- **部署**: Cloudflare Pages + Workers

## 部署架构

```
用户 → Cloudflare Pages (前端) → Cloudflare Workers (API) → Cloudflare D1 (数据库)
```

## 前置要求

1. Cloudflare 账户
2. Node.js 18+ 
3. Git
4. Wrangler CLI

## 第一步：安装 Wrangler CLI

```bash
npm install -g wrangler
```

登录 Cloudflare：
```bash
wrangler login
```

## 第二步：创建 Cloudflare D1 数据库

### 创建数据库

```bash
# 创建生产数据库
wrangler d1 create cprice-db

# 创建开发数据库
wrangler d1 create cprice-db-dev
```

记录返回的数据库ID，更新 `workers/wrangler.toml` 文件中的 `database_id`。

### 初始化数据库

```bash
cd workers

# 初始化生产数据库
wrangler d1 execute cprice-db --file=../database/schema.sql

# 初始化开发数据库
wrangler d1 execute cprice-db-dev --file=../database/schema.sql --env development
```

## 第三步：配置 Cloudflare Workers

### 1. 安装依赖

```bash
cd workers
npm install
```

### 2. 设置环境变量

```bash
# 设置JWT密钥
wrangler secret put JWT_SECRET
# 输入一个强密码，例如：your-super-secret-jwt-key-here

# 开发环境
wrangler secret put JWT_SECRET --env development
```

### 3. 更新 wrangler.toml

编辑 `workers/wrangler.toml`，替换数据库ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "cprice-db"
database_id = "your-actual-database-id-here"  # 替换为实际ID

[[env.development.d1_databases]]
binding = "DB"
database_name = "cprice-db-dev"
database_id = "your-dev-database-id-here"  # 替换为实际ID
```

### 4. 部署 Workers

```bash
# 部署到开发环境
wrangler deploy --env development

# 部署到生产环境
wrangler deploy
```

记录部署后的 Workers URL，例如：`https://cprice-api.your-subdomain.workers.dev`

## 第四步：配置前端

### 1. 更新环境变量

编辑 `.env.local`：

```env
# 替换为实际的Workers URL
WORKERS_API_URL=https://cprice-api.your-subdomain.workers.dev
```

### 2. 安装依赖

```bash
npm install
```

### 3. 本地测试

```bash
npm run dev
```

访问 `http://localhost:3000` 测试功能。

## 第五步：部署到 Cloudflare Pages

### 方法一：通过 GitHub 自动部署（推荐）

1. 将代码推送到 GitHub 仓库
2. 登录 Cloudflare Dashboard
3. 进入 Pages 部分
4. 点击 "Create a project"
5. 连接 GitHub 仓库
6. 配置构建设置：
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Root directory**: `/` (项目根目录)

7. 设置环境变量：
   - `WORKERS_API_URL`: `https://cprice-api.your-subdomain.workers.dev`

8. 点击 "Save and Deploy"

### 方法二：手动部署

```bash
# 构建项目
npm run build

# 使用 wrangler 部署到 Pages
npx wrangler pages deploy .next --project-name cprice
```

## 第六步：配置自定义域名（可选）

### 为 Workers 配置域名

1. 在 Cloudflare Dashboard 中进入 Workers & Pages
2. 选择你的 Worker
3. 进入 Settings → Triggers
4. 添加自定义域名

### 为 Pages 配置域名

1. 在 Cloudflare Dashboard 中进入 Pages
2. 选择你的项目
3. 进入 Custom domains
4. 添加自定义域名

## 第七步：验证部署

### 1. 测试前端

访问你的 Pages URL，检查：
- 首页加载正常
- 价格查询功能
- 咨询表单提交

### 2. 测试管理后台

访问 `/admin/login`，使用默认账户登录：
- 用户名: `admin`
- 密码: `admin123`

检查：
- 登录功能
- 仪表板数据显示
- 各管理模块功能

### 3. 测试 API

```bash
# 测试健康检查
curl https://your-workers-url.workers.dev/health

# 测试公开价格查询
curl https://your-workers-url.workers.dev/api/public/prices

# 测试业务类型查询
curl https://your-workers-url.workers.dev/api/public/business-types
```

## 维护和监控

### 数据库备份

```bash
# 导出数据库
wrangler d1 export cprice-db --output=backup-$(date +%Y%m%d).sql
```

### 查看日志

```bash
# 查看 Workers 日志
wrangler tail

# 查看特定环境的日志
wrangler tail --env development
```

### 更新部署

```bash
# 更新 Workers
cd workers
wrangler deploy

# 前端会通过 GitHub 自动部署
# 或手动更新 Pages
npm run build
npx wrangler pages deploy .next --project-name cprice
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 `wrangler.toml` 中的数据库ID是否正确
   - 确认数据库已正确初始化

2. **JWT 认证失败**
   - 检查 JWT_SECRET 是否已设置
   - 确认前后端使用相同的密钥

3. **CORS 错误**
   - 检查 Workers 中的 CORS 配置
   - 确认前端 API 代理配置正确

4. **页面 404 错误**
   - 检查 Next.js 路由配置
   - 确认 Pages 部署配置正确

### 调试技巧

1. 使用浏览器开发者工具查看网络请求
2. 检查 Cloudflare Dashboard 中的日志
3. 使用 `wrangler dev` 本地调试 Workers
4. 使用 `npm run dev` 本地调试前端

## 安全建议

1. 定期更新依赖包
2. 使用强密码作为 JWT_SECRET
3. 定期备份数据库
4. 监控异常访问日志
5. 考虑启用 Cloudflare 的安全功能（WAF、DDoS 保护等）

## 性能优化

1. 启用 Cloudflare 缓存
2. 使用 CDN 加速静态资源
3. 优化数据库查询
4. 压缩图片和资源文件
5. 使用 Cloudflare Analytics 监控性能

## 联系支持

如果在部署过程中遇到问题，请：

1. 检查本文档的故障排除部分
2. 查看 Cloudflare 官方文档
3. 在项目 GitHub 仓库提交 Issue
4. 联系技术支持团队
