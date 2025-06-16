# CPrice API 简单测试

$apiUrl = "https://cprice-api.itsupport-5c8.workers.dev"

Write-Host "测试 CPrice API..." -ForegroundColor Green

# 测试健康检查
Write-Host "1. 健康检查..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$apiUrl/health" -Method GET
Write-Host "健康状态: $($health.status)" -ForegroundColor Green

# 测试业务类型
Write-Host "2. 业务类型查询..." -ForegroundColor Yellow
$businessTypes = Invoke-RestMethod -Uri "$apiUrl/api/public/business-types" -Method GET
Write-Host "业务类型数量: $($businessTypes.data.Count)" -ForegroundColor Green

# 测试登录
Write-Host "3. 管理员登录..." -ForegroundColor Yellow
$loginBody = '{"username":"admin","password":"admin123"}'
$loginResponse = Invoke-RestMethod -Uri "$apiUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
Write-Host "登录成功，用户: $($loginResponse.data.user.username)" -ForegroundColor Green

Write-Host "API 测试完成！" -ForegroundColor Green
Write-Host "前端地址: https://f2ba0e10.cprice.pages.dev" -ForegroundColor Cyan
Write-Host "API地址: $apiUrl" -ForegroundColor Cyan
