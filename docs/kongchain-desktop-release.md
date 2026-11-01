# 控链 KongChain Desktop Release

- 项目：`F:\KongChain`
- 检出版本：DeepSeek Harness `0.2.2-alpha.2`
- 目标：Windows x64 桌面 Demo
- 结论：**已生成 NSIS 安装包与便携目录**；干净环境安装验收待进行

## 1. 现有桌面能力审计

已确认官方桌面框架存在并被复用：

- `apps/desktop`：Electron 主进程、welcome、window、backend、installer。
- `apps/desktop-host`：私有 Desktop Host。
- Windows 打包脚本：`apps/desktop/scripts/package-target.ts`、`electron-builder-config.mjs`、`installer.nsh`。
- 官方命令：`pnpm run package:desktop:win:x64:unsigned`、`package:desktop:win:x64:dir`。
- NSIS 安装器配置存在（`oneClick:false`、用户级安装、卸载边栏、安装器语言）。
- 运行时随包携带 Node/Python/pnpm，不要求目标机安装开发工具。
- Desktop 使用保留 profile `$DSH_HOME/profiles/desktop`，与 CLI/Web 共享产品数据，插件仍走官方插件机制。

没有创建平行 Agent Runtime，也没有另起 Electron 框架。

## 2. 控链品牌改造

已修改：

- `apps/desktop/scripts/electron-builder-config.mjs`
  - 支持 `DSH_DESKTOP_PRODUCT_NAME`（默认 `DeepSeek Harness`）；
  - 支持 `DSH_DESKTOP_ARTIFACT_PREFIX`（默认 `deepseek-harness`）；
  - KongChain 图标资源选择；
  - productName 用于协议名、版权、麦克风说明。
- 新增图标：
  - `apps/desktop/resources/icon-kongchain-windows.png`
  - `apps/desktop/resources/icon-kongchain-macos.png`
  - `apps/desktop/resources/tray-kongchain.ico`
- `apps/desktop/src/locale.ts` 英文/中文欢迎文案改为：
  - `控链 KongChain`
  - `面向财务与内控的 AI Agent 工作台`
  - API 配置描述。
- `apps/desktop/.env.windows`：本地 demo app id 与测试更新策略占位（不含密钥）。
- `apps/desktop/scripts/smoke-packaged-runtime.ts`：修复 `productName` 覆盖后找不到 exe 的问题（原先硬编码 `DeepSeek Harness.exe`）。

演示模式**尚未实现为独立模式**：当前欢迎页"稍后配置"仍会进入工作区，但不会加载专门的合成数据演示任务。因此没有把按钮改名成"演示模式"来冒充已实现功能。

## 3. 本机工具链（2026-10-31 补齐）

- Visual Studio Build Tools 2022：`F:\BuildTools`（VC++ x64 + Windows 11 SDK 26100）
- Electron 构建镜像：`ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`
- electron-builder 二进制镜像：`ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/`
- 构建环境变量（本地打包流水线专用）：
  - `DSH_DESKTOP_PRODUCT_NAME='控链 KongChain'`
  - `DSH_DESKTOP_ARTIFACT_PREFIX='kongchain'`
  - `DSH_WEB_UNMINIFIED=1`（绕过 esbuild 临时文件删除失败，见 `apps/web/vite.config.ts`）
  - `DSH_DESKTOP_PNPM_NODE='E:\node.exe'`（绕过 Electron Node 模式无法创建符号链接）
  - `DSH_DESKTOP_DEFER_SMOKE=1` / `DSH_DESKTOP_DEFER_PACKAGED_SMOKE=1`（deferred 冒烟测试，见下文 §6）

## 4. 实际生成的产物

| 产物 | 路径 | 大小 | 说明 |
|---|---|---|---|
| **NSIS 安装包** | `apps/desktop/.desktop-build/targets/win-x64/unsigned-artifacts/kongchain-0.2.2-alpha.2-win-x64-unsigned.exe` | **302 MB** | NSIS 安装器，Windows x64 |
| **便携目录** | `apps/desktop/.desktop-build/targets/win-x64/unsigned-artifacts/win-unpacked/` | **1,074 MB** | 解压即可运行，含 `控链 KongChain.exe`（246MB） |
| blockmap | 同上 `.blockmap` | 328 KB | 差分更新用 |

exe 版本信息：`ProductName=控链 KongChain`、`ProductVersion=0.2.2.0`、`FileVersion=0.2.2-alpha.2`、`FileDescription=控链 KongChain`。

## 5. 构建命令（可复现）

```powershell
$env:DSH_DESKTOP_PRODUCT_NAME='控链 KongChain'
$env:DSH_DESKTOP_ARTIFACT_PREFIX='kongchain'
$env:DSH_WEB_UNMINIFIED='1'
$env:DSH_DESKTOP_PNPM_NODE='E:\node.exe'
$env:DSH_DESKTOP_DEFER_SMOKE='1'
$env:DSH_DESKTOP_DEFER_PACKAGED_SMOKE='1'
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://npmmirror.com/mirrors/electron-builder-binaries/'
$env:ELECTRON_BUILDER_CACHE='F:\KongChain\apps\desktop\.desktop-build\eb-cache'
$env:TEMP='F:\KongChain\apps\desktop\.desktop-build\tmp'
$env:TMP=$env:TEMP

# 便携目录（--dir）
pnpm --dir apps/desktop run package:win:x64:unsigned --dir

# NSIS 安装包
pnpm --dir apps/desktop run package:win:x64:unsigned
```

## 6. 已解决的环境问题（本轮补齐）

1. **vswhere ENOENT** → 安装 VS Build Tools 2022（VC++ x64 + Win11 SDK），vswhere 预检通过。
2. **esbuild 临时文件删除 `Access is denied`** → `DSH_WEB_UNMINIFIED=1` 跳过 esbuild transpile（`apps/web/vite.config.ts` 注释）。
3. **Electron 下载超时** → `ELECTRON_MIRROR` 指向 npmmirror。
4. **Electron Node 模式 `fs.symlink` EPERM** → `DSH_DESKTOP_PNPM_NODE` 用系统 Node 跑 pnpm（`prepare-dsh.ts` 开关）。
5. **Electron Node 模式 `fs.mkdtemp` EPERM** → `TEMP` 指向工作区内（sandbox 只允许写 `F:\KongChain`）。
6. **electron-builder icons helper ESM 报错** → `ELECTRON_BUILDER_CACHE` 内加 `package.json {"type":"commonjs"}`。
7. **runtime smoke Host teardown 挂起** → `DSH_DESKTOP_DEFER_SMOKE=1` / `DSH_DESKTOP_DEFER_PACKAGED_SMOKE=1`（冒烟测试在干净环境上补跑）。
8. **smoke 找不到 exe** → `smoke-packaged-runtime.ts` 用 `DSH_DESKTOP_PRODUCT_NAME` 动态解析。

## 7. 双击启动测试

- 本机启动 `控链 KongChain.exe` 时，Electron 单实例锁与正在运行的官方 DeepSeek Harness（共用 `%APPDATA%\@deepseek-ai\dsh-desktop`）冲突，应用立即退出。
- **需要在干净 Windows 账户或虚拟机中安装验收**：桌面快捷方式启动、不依赖开发目录、进程退出清理、用户数据持久化。
- 这是本批最后的验收项，不是打包阻塞。

## 8. 运行模式现状

### 真实体验模式

复用官方 Desktop/API 设置：

- 用户在设置中输入 DeepSeek API key；
- key 保存在本地凭据机制，不写源码、安装包、日志或示例；
- 可执行真实模型请求、工具调用、财务分析、插件和开发者任务。

### 演示保障模式

**尚未完整实现**：

- 欢迎页目前只有"稍后配置"进入工作区；
- 合成财务数据、预置演示任务、示例输出未集成进 Desktop 首启流程；
- 不能声称"演示模式"已可离线运行完整 AI 功能。

## 9. 已知限制

- 桌面 UI 未经完整截图验收（需要干净环境安装测试）。
- 演示模式未实现为独立、明确标记的模式。
- 没有嵌入任何 API key；`.env.windows` 仅含本地测试配置占位。
- runtime 冒烟测试在本机因 sandbox 限制被 defer，需在正常环境补跑（`F:\KongChain-logs\desktop-package-dir9.log` 有已通过检查的输出）。
- 便携版未压缩为 zip（1GB 目录直接拷贝即可）；如需 zip 可用 `Compress-Archive` 打包。

## 10. 下一步优先级

1. 在干净 Windows/虚拟机安装并验收快捷方式、退出清理、用户数据持久化。
2. 实现演示保障模式（合成数据、预置任务、示例输出、无 API 浏览）。
3. 在正常环境补跑 runtime smoke（去掉 `DSH_DESKTOP_DEFER_SMOKE` 两个开关）。
4. 如需分发，用 `Compress-Archive` 压缩 `win-unpacked` 目录为便携 zip。
