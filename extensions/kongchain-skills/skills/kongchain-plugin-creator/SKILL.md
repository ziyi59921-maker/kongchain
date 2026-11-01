---
name: kongchain-plugin-creator
description: 在控链开发者模式中通过官方 DSH Bundle/Plugin 机制创建、测试、安装、更新和回滚自有插件。用于用户提出“增加一个能力/插件”时，从需求分析、复用判断、清单、测试到安装验证的完整流程。
---

# 控链插件创造

## 先判断：复用、修改还是新建

1. 用 `kongchain_extension_catalog` / `kongchain_plugin_status` 查看已有扩展与插件。
2. 若现有工具/技能能覆盖，优先复用或配置，不新建。
3. 若只是行为差异，优先修改现有插件并升级版本。
4. 只有确实缺少能力时才创建新插件；不要每次需求都新建一个无关插件。

## 工作区与格式

- 只写 `extensions/kongchain-plugins/<slug>/`，不修改 `packages/`、`apps/`、上游锁文件。
- 每个插件是标准 DSH Bundle：
  - `package.json`：`name`（`@kongchain-plugin/<slug>`）、`version`、`description`、`license`、`main`、`dsh.bundle.patch`；
  - `cordis.patch.yml`：`insert` 一行，指向 `./src/index.js`；
  - `src/index.js`：Cordis 插件，`inject: ['tools']`，注册工具；
  - `test/*.test.mjs`：Node 测试；
  - `README.md`：用途、工具、权限、测试。
- 只使用当前 Harness 已有 API；不复制 Agent Loop，不引入另一套框架。

## 推荐流程

1. `kongchain_plugin_scaffold` 创建骨架；
2. 修改 `src/check.js`（纯逻辑）与 `src/index.js`（工具注册），保持工具名稳定；
3. 更新测试，覆盖正常、边界、错误输入；
4. `kongchain_plugin_check` 实际执行 `node --check` 与 `node --test`；
5. 修复失败后重新检查，直到 `ok: true`；
6. `kongchain_plugin_install` 安装/更新到 `kongchain-demo`（官方 `dsh plugin` 路径，自动备份/失败恢复）；
7. 用新进程/新会话验证插件确实被加载，并实际调用其工具；
8. 把版本、文件、测试、安装、调用结果写入 `docs/kongchain/BATCH_3_VERIFICATION.md` 或独立日志。

## 安全规则

- 只自动安装低风险、自有、无需扩大系统权限的插件。
- 第三方/未知来源/需要网络或系统权限的插件，先检查并取得用户明确授权，不得静默安装。
- 安装失败必须保留最后一个通过测试的版本；不要留下半成品。
- 不修改无关核心代码；不删除用户文件；测试使用模拟数据。


## 版本、更新与维护

1. 先 `kongchain_plugin_inventory` / `kongchain_plugin_version` 查版本、测试、installed/enabled、依赖、权限；能复用就不新建。
2. 升级前在隔离副本（如 `.test-fixtures/<plugin>-<version>`）修改，不改 live。
3. `kongchain_plugin_check` 必须通过；测试失败不得替换 live。
4. 用户授权/策略允许后调用 `kongchain_plugin_upgrade approve=true`：备份 live、复制候选、官方 link 刷新、激活。
5. 新进程实际调用新功能；不能声称当前进程已被热重载。
6. 失败时用 `kongchain_plugin_history` 看备份，恢复旧版本并重新验证。
7. 启停用 `kongchain_plugin_set_enabled`；卸载用 `kongchain_plugin_uninstall`（保留源码/备份）；每次记录 `kongchain_plugin_log`。
8. 权限/依赖扩大、外部来源、核心修改先审批；自动更新默认关闭。
