# 进销存管理系统 - Windows 一键构建脚本
# 在 PowerShell 中运行：.\build.ps1

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "进销存管理系统 - Windows 构建脚本" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "检查 Node.js 版本..." -ForegroundColor Yellow
node --version

Write-Host ""
Write-Host "检查 Rust 版本..." -ForegroundColor Yellow
rustc --version

Write-Host ""
Write-Host "检查 pnpm..." -ForegroundColor Yellow
pnpm --version

Write-Host ""
Write-Host "安装前端依赖..." -ForegroundColor Green
pnpm install

Write-Host ""
Write-Host "构建前端..." -ForegroundColor Green
pnpm run build

Write-Host ""
Write-Host "构建 Tauri 应用 (生成 .msi)..." -ForegroundColor Green
pnpm tauri build

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "构建完成！" -ForegroundColor Cyan
Write-Host "安装包位置: src-tauri\target\release\bundle\msi" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
