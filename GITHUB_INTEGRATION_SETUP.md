# CPrice GitHub 自动部署设置指南

## 🔍 当前状态

根据检查结果，CPrice项目的Cloudflare Pages **没有关联GitHub**，这就是为什么无法自动拉取更新的原因：

```
┌───────────────┬────────────────────────────────────────────┬──────────────┬───────────────┐
│ Project Name  │ Project Domains                            │ Git Provider │ Last Modified │
├───────────────┼────────────────────────────────────────────┼──────────────┼───────────────┤
│ cprice        │ cprice.pages.dev, cprice.pgs-log.cn        │ No           │ 14 hours ago  │  ❌ 未关联
│ supplier-form │ supplier-form.pages.dev, spcode.pgs-log.cn │ Yes          │ 21 hours ago  │  ✅ 已关联
└───────────────┴────────────────────────────────────────────┴──────────────┴───────────────┘
```

## 🛠️ 解决方案：通过Cloudflare Dashboard设置GitHub集成

### 步骤1：访问Cloudflare Dashboard
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** 部分
3. 找到 **cprice** 项目

### 步骤2：设置GitHub集成
1. 点击 **cprice** 项目
2. 进入 **Settings** 标签页
3. 找到 **Source** 或 **Git Integration** 部分
4. 点击 **Connect to Git** 或 **Connect Repository**

### 步骤3：配置GitHub仓库
选择以下配置：
- **Git Provider**: GitHub
- **Repository**: `pgsit-tech/cprice`
- **Branch**: `main`
- **Build Command**: `npm run build`
- **Build Output Directory**: `out`
- **Root Directory**: `/` (根目录)

### 步骤4：设置环境变量
在Pages项目设置中添加环境变量：
```
NEXT_PUBLIC_API_URL = https://cprice-api.20990909.xyz
```

### 步骤5：配置构建设置
- **Framework Preset**: Next.js
- **Node.js Version**: 18.x
- **Build Command**: `npm run build`
- **Output Directory**: `out`

## 🔧 构建配置验证

确保项目根目录的配置正确：

### package.json
```json
{
  "scripts": {
    "build": "next build",
    "dev": "next dev --turbopack",
    "start": "next start"
  }
}
```

### next.config.ts
```typescript
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}
```

## 🚀 预期结果

设置完成后：
1. ✅ 每次推送到 `main` 分支时自动触发构建
2. ✅ 构建成功后自动部署到 https://cprice.pgs-log.cn
3. ✅ 可以在Pages Dashboard查看构建日志
4. ✅ 支持预览分支（PR预览）

## 📋 验证步骤

设置完成后，可以通过以下方式验证：

1. **推送测试提交**：
   ```bash
   git add .
   git commit -m "Test: GitHub auto-deployment"
   git push origin main
   ```

2. **检查构建状态**：
   - 在Cloudflare Pages Dashboard查看构建进度
   - 查看构建日志确认无错误

3. **验证部署**：
   - 访问 https://cprice.pgs-log.cn 确认更新生效
   - 检查前端是否正常连接API

## ⚠️ 注意事项

1. **首次设置可能需要授权**：GitHub需要授权Cloudflare访问仓库
2. **构建时间**：首次构建可能需要3-5分钟
3. **缓存清理**：如果更新未生效，可能需要清理Cloudflare缓存
4. **环境变量**：确保API URL指向正确的Workers域名

## 🔄 当前部署方式 vs 目标方式

### 当前方式（手动）
```bash
npm run build
wrangler pages deploy out --project-name=cprice
```

### 目标方式（自动）
```
GitHub Push → Cloudflare Pages 自动构建 → 自动部署
```

## 📞 如需帮助

如果在设置过程中遇到问题：
1. 检查GitHub仓库权限
2. 确认Cloudflare账户有Pages权限
3. 验证构建命令和输出目录
4. 查看构建日志中的错误信息
