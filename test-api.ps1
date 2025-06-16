# CPrice API 测试脚本

$apiUrl = "https://cprice-api.itsupport-5c8.workers.dev"

Write-Host "🚀 测试 CPrice API..." -ForegroundColor Green

# 测试健康检查
Write-Host "`n1. 测试健康检查..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$apiUrl/health" -Method GET
    Write-Host "✅ 健康检查通过: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ 健康检查失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试业务类型查询
Write-Host "`n2. 测试业务类型查询..." -ForegroundColor Yellow
try {
    $businessTypes = Invoke-RestMethod -Uri "$apiUrl/api/public/business-types" -Method GET
    Write-Host "✅ 业务类型查询成功，共 $($businessTypes.data.Count) 个类型" -ForegroundColor Green
    $businessTypes.data | ForEach-Object { Write-Host "   - $($_.name) ($($_.code))" }
} catch {
    Write-Host "❌ 业务类型查询失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试管理员登录
Write-Host "`n3. 测试管理员登录..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "✅ 管理员登录成功" -ForegroundColor Green
    $token = $loginResponse.data.token
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    
    # 测试仪表板数据
    Write-Host "`n4. 测试仪表板数据..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $dashboard = Invoke-RestMethod -Uri "$apiUrl/api/dashboard" -Method GET -Headers $headers
    Write-Host "✅ 仪表板数据获取成功" -ForegroundColor Green
    Write-Host "   总价格数: $($dashboard.data.stats.totalPrices)" -ForegroundColor Gray
    Write-Host "   总咨询数: $($dashboard.data.stats.totalInquiries)" -ForegroundColor Gray
    Write-Host "   待处理咨询: $($dashboard.data.stats.pendingInquiries)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ 管理员登录失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试客户咨询提交
Write-Host "`n5. 测试客户咨询提交..." -ForegroundColor Yellow
try {
    $inquiryBody = @{
        customerName = "测试客户"
        customerEmail = "test@example.com"
        customerPhone = "13800138000"
        customerRegion = "上海"
        businessType = "SEA"
        origin = "上海"
        destination = "洛杉矶"
        cargoDescription = "测试货物"
        estimatedWeight = 100
        estimatedVolume = 5
    } | ConvertTo-Json

    $inquiryResponse = Invoke-RestMethod -Uri "$apiUrl/api/public/inquiries" -Method POST -Body $inquiryBody -ContentType "application/json"
    Write-Host "✅ 客户咨询提交成功" -ForegroundColor Green

} catch {
    Write-Host "❌ 客户咨询提交失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 API 测试完成！" -ForegroundColor Green
Write-Host "📱 前端地址: https://f2ba0e10.cprice.pages.dev" -ForegroundColor Cyan
Write-Host "🔧 API地址: $apiUrl" -ForegroundColor Cyan
Write-Host "👤 管理员账户: admin / admin123" -ForegroundColor Cyan
