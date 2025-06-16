# CPrice 货运代理物流价格系统

一个基于 Cloudflare 生态的现代化货运代理物流价格发布和查询系统。

## 🚀 功能特性

### 公开功能
- **价格查询**: 支持按业务类型、起始地、目的地查询公开价格
- **客户咨询**: 在线提交物流需求，获取专属报价
- **业务类型**: 支持海运、空运、FBA、卡派、卡航等多种物流服务
- **响应式设计**: 完美支持桌面和移动设备

### 管理后台
- **仪表板**: 实时统计数据和最新公告展示
- **价格管理**: 成本价和对外价的录入、编辑、批量导入
- **咨询管理**: 客户咨询的抢单机制和状态管理
- **公告管理**: 内部公告的发布和管理
- **业务类型管理**: 自定义业务类型配置
- **用户权限管理**: 基于角色的权限控制系统
- **数据导出**: 支持 Excel、CSV 格式导出

### 核心特性
- **抢单机制**: 销售人员可抢单处理客户咨询
- **自动释放**: 7天内无更新自动释放到公共池
- **联系方式加密**: 非分配咨询的联系方式自动加密
- **权限控制**: 模块级权限管理（查看、创建、更新、删除、导出）

## 🛠 技术栈

### 前端
- **Next.js 14**: React 全栈框架
- **TypeScript**: 类型安全的 JavaScript
- **Tailwind CSS**: 实用优先的 CSS 框架
- **Heroicons**: 精美的 SVG 图标库
- **React Hook Form**: 高性能表单库
- **Zod**: TypeScript 优先的模式验证

### 后端
- **Cloudflare Workers**: 边缘计算平台
- **Hono**: 轻量级 Web 框架
- **Cloudflare D1**: 分布式 SQLite 数据库
- **JWT**: JSON Web Token 认证

### 部署
- **Cloudflare Pages**: 静态网站托管
- **Cloudflare Workers**: API 服务部署
- **GitHub Actions**: 自动化部署（可选）

## 📁 项目结构

```
cprice/
├── src/                          # 前端源码
│   ├── app/                      # Next.js App Router
│   │   ├── admin/               # 管理后台页面
│   │   ├── api/                 # API 代理路由
│   │   └── page.tsx             # 首页
│   ├── components/              # React 组件
│   │   ├── admin/               # 管理后台组件
│   │   ├── Hero.tsx             # 首页英雄区
│   │   ├── PriceSearch.tsx      # 价格查询组件
│   │   └── InquiryForm.tsx      # 咨询表单组件
│   └── types/                   # TypeScript 类型定义
├── workers/                     # Cloudflare Workers
│   ├── src/                     # Workers 源码
│   │   ├── routes/              # API 路由
│   │   └── index.ts             # 入口文件
│   ├── package.json             # Workers 依赖
│   └── wrangler.toml            # Workers 配置
├── database/                    # 数据库
│   └── schema.sql               # 数据库结构
├── DEPLOYMENT.md                # 部署指南
└── README.md                    # 项目说明
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn
- Cloudflare 账户

### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/pgsit-tech/cprice.git
cd cprice
```

2. **安装前端依赖**
```bash
npm install
```

3. **安装 Workers 依赖**
```bash
cd workers
npm install
cd ..
```

4. **配置环境变量**
```bash
cp .env.local.example .env.local
# 编辑 .env.local 配置 Workers API URL
```

5. **启动开发服务器**
```bash
# 启动前端 (端口 3000)
npm run dev

# 启动 Workers (端口 8787)
cd workers
npm run dev
```

6. **访问应用**
- 前端: http://localhost:3000
- 管理后台: http://localhost:3000/admin/login
- API: http://localhost:8787

### 默认账户
- 用户名: `admin`
- 密码: `admin123`

## 📚 部署指南

详细的部署说明请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 快速部署步骤

1. **创建 Cloudflare D1 数据库**
2. **部署 Cloudflare Workers API**
3. **部署前端到 Cloudflare Pages**
4. **配置环境变量和域名**

## 🔧 开发指南

### 添加新的 API 路由

1. 在 `workers/src/routes/` 创建新的路由文件
2. 在 `workers/src/index.ts` 中注册路由
3. 更新类型定义 `src/types/index.ts`

### 添加新的管理页面

1. 在 `src/app/admin/` 创建新页面
2. 在 `src/components/admin/AdminLayout.tsx` 添加导航
3. 实现相应的 API 调用

### 数据库迁移

```bash
cd workers
# 执行 SQL 文件
wrangler d1 execute cprice-db --file=migration.sql
```

## 🔒 安全特性

- JWT 令牌认证
- 基于角色的权限控制
- 联系方式自动加密
- CORS 跨域保护
- SQL 注入防护

## 📊 监控和日志

```bash
# 查看 Workers 日志
wrangler tail

# 导出数据库备份
wrangler d1 export cprice-db --output=backup.sql
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系我们

- 项目地址: [https://github.com/pgsit-tech/cprice](https://github.com/pgsit-tech/cprice)
- 问题反馈: [GitHub Issues](https://github.com/pgsit-tech/cprice/issues)
- 邮箱: itsupport@parisigs.com

## 🙏 致谢

感谢以下开源项目：

- [Next.js](https://nextjs.org/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Hono](https://hono.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Heroicons](https://heroicons.com/)

---

**CPrice** - 让物流价格管理更简单 🚢✈️🚛
