# 控链 KongChain — 本地 Web 启动器（PowerShell）
#
# 作用：在 F:\KongChain 源码仓库上启动 `dsh web` 的 kongchain Profile，
# 打印带 token 的访问地址，并按需打开浏览器。不修改任何源码或用户数据。
#
# 用法：
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-kongchain-web.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-kongchain-web.ps1 -Port 3084 -NoBrowser
#
# 说明：
#   - Web 前端产物缺失时先执行 scripts\build-web-workbench.mjs（当前 Windows 环境的兼容构建）。
#   - token 写入 ..\KongChain-logs\web-start.log；每次启动都会生成新 token。
#   - 模型 API Key 不在本脚本中；请在应用内「设置 → 模型」配置，或启动前设置 DEEPSEEK_API_KEY。
param(
  [int]$Port = 3083,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path (Split-Path -Parent $repo) 'KongChain-logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "web-start-$Port.log"
$errLog = Join-Path $logDir "web-start-$Port.err.log"

$node = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $node) {
  Write-Error '未找到 node。请安装 Node.js 24+，或把 node 加入 PATH。'
  exit 1
}
if (-not (Test-Path (Join-Path $repo 'apps/cli/src/bin.ts'))) {
  Write-Error "当前目录不像 KongChain 源码仓库：$repo"
  exit 1
}

Set-Location $repo
$distIndex = Join-Path $repo 'apps/web/dist/index.html'
if (-not (Test-Path $distIndex)) {
  Write-Host '未找到 apps/web/dist/index.html，先执行兼容 Web 构建…'
  & node scripts/build-web-workbench.mjs
  if ($LASTEXITCODE -ne 0) { Write-Error 'Web 兼容构建失败。'; exit 1 }
}

$listening = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -ne $listening) {
  Write-Host "端口 $Port 已有进程在监听（PID $($listening.OwningProcess)）。"
  Write-Host "若它是控链实例，访问地址见 $logDir\web-start-$Port.log；否则请用 -Port 指定其它端口。"
  exit 2
}

Write-Host "启动控链 Web（profile=kongchain, port=$Port）…"
$process = Start-Process -FilePath $node.Source -ArgumentList @(
  '--import', 'tsx/esm', 'apps/cli/src/bin.ts',
  '--profile', 'kongchain', '--no-open', '--port', "$Port"
) -WorkingDirectory $repo -RedirectStandardOutput $log -RedirectStandardError $errLog -WindowStyle Hidden -PassThru

$url = $null
$deadline = (Get-Date).AddSeconds(120)
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 1200
  if (Test-Path $log) {
    $match = Select-String -Path $log -Pattern 'dsh web: (http://\S+)' -ErrorAction SilentlyContinue | Select-Object -Last 1
    if ($null -ne $match) { $url = $match.Matches[0].Groups[1].Value; break }
  }
  if ((Get-Process -Id $process.Id -ErrorAction SilentlyContinue) -eq $null) { break }
}

if ($null -eq $url) {
  Write-Host '启动未在 120 秒内完成，下面是日志尾部：'
  if (Test-Path $log) { Get-Content $log -Tail 30 }
  if (Test-Path $errLog) { Get-Content $errLog -Tail 30 }
  exit 1
}

Write-Host ''
Write-Host '控链 KongChain 已启动：'
Write-Host "  $url"
Write-Host "  进程 PID $($process.Id)；日志 $log"
Write-Host '  关闭窗口不会停止服务；结束用：Stop-Process -Id ' + $process.Id
Write-Host ''
if (-not $NoBrowser) {
  try { Start-Process $url | Out-Null } catch { Write-Host '无法自动打开浏览器，请手动复制上面的地址。' }
}
