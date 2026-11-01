# @kongchain/dev-mode

控链开发者模式。它不是界面开关：状态由工具层 guard 强制执行。

## 入口

- Web 会话斜杠命令：`/developer status | on | off | core on | core off`；
- 工具：`kongchain_dev_mode`（status/enable/disable）、`kongchain_dev_policy`。

开启后只允许写：
- A `extensions/`（插件/技能/生成插件）；
- B `docs/kongchain/`（控链文档）；
- C `packages/`、`apps/` 等上游核心，**仅在 `/developer core on` 或 `core: true` 后**，并要求补丁差异与构建回归。

其余路径拒绝。关闭后，`write`/`edit` 与修改型 shell 命令由 `ctx.tools.guard` 拦截。

## 工具

| 工具 | 作用 |
|---|---|
| `kongchain_dev_mode` | 查看/开启/关闭模式 |
| `kongchain_dev_policy` | A/B/C/D 范围与执行策略 |
| `kongchain_dev_diff` | Git status/diff |
| `kongchain_dev_snapshot` | 保存可回滚补丁到 `F:/KongChain-logs/dev-snapshots`（完整补丁，不做截断） |
| `kongchain_dev_rollback` | 反向应用补丁，回到修改前；参数可传快照目录或其 `patch.diff` 路径 |
| `kongchain_dev_restore` | 重新应用补丁，恢复修改后；参数同上 |
| `kongchain_dev_test` | 语法检查 + Node 测试 |
| `kongchain_dev_command` | 允许列表内的开发命令（node/pnpm/npm/git/python/npx/tsx） |
| `kongchain_dev_reload` | 如实报告重启要求（模块源码变更不能靠配置 HMR） |

## 清单

- 版本：`0.1.0`
- 入口：`src/index.js`（ESM，无构建步骤）
- 依赖：Node 内置模块；`inject: ['tools']`；命令服务可选
- 状态文件：`.kongchain/developer-mode.json`（不进入版本库）
- 不扩大操作系统权限；不绕过原有 sandbox/approval；破坏性命令仍拒绝

## 限制

- HMR 只覆盖配置；插件模块源码修改需要重启 profile，工具会报告 `restart-profile`。
- `write`/`edit` 路径校验按文件路径；`pwsh` 用命令模式拦截，不能对任意脚本做语义沙箱，危险模式会被拒绝，但不应把开发者模式当作系统级沙箱。
- 命令输出默认保留末尾 8000 字符：`kongchain_dev_diff` 的 `detail` 是尾部截断，大改动要看 `git diff` 分段结果；快照补丁例外（`limit: 0`），否则补丁不完整、回滚与恢复必然失败。
- 快照目录 `F:/KongChain-logs/dev-snapshots` 在会话工作区之外，普通 `write`/`pwsh` 无法写入或修补该目录；补丁只能由 `kongchain_dev_snapshot` 生成。
