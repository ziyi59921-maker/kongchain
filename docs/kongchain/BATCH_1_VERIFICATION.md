# 第 1 批验证记录：扩展架构

- 日期：2026-10-29（Asia/Shanghai）
- 基线：DSH `f3803c96974ad4a94195fb97e5c637e9c2a3afe3`（0.2.2-alpha.2）
- 分支：`kongchain/dev`
- 隔离 Home：`F:\KongChain-home`
- Profile：`kongchain`（bundles：`@deepseek-ai/dsh-base` → `@deepseek-ai/dsh-web-app` → `@kongchain/bundle`）

## 1. 架构核查结论

| 机制 | 当前版本事实 | 来源 |
|---|---|---|
| Profile | `$DSH_HOME/profiles/<name>/package.json` 的 `dsh.profile.bundles` + `cordis.patch.yml` | `packages/boot/app-boot/README.md#profiles` |
| Bundle | `dsh.bundle.patch` 一个文件或有序数组；按 bundle 顺序叠加 | `packages/util/official-bundles/src/bundles.ts`、`packages/bundle/*/package.json` |
| Patch | `insert` / 按 id 覆盖整段 config / `!!js`；后层覆盖前层 | `packages/bundle/base/cordis.patch.yml`、`packages/bundle/web-app/cordis.patch.yml` |
| Plugin | Cordis 模块 `name` + `inject` + `apply`；effect 自动清理 | `docs/user/develop/basic/index.md`、`framework/service.md` |
| Tool | `ctx.tools.register({name,description,parameters,output:{schema,render},execute})`；host + per-scope 分层 | `packages/core/tools/src/index.ts:128`、`contracts.ts` |
| Model | `ctx.llm` + `dsh-llm-deepseek` / `dsh-llm-pi-ai`；未修改 | `packages/llm/*/README.md` |
| Session | `ctx.sessions`，append-only `SessionEvent`；model-visible ⟺ logged；未修改 | `docs/architecture.md#turn-flow` |
| Plugin Manager | `dsh plugin --profile <name> <pnpm args>` 在 profile 目录转发 pnpm；新 bundle 自动加入选择 | `packages/boot/plugin-manager/src/operations.ts#reconcile` |
| 重载/卸载 | HMR 可用时重组合；无 HMR 需重启；bundle deselect/卸载停止受影响插件并 evict 模块 | `packages/boot/plugin-manager/README.md` |
| 开发入口 | `pnpm dsh --profile ...`、`--dump-config`、`--patch`、`pnpm run dev:web` | `docs/development.md`、`apps/cli/README.md` |

结论：无需修改 Agent Loop 或核心源码；Profile + Bundle + Patch + Plugin + Skill 足以承载控链扩展。

## 2. 创建的文件

`extensions/`（18 个文件）与 `docs/kongchain/`（4 个文件）：

- `extensions/kongchain-core/`：`@kongchain/core`，`kongchain_runtime_info`
- `extensions/kongchain-tools/`：`@kongchain/tools`，`kongchain_extension_catalog`
- `extensions/kongchain-developer/`：`@kongchain/developer`，`kongchain_developer_policy` + `kongchain_validate_extensions`
- `extensions/kongchain-skills/`：`kongchain-product`、`kongchain-developer` 两个 `SKILL.md`
- `extensions/kongchain-bundle/`：`@kongchain/bundle` 的 patch + headless 验证 overlay
- `docs/kongchain/`：PRODUCT_SPEC、ARCHITECTURE、EXTENSION_GUIDE、本验证记录

`git status` 仅显示 `?? extensions/`、`?? docs/kongchain/`；上游已跟踪文件零修改。

## 3. Profile 安装

```powershell
$env:DSH_HOME='F:\KongChain-home'
Set-Location F:\KongChain
pnpm dsh --profile kongchain --from-default-profile web --dump-config 1> $null
pnpm dsh plugin --profile kongchain add `
  link:../../../KongChain/extensions/kongchain-core `
  link:../../../KongChain/extensions/kongchain-tools `
  link:../../../KongChain/extensions/kongchain-developer `
  link:../../../KongChain/extensions/kongchain-skills `
  link:../../../KongChain/extensions/kongchain-bundle
```

结果：`EXIT=0`；profile `package.json` 的 bundles 末尾出现 `@kongchain/bundle`；`@kongchain/*` 包以符号链接安装到 profile `node_modules`。

## 4. 组合识别（`--dump-config`）

```powershell
pnpm dsh --profile kongchain --dump-config
```

输出包含（节选）：

```yaml
# == @deepseek-ai/dsh-base, patched by @deepseek-ai/dsh-web-app, @kongchain/bundle
- id: system-prompt
  config:
    personaPrefix: >-
      You are KongChain (控链), an extensible AI agent workbench ...
# == @kongchain/bundle
- id: kongchain-core
  name: '@kongchain/core'
- id: kongchain-tools
  name: '@kongchain/tools'
- id: kongchain-developer
  name: '@kongchain/developer'
- id: kongchain-skill-filesystem
  name: '@deepseek-ai/dsh-skill-filesystem'
  config:
    providerName: kongchain-filesystem
    includeDefaultRoots: false
    customSkillDirs:
      - F:/KongChain/extensions/kongchain-skills/skills
    watch: true
```

## 5. 启动（KongChain Web Profile）

```powershell
$env:DSH_HOME='F:\KongChain-home'
$env:DSH_PROFILE='kongchain'
$env:DSH_PROFILE_DIR='F:\KongChain-home\profiles\kongchain'
Set-Location F:\KongChain
pnpm dsh --profile kongchain --no-open --port 3082
```

启动日志（节选）：

```
[kongchain-core] loaded version=0.1.0 profile=kongchain repo=F:\KongChain
[kongchain-core] registered tool kongchain_runtime_info
[kongchain-tools] loaded
[kongchain-tools] registered tool kongchain_extension_catalog
[kongchain-developer] loaded
[kongchain-developer] registered tools kongchain_developer_policy, kongchain_validate_extensions
dsh web: http://127.0.0.1:3082/?token=...
```

- HTTP：带 token `200`；无 token `401`。
- 页面标题：`DSH 本地构建`；版本 `0.2.2-alpha.2-f3803c9`。
- 插件页“已安装插件”显示 `@kongchain/bundle`，开关为开启状态：
  `F:\KongChain-logs\kongchain-plugins2.png`
- 页面需要模型配置（干净 Home 未登录），这是预期限制；不影响扩展加载验证。

## 6. Agent Loop 内工具执行验证（Headless + mock LLM）

使用官方 mock LLM server，不需要真实 API Key；`verify.patch.yml` 用绝对路径把同一组插件挂到官方 `headless` profile。

### 6.1 工具调用

```powershell
$env:DEEPSEEK_BASE_URL='http://127.0.0.1:8000/v1'; $env:DEEPSEEK_API_KEY='mock-key'
pnpm dsh --profile headless `
  --patch F:/KongChain/extensions/kongchain-bundle/verify.patch.yml `
  --json "call kongchain_runtime_info"
```

结果：`EXIT=0`，事件链：

```
tool_call: kongchain_runtime_info input={}
tool_result: status=completed
  { "product": "KongChain", "productVersion": "0.1.0",
    "upstreamCommit": "f3803c96974ad4a94195fb97e5c637e9c2a3afe3",
    "workspaceRoot": "F:\\KongChain", ... }
final: reason=completed text=mock_tool_ok
```

日志：`F:\KongChain-logs\headless-kongchain.jsonl`

### 6.2 技能加载

mock 工具调用改为 `skill({"name":"kongchain-product"})`；结果：

```
tool_result: status=completed
  <skill_content name="kongchain-product">
  Base directory: F:\KongChain\extensions\kongchain-skills\skills\kongchain-product
  # 控链产品工作法 ...
final: reason=completed
```

说明：`dsh-skill-filesystem` provider 已读取控链技能目录，技能可被模型按名加载。

日志：`F:\KongChain-logs\headless-kongchain-skill.jsonl`

### 6.3 开发者静态校验

mock 调用 `kongchain_validate_extensions`，结果：

```json
{
  "ok": true,
  "issues": [],
  "extensionCount": 5,
  "skillCount": 2,
  "checks": [ ... 9 项全部 ok ... ]
}
```

日志：`F:\KongChain-logs\headless-kongchain-validate.jsonl`

## 7. 原版 Harness 与 Agent Loop 未破坏

- 原版 `web` profile 仍在 `http://127.0.0.1:3080/` 返回 `HTTP 200`（带 token），页面与第 0 批一致。
- 原版 `headless` profile 的 mock 工具调用在本批仍可运行（`read` 工具在第 0 批验证；本批 headless 运行使用同一 Agent Loop，仅通过 `--patch` 增加控链插件）。
- `git diff` 为空：`packages/`、`apps/`、`vendor/`、锁文件均未修改。
- Profile 复用官方 `dsh-base` + `dsh-web-app`；bundle patch 只新增行与覆盖 persona。

## 8. 已知限制

1. 干净 `F:\KongChain-home` 未配置模型，Web UI 会话内未做真实模型对话；工具/技能执行用 Headless + mock LLM 验证。接入真实模型需要在 Web 设置中配置 API Key，不属于本批范围。
2. `kongchain-skill-filesystem` 的 `customSkillDirs` 使用绝对路径 `F:/KongChain/...`；移动 checkout 需同步更新。
3. 本批没有演练插件卸载；卸载行为依据当前版本 Plugin Manager 源码/文档记录，未做破坏性测试。
4. Host 级工具在 Web preset 中的可见性依据工具注册表的 global layer 设计；本批未在 Web 会话中实际调用（原因同上：无模型）。
5. 插件注册日志中的 `profile` 来自 `$DSH_PROFILE` 环境变量；从其他 Harness 会话启动 shell 时应显式设置，避免继承 `desktop`。
