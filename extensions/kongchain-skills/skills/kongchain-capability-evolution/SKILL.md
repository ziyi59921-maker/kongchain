---
name: kongchain-capability-evolution
description: 控链能力演化闭环：先发现现有 Skills/Tools/插件，确认缺口；将需求转成能力说明；创建/测试/安装/注册/实际调用；更新失败回滚；记录全过程。用于用户要求新增或升级能力时。
---

# 能力演化闭环

## 1. 先发现，后创建

1. 调用 `kongchain_capability_discover(query)` + `kongchain_extension_catalog`，检查现有 Skills、Tools、生成插件。
2. 若可复用/扩展，优先复用；只有确实存在能力缺口才新建，避免重复插件。
3. 用 `kongchain_capability_log` 记录 `discovered` 与 `gap` 结论。

## 2. 能力说明

在创建前明确：
- 名称与唯一 ID；
- 用途；
- 输入/输出；
- 依赖与版本；
- 所需文件/网络/系统权限；
- 失败处理；
- 测试方式；
- 兼容的 Harness 版本/接口。

## 3. 创建与安装（真实机制）

- 用 `kongchain_plugin_scaffold` 创建标准 Bundle；
- 实现代码与测试；`kongchain_plugin_check` 必须 `ok: true`；
- 检查依赖许可证和安全风险；第三方/扩权/核心修改必须审批；
- `kongchain_plugin_install` 安装到 profile（官方 `dsh plugin` 路径，备份/失败恢复）；
- `kongchain_capability_verify` 查依赖/bundle 是否选中；新进程才能注册，必须如实说明；
- 在新进程/会话中真正调用新工具；
- `kongchain_capability_register` 写入版本/来源/依赖/权限/测试结果/启用状态；
- `kongchain_capability_log` 记录 install/verified/called。

未安装、未注册、调用失败都不算完成。

## 4. 更新与回滚

- 更新前保存上一可用版本/快照；
- 候选版本先测试；失败不得替换旧版本；
- 本地可信、同权限、测试通过、有备份的插件才可在用户明确开启自动更新策略后自动更新；
- 权限扩大、第三方代码、核心运行时修改、高风险操作必须审批；
- 失败时恢复上一可用版本，并在新进程中验证旧工具仍可调用；
- 记录 update-failed / rollback / restored-verified 事件。

## 5. 开发者模式

修改控链自身源码时，先 `/developer on`；使用 `kongchain_dev_snapshot`、`kongchain_dev_test`、`kongchain_dev_diff`、`kongchain_dev_rollback/restore`；核心源码需 `/developer core on` 并单独构建/回归。模块源码变更需重启 profile，不能声称实时生效。

## 6. 汇报

区分：
- 自动化已完成；
- 需要用户审批（权限扩大、第三方、核心修改、破坏性操作）；
- 仍需手动操作（重启、人工复核、外部证据）。
