# @kongchain/plugin-creator

控链插件工坊：在隔离扩展工作区内创建、测试、安装、更新、启停、卸载和回滚**自有本地插件 Bundle**。

不复制官方插件管理器：

- 安装/更新走官方 `dsh plugin --profile ... add link:<dir>`（pnpm + profile bundle reconcile）；
- 卸载走官方 `dsh plugin ... remove <pkg>`；
- 插件格式就是标准 DSH Bundle（`dsh.bundle.patch` + Cordis patch）；
- Web Creator Mode 的 `plugin_manager` / `cordis_inspect` 仍可同时使用。

## 工具

| 工具 | 作用 |
|---|---|
| `kongchain_plugin_inventory` | 版本、来源、依赖、权限、工具、测试状态、installed/enabled、备份、Harness 兼容性；技能清单 |
| `kongchain_plugin_status` | 旧版简表：插件目录、版本、profile |
| `kongchain_plugin_scaffold` | 创建 package.json / cordis.patch.yml / src / test / README 骨架 |
| `kongchain_plugin_check` | manifest、bundle patch、`node --check`、`node --test` |
| `kongchain_plugin_version` | 本地版本 + profile 安装/启用状态；支持包名或短名 |
| `kongchain_plugin_install` | 检查、备份、安装/更新到 profile；失败恢复 |
| `kongchain_plugin_upgrade` | 隔离候选 → 测试 → 权限/依赖比较 → 备份 → 激活；失败恢复 |
| `kongchain_plugin_rollback` | 恢复最近备份 |
| `kongchain_plugin_set_enabled` | 编辑 `dsh.profile.bundles` 启用/禁用 |
| `kongchain_plugin_uninstall` | 官方 remove + bundle 移除；保留源码/备份 |
| `kongchain_plugin_policy` | 维护策略；自动更新默认关闭 |
| `kongchain_plugin_log` | 维护事件 JSONL |
| `kongchain_plugin_history` | 备份与维护日志 |

## 维护策略

默认：

```json
{
  "autoUpdate": false,
  "allowedSources": ["local"],
  "requireTests": true,
  "requireSamePermissions": true,
  "allowPermissionExpansion": false
}
```

- 本地可信、同权限、测试通过、已有备份的插件，用户明确启用策略后才允许自动更新；
- 权限/依赖变化、外部来源、核心运行时修改需审批；
- 不伪造在线市场。

## 清单

- 版本：`0.1.0`
- 入口：`src/index.js`（ESM，无构建步骤）
- 依赖：Node 内置模块（fs/path/child_process）；`inject: ['tools']`
- 测试：`test/lifecycle.test.mjs`（4 项）
- 写范围：`extensions/kongchain-plugins/` 与目标 profile 的依赖/链接

## 安全边界

- 只自动安装低风险、自有、无提权需求的插件；
- 安装前必须通过 `node --check` 与测试；
- 第三方/未知来源/需扩权插件不得静默安装；
- 失败时保留测试通过的旧版本；
- 不修改 `packages/`、`apps/`、Agent Loop 或上游锁文件。
