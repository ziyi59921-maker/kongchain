---
name: kongchain-developer
description: 控链开发者模式的操作规则。用于在 F:\KongChain 工作区内修改控链自有插件、技能、Bundle 与文档，执行构建/启动/验证，或排查扩展加载问题。
---

# 控链开发者模式

## 可写边界

只允许修改：

- `extensions/**`：控链自有包、插件源码、技能、bundle patch；
- `docs/kongchain/**`：产品规格、架构、扩展指南、验证记录；
- 临时日志：`F:\KongChain-logs\**`（不进入仓库）。

禁止修改：

- `packages/`、`apps/`、`vendor/`、`native/`、`python/`、`scripts/`、`benchmarks/`、`website/`；
- 根 `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`；
- `.git/` 内部状态，除非用户明确要求提交/分支操作。

开发者模式的实际文件系统边界由 Harness sandbox 与 permission preset 执行；本技能只描述纪律，不授予权限。不要用 `danger-full-access` 绕过边界来处理真实数据。

## 先读后写

1. 读取 `docs/kongchain/ARCHITECTURE.md` 与当前版本 `docs/architecture.md`，确认 API 仍存在。
2. 读取相关包 README 与源码，不假设 API。
3. 用 `kongchain_extension_catalog` 和 `kongchain_runtime_info` 获取真实路径/版本。
4. 只改最小文件集，保持控链代码与上游代码可区分。

## 扩展点优先级

1. 现有 Profile / Bundle / Patch 配置；
2. 新 Plugin（host 级或 agent preset 级）；
3. 新 Skill（`SKILL.md`）；
4. 新 Tool（`ctx.tools.register`）；
5. 只有现有扩展点无法满足时，才讨论修改上游核心，并单独评审。

## 验证

```powershell
$env:DSH_HOME='F:\KongChain-home'
Set-Location F:\KongChain

# 1. 组合是否识别扩展
pnpm dsh --profile kongchain --dump-config | Select-String kongchain

# 2. 启动
pnpm dsh --profile kongchain web --no-open --port 3082

# 3. 静态校验工具（启动后在会话中调用）
#    kongchain_validate_extensions
#    kongchain_developer_policy

# 4. Headless 工具调用（需要 mock LLM，见 docs/kongchain/EXTENSION_GUIDE.md）
pnpm dsh --profile headless --patch F:/KongChain/extensions/kongchain-bundle/verify.patch.yml --json "call kongchain_runtime_info"
```

## 失败处理

- 扩展未加载：先看启动日志中的 `[kongchain-*] loaded`，再 `--dump-config` 确认行存在且未被 disable，再检查包名解析与 patch 路径。
- 工具未出现：确认插件 `inject: ['tools']`、工具名唯一、`output.schema/render/execute` 完整；host 级注册与 agent preset 的可见性不同。
- 修改后行为不一致：停止服务，重新 `--dump-config`，再重启；不要靠反复热重载掩盖组合错误。
- 不把未验证的能力写进 `PRODUCT_SPEC.md` 或用户说明。
