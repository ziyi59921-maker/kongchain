# KongChain 扩展指南（第 1 批）

本指南覆盖控链扩展的安装、启动、验证与开发流程。所有命令在本 checkout（`F:\KongChain`）执行，并使用隔离的 Harness Home（`F:\KongChain-home`）。

## 1. 前置条件

- 已完成第 0 批：`pnpm install` 与 `pnpm run build` 成功。
- `pnpm --version` 解析为 `11.28.5`（packageManager 自动切换）。
- 隔离 Home：`F:\KongChain-home`；不要使用个人 `~/.dsh` 做控链开发验证。

```powershell
$env:Path='G:\抗联\_tools\cmd;'+$env:Path   # 本机 Git 便携版；已有 Git 可省略
$env:DSH_HOME='F:\KongChain-home'
Set-Location F:\KongChain
```

## 2. 创建 KongChain Profile

从官方 `web` 模板创建一个非内置 profile：

```powershell
pnpm dsh --profile kongchain --from-default-profile web --dump-config 1> $null
```

这会生成 `F:\KongChain-home\profiles\kongchain\`，默认 bundles 为：

```
@deepseek-ai/dsh-base
@deepseek-ai/dsh-web-app
```

## 3. 安装控链扩展

控链扩展以本地 `link:` 依赖安装到该 profile；`@kongchain/bundle` 声明了 `dsh.bundle`，安装后会被自动加入 bundle 列表末尾。

```powershell
pnpm dsh plugin --profile kongchain add `
  link:F:/KongChain/extensions/kongchain-core `
  link:F:/KongChain/extensions/kongchain-tools `
  link:F:/KongChain/extensions/kongchain-developer `
  link:F:/KongChain/extensions/kongchain-professional `
  link:F:/KongChain/extensions/kongchain-brand `
  link:F:/KongChain/extensions/kongchain-skills `
  link:F:/KongChain/extensions/kongchain-bundle
```

检查：

```powershell
Get-Content F:\KongChain-home\profiles\kongchain\package.json
pnpm dsh --profile kongchain --dump-config | Select-String -Pattern 'kongchain|preset-standard'
```

预期：

- `dsh.profile.bundles` 包含 `@kongchain/bundle`；
- dump 中出现 `kongchain-core`、`kongchain-tools`、`kongchain-developer`、`kongchain-professional`、`kongchain-brand`、`kongchain-skill-filesystem` 行；
- `@kongchain/core` 等包出现在 profile `node_modules`（指向 `extensions/` 的符号链接）。

## 4. 启动与验证

```powershell
pnpm dsh --profile kongchain web --no-open --port 3082
```

启动日志应出现：

```
[kongchain-core] loaded version=0.1.0 profile=kongchain repo=F:\KongChain
[kongchain-core] registered tool kongchain_runtime_info
[kongchain-tools] loaded
[kongchain-tools] registered tool kongchain_extension_catalog
[kongchain-developer] loaded
[kongchain-developer] registered tools ...
```

访问终端打印的带 token URL；页面加载后，智能体可调用：

- `kongchain_runtime_info`
- `kongchain_extension_catalog`
- `kongchain_developer_policy`
- `kongchain_validate_extensions`

### Headless 工具调用验证（无真实 API Key）

用官方 mock LLM server 验证工具真的被执行，而不是只出现在配置里：

```powershell
# 终端 A：mock provider（tool_call_success + success，repeat-last 覆盖标题等额外请求）
node --import tsx packages/test-support/llm-mock-server/src/bin.ts `
  --port 8000 --api-key mock-key --sequence tool_call_success,success --repeat-last `
  --tool-name kongchain_runtime_info --tool-arguments '{}' --success-text mock_tool_ok

# 终端 B
$env:DEEPSEEK_BASE_URL='http://127.0.0.1:8000/v1'; $env:DEEPSEEK_API_KEY='mock-key'
pnpm dsh --profile headless `
  --patch F:/KongChain/extensions/kongchain-bundle/verify.patch.yml `
  --json "call kongchain_runtime_info"
```

预期输出包含：

- `tool_call`：`kongchain_runtime_info`；
- `tool_result`：`status=completed`，内容含 `"product": "KongChain"`；
- `final`：`reason=completed`。

说明：`verify.patch.yml` 用绝对路径把同一组插件挂到官方 `headless` profile；这是开发验证入口，不是生产 profile。

## 5. 新增工具

1. 在对应扩展包的 `src/index.js` 中 `ctx.tools.register({...})`；
2. 必填 `name`、`description`、`parameters`、`output.schema`、`output.render`、`execute`；
3. 工具名全局唯一；
4. 重启 profile 或依赖 HMR 重组合；
5. 用 headless mock 或 Web 会话调用验证。

## 6. 新增技能

1. 在 `extensions/kongchain-skills/skills/<name>/SKILL.md` 新建文件；
2. 写 frontmatter：`name`、`description`；
3. bundle patch 的 `customSkillDirs` 已指向 `extensions/kongchain-skills/skills`，无需改 patch；
4. provider 监听目录变化；必要时重启；
5. 用 `kongchain_extension_catalog` 或 `kongchain_validate_extensions` 检查。

## 7. 新增 Bundle 行

1. 在 `extensions/kongchain-bundle/cordis.patch.yml` 的 `insert` 中添加行；
2. `name` 使用 profile 可解析的包名/路径；
3. 若行依赖服务，插件用 `inject` 声明，不要假设服务一定存在；
4. `--dump-config` 验证行存在且未 disabled；
5. 启动验证插件日志与工具注册。

## 8. 更新/卸载

- 更新本地扩展：修改 `extensions/` 文件后重启 profile；`link:` 依赖直接指向本 checkout。
- 卸载：从 profile 移除 bundle 与包（可通过 Plugin Manager 或 `dsh plugin remove`），重启；Cordis effect 清理注册。
- 禁用单行：在 profile `cordis.patch.yml` 中按 `id` 设置 `disabled: true`，不要删除上游文件。

## 9. 故障排查

| 现象 | 检查 |
|---|---|
| `--dump-config` 无 kongchain 行 | profile bundles 是否含 `@kongchain/bundle`；bundle patch 是否被 skip |
| 启动日志无 `[kongchain-*] loaded` | 插件包名是否可解析；行是否被 disabled；profile 是否用对 |
| 工具未出现在会话 | 插件是否 `inject: ['tools']`；工具名是否冲突；是否在 host 级注册 |
| 技能未出现 | `customSkillDirs` 路径是否正确；`SKILL.md` frontmatter 是否合法 |
| 页面 401 | 使用启动日志打印的带 token URL |
| 端口冲突 | 换 `--port`，不要杀其他 Harness 实例 |

## 10. 边界

- 只写 `extensions/**`、`docs/kongchain/**`、`F:\KongChain-logs/**`；
- 不修改 `packages/`、`apps/`、`vendor/`、根锁文件；
- 不把真实财务数据、生产库、客户文件、真实凭据用于开发验证；
- 实际权限由 Harness sandbox/permission preset 执行，开发者模式不能绕过操作系统限制。
