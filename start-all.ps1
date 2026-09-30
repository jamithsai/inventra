Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  NEXUS MULTI-TENANT INVENTORY PLATFORM STARTUP  " -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan

$dotnet = "$env:USERPROFILE\.dotnet\dotnet.exe"
if (-not (Test-Path $dotnet)) {
    $dotnet = "dotnet"
}

Write-Host "`n[1/2] Starting ASP.NET Core Web API on http://localhost:5000..." -ForegroundColor Yellow
$backendJob = Start-Process -FilePath $dotnet -ArgumentList "run --project backend/MultiTenantInventory.Api/MultiTenantInventory.Api.csproj --urls http://localhost:5000" -PassThru

Start-Sleep -Seconds 3

Write-Host "`n[2/2] Starting Vite React Frontend on http://localhost:5173..." -ForegroundColor Green
$frontendJob = Start-Process -FilePath "npm" -ArgumentList "run dev --prefix frontend" -PassThru

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "  PLATFORM IS LIVE AND READY FOR HACKATHON DEMO!  " -ForegroundColor Green
Write-Host "  • React SaaS Dashboard: http://localhost:5173  " -ForegroundColor White
Write-Host "  • Swagger API Explorer: http://localhost:5000/swagger" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to terminate services..."

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Stop-Process -Id $backendJob.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendJob.Id -ErrorAction SilentlyContinue
}
