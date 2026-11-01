# 第 7 批验证记录：插件自更新、版本管理与自我维护

> 说明：用户本轮消息称为“第 6 批”，但仓库已有 `BATCH_6_VERIFICATION.md`（能力演化闭环）。为避免覆盖历史，本文件按实际提交顺序命名为第 7 批。

- 日期：2026-10-30（Asia/Shanghai）
- 起点提交：`4d34225b`
- 项目：`F:\KongChain`
- Harness：`0.2.2-alpha.2`
- 模型：DeepSeek 官方 API

## 1. 能力清单与维护工具

扩展现有 `@kongchain/plugin-creator`，不复制官方插件管理器：

| 工具 | 作用 |
|---|---|
| `kongchain_plugin_inventory` | 版本、来源、依赖、权限、工具、测试状态、installed/enabled、备份、Harness 兼容性；技能清单 |
| `kongchain_plugin_version` | 本地版本 + profile 安装/启用状态；支持短名 |
| `kongchain_plugin_policy` | 维护策略读取/设置；自动更新默认关闭 |
| `kongchain_plugin_log` | 维护事件 JSONL |
| `kongchain_plugin_upgrade` | 隔离候选检查 → 备份 → 激活；失败恢复 |
| `kongchain_plugin_set_enabled` | 通过 `dsh.profile.bundles` 启用/禁用 |
| `kongchain_plugin_uninstall` | 官方 `dsh plugin remove` + bundle 移除；保留源码 |
| `kongchain_plugin_history` | 备份与维护日志 |

安装/更新仍走官方 `dsh plugin --profile ... add/remove`；没有编造在线插件市场。当前来源仅支持“控链本地插件”，外部可信 Git/人工导入仅作为后续扩展方向。

## 2. 实际验收

| # | 验收项 | 实际证据 |
|---|---|---|
| 1 | 创建自有插件 | 新建 `@kongchain-plugin/text-toolkit`，纯函数 `text_stats`，无第三方依赖；`kongchain_plugin_check` 通过 |
| 2 | 检查当前版本 | `kongchain_plugin_version` → 0.1.0、installed、enabled；Harness 0.2.2-alpha.2 |
| 3 | 新增功能 | 0.2.0 候选新增 `topN` 与 `topWords` 词频 |
| 4 | 修改旧插件 | 在隔离副本 `.test-fixtures/text-toolkit-0.2.0` 修改，live 保持 0.1.0 直到升级 |
| 5 | 生成新版本并测试 | 候选 `kongchain_plugin_check` → ok；升级后 34/34 测试通过 |
| 6 | 激活新版本 | `kongchain_plugin_upgrade` → `stage: activated`、0.1.0→0.2.0、installed/enabled true、备份存在 |
| 7 | 验证新增功能 | 新进程调用 `text_stats`，`topN=2` 返回 `payment×3、采购合同×1` |
| 8 | 模拟测试失败 | 0.3.0 候选故意失败：check 阶段失败（34 pass / 1 fail）；live 仍 0.2.0；再调用旧版成功 |
| 9 | 能力清单查看 | `inventory runTests=true`：text-toolkit 0.2.0、`text_stats`、34/34 pass、installed/enabled；策略 autoUpdate=false |

### 额外生命周期验证

- **禁用**：`set_enabled=false` 后新进程没有 `text_stats`，智能体如实报告不可用并解释 profile bundle 缺失；
- **启用**：`set_enabled=true` 后新进程实际调用成功；
- **卸载**：`uninstall` 走官方 `dsh plugin remove`，dependency 变为 null、installed=false；
- **重装**：`plugin_install` 重新 link，版本仍 0.2.0，enabled true；新进程调用成功。

## 3. 维护日志字段

`F:\KongChain-logs\plugins\kongchain-plugin-text-toolkit.jsonl` 记录：

- 来源、原版本/新版本、原因；
- 候选目录、live 目录；
- 依赖前后、权限前后；
- 测试 stdout/stderr 与真实计数；
- 激活结果、是否需要新进程；
- 失败阶段、是否保留旧版本、回滚结果。

`F:\KongChain-logs\plugins\maintenance-policy.json` 默认：

```json
{
  "autoUpdate": false,
  "allowedSources": ["local"],
  "requireTests": true,
  "requireSamePermissions": true,
  "allowPermissionExpansion": false
}
```

## 4. 权限与安全

- 只在 `extensions/kongchain-plugins/` 创建插件；不改 `packages/`、`apps/`、Agent Loop；
- 更新前检查候选测试；失败不替换 live；
- 权限/依赖变化默认阻止，需显式策略或审批；
- 外部来源、在线市场、权限扩大本轮未实现/未测试，不伪造；
- 卸载保留源码和备份，便于恢复。

## 5. 真实失败与限制

1. 生命周期代码新增后，插件工坊自身原先没有测试；本轮补了 4 个单元测试（工具注册、默认策略、清单、短名查版本），4/4 通过。
2. `text-toolkit` 初始创建时曾出现测试失败，智能体修复后通过；0.2.0 最终 34/34。
3. 升级采用“候选目录复制到 live + 官方 link 刷新”，不是热重载；必须新进程/重启才注册。
4. 技能清单显示 `unversioned`：SKILL.md frontmatter 当前没有版本字段；没有伪造版本号。
5. 当前无可信在线插件市场；只支持本地插件生命周期。
6. 自动更新默认关闭，本轮升级显式传 `approve=true`，不是无人值守自动更新。

## 6. 证据日志

- `F:\KongChain-logs\b7-create-text.jsonl`
- `F:\KongChain-logs\b7-upgrade-text.jsonl`
- `F:\KongChain-logs\b7-call-text-020.jsonl`
- `F:\KongChain-logs\b7-upgrade-fail.jsonl`
- `F:\KongChain-logs\b7-call-after-fail.jsonl`
- `F:\KongChain-logs\b7-final-inventory.jsonl`
- `F:\KongChain-logs\b7-disable.jsonl`、`b7-disabled-call.jsonl`、`b7-enable.jsonl`、`b7-reenabled-call.jsonl`
- `F:\KongChain-logs\b7-uninstall-reinstall.jsonl`、`b7-reinstall-call.jsonl`
- `F:\KongChain-logs\plugins\kongchain-plugin-text-toolkit.jsonl`

## 7. Git 与恢复

- 本批代码：`extensions/kongchain-plugin-creator`（生命周期扩展 + 测试）、`extensions/kongchain-plugins/text-toolkit`（0.2.0）、相关文档；
- 旧版本备份：`extensions/kongchain-plugins/.backups/text-toolkit-*`；
- 失败更新候选：`extensions/kongchain-plugins/.test-fixtures/text-toolkit-0.3.0`（gitignored）；
- 回滚方式：`kongchain_plugin_history` 查看备份 + `kongchain_plugin_upgrade` 恢复 / `kongchain_plugin_install` 重装；源码目录不会被卸载删除。
