# 一键构建 Windows 安装包
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "==> 安装 electron / electron-builder 依赖" -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install 失败" }

Write-Host "==> 构建安装包" -ForegroundColor Cyan
node scripts/build.js
if ($LASTEXITCODE -ne 0) { throw "构建失败" }

Write-Host ""
Write-Host "完成！安装包位于 dist/ 目录。" -ForegroundColor Green
