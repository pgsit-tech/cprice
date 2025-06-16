# CPrice 自定义域名配置指南

## 📋 域名配置概览

### 🌐 前端域名
- **自定义域名**: `cprice.pgs-log.cn` ✅ 已配置生效
- **默认域名**: `https://cprice.pages.dev`
- **平台**: Cloudflare Pages

### 🔧 后端API域名
- **生产环境**: `cprice-api.20990909.xyz` (主Worker: cprice-api)
- **开发环境**: `cprice-api-dev.20990909.xyz` (开发Worker: cprice-api-dev)
- **默认域名**: `https://cprice-api.itsupport-5c8.workers.dev`
- **平台**: Cloudflare Workers

---

## 🔧 Cloudflare Workers 自定义域名配置

### 1. 域名DNS配置

您需要在域名管理面板中添加以下DNS记录：

#### 生产环境 (cprice-api.20990909.xyz)
```
类型: CNAME
名称: cprice-api
值: cprice-api.itsupport-5c8.workers.dev
TTL: 自动或300秒
```

#### 开发环境 (cprice-api-dev.20990909.xyz)
```
类型: CNAME
名称: cprice-api-dev
值: cprice-api-dev.itsupport-5c8.workers.dev
TTL: 自动或300秒
```

### 2. Cloudflare Workers 域名绑定

在Cloudflare Dashboard中：

1. 进入 **Workers & Pages** → **cprice-api**
2. 点击 **Settings** → **Triggers**
3. 在 **Custom Domains** 部分点击 **Add Custom Domain**
4. 输入域名：`cprice-api.20990909.xyz`
5. 点击 **Add Domain**

重复以上步骤为开发环境添加 `cprice-api-dev.20990909.xyz`

### 3. SSL证书配置

Cloudflare会自动为自定义域名提供SSL证书，通常需要几分钟到几小时生效。

---

## 🌐 Cloudflare Pages 自定义域名配置

### 1. 域名DNS配置

在域名管理面板中添加以下DNS记录：

```
类型: CNAME
名称: cprice (或 @，如果是根域名)
值: cprice.pages.dev
TTL: 自动或300秒
```

**状态**: ✅ 已配置完成并生效

### 2. Cloudflare Pages 域名绑定

在Cloudflare Dashboard中：

1. 进入 **Workers & Pages** → **cprice**
2. 点击 **Settings** → **Domains**
3. 点击 **Set up a custom domain**
4. 输入域名：`cprice.pgs-log.cn`
5. 点击 **Continue**
6. 按照提示完成域名验证

---

## ⚙️ 配置文件更新状态

### ✅ 已完成的配置

#### Workers配置 (wrangler.toml)
```toml
# 主环境CORS配置
CORS_ORIGIN = "http://localhost:3000,https://cprice.pages.dev,https://cprice.pgs-log.cn"

# 主生产环境自定义域名配置
[[routes]]
pattern = "cprice-api.20990909.xyz"
custom_domain = true

# 开发环境
[env.development]
name = "cprice-api-dev"
vars = { CORS_ORIGIN = "http://localhost:3000,https://cprice.pgs-log.cn" }
[[env.development.routes]]
pattern = "cprice-api-dev.20990909.xyz"
custom_domain = true
```

#### 前端配置 (.env.local)
```env
WORKERS_API_URL=https://cprice-api.20990909.xyz
NEXT_PUBLIC_API_URL=https://cprice-api.20990909.xyz
```

---

## 🔍 验证步骤

### 1. 验证DNS解析
```bash
# 检查API域名解析
nslookup cprice-api.20990909.xyz
nslookup cprice-api-dev.20990909.xyz

# 检查前端域名解析
nslookup cprice.pgs-log.cn
```

### 2. 验证SSL证书
```bash
# 检查API SSL
curl -I https://cprice-api.20990909.xyz/health
curl -I https://cprice-api-dev.20990909.xyz/health

# 检查前端SSL
curl -I https://cprice.pgs-log.cn
```

### 3. 验证API功能
```bash
# 健康检查
curl https://cprice-api.20990909.xyz/health

# 业务类型查询
curl https://cprice-api.20990909.xyz/api/public/business-types

# 登录测试
curl -X POST https://cprice-api.20990909.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 🚨 故障排除

### 常见问题

#### 1. DNS解析失败
- 检查DNS记录是否正确配置
- 等待DNS传播（可能需要24-48小时）
- 使用在线DNS检查工具验证

#### 2. SSL证书错误
- 确保域名已在Cloudflare中正确配置
- 等待SSL证书自动生成（通常几分钟到几小时）
- 检查Cloudflare SSL设置为"Full"或"Full (strict)"

#### 3. CORS错误
- 确认域名已添加到CORS_ORIGIN配置中
- 重新部署Workers以应用新配置
- 检查浏览器开发者工具中的错误信息

#### 4. 404错误
- 确认Workers已正确部署
- 检查路由配置是否正确
- 验证自定义域名绑定状态

---

## 📞 技术支持

如果遇到配置问题，请检查：

1. **Cloudflare Dashboard**: 确认域名状态和SSL证书状态
2. **DNS传播**: 使用 https://dnschecker.org 检查全球DNS传播状态
3. **Workers日志**: 使用 `wrangler tail` 查看实时日志
4. **Pages部署**: 检查Pages项目的部署状态和域名配置

---

## 📝 配置完成检查清单

- [ ] DNS记录已添加到域名管理面板
- [ ] Cloudflare Workers自定义域名已绑定
- [ ] Cloudflare Pages自定义域名已绑定
- [ ] SSL证书已生成并生效
- [ ] CORS配置已更新并重新部署
- [ ] 前端API URL已更新并重新构建
- [ ] 所有API端点测试正常
- [ ] 前端页面可正常访问
- [ ] 管理后台登录功能正常

完成以上所有步骤后，系统将完全使用自定义域名运行。
