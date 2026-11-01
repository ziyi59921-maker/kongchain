---
name: kongchain-dev-mode
description: 控链开发者模式：/developer 入口、写范围 guard、代码 diff、快照回滚/恢复、测试与重启要求。用于需要修改控链自有源码、插件或配置的开发任务。
---

# 控链开发者模式

## 入口与状态

- 用户可在 Web 输入 `/developer status|on|off|core on|core off`；
- 智能体可调用 `kongchain_dev_mode`（status/enable/disable，enable 需 `confirm: true`）；
- 关闭状态下，`write`/`edit` 与修改型 shell 命令会被工具层 guard 拒绝，不是靠提示词。

## 写范围

- A：`extensions/`（插件、技能、生成插件）；
- B：`docs/kongchain/`；
- C：`packages/`、`apps/` 等核心，仅 `coreAuthorized` 后允许，必须记录补丁并跑构建/回归；
- D：其他目录、凭据、生产系统，默认拒绝。

## 开发流程

1. `kongchain_dev_mode status`；关闭时请求/执行 enable（用户已明确开启）。
2. 找到现有实现，`read/grep` 确认位置，不做无依据修改。
3. 修改前 `kongchain_dev_snapshot` 保存回滚点。
4. 使用 `write`/`edit`/`kongchain_dev_command` 修改并测试。
5. `kongchain_dev_diff` 查看实际差异；`kongchain_dev_test` 运行测试。
6. 失败时读错误、修复；超过合理重试次数停止并报告。
7. 需要回滚：`kongchain_dev_rollback(snapshot)`；恢复：`kongchain_dev_restore(snapshot)`。
8. `kongchain_dev_reload` 如实说明重启要求；模块源码变更不能声称热重载已生效。

## 禁止

- 用开发者模式扩大系统权限、读取凭据、访问未授权目录；
- 删除大量文件、重置项目、修改系统配置；
- 把未测试代码部署到生产；
- 关闭模式后继续写源码。
