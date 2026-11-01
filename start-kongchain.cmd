@echo off
rem 控链 KongChain — 双击启动本地 Web 版（Windows）
rem 等价于：powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-kongchain-web.ps1
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-kongchain-web.ps1" %*
echo.
pause
