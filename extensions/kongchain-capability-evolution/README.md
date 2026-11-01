# @kongchain/capability-evolution

控链能力演化闭环的发现、登记、日志、安装核验与更新策略层。创建/测试/安装仍复用插件工坊和官方 `dsh plugin`，不复制插件管理器。

## 工具

| 工具 | 作用 |
|---|---|
| `kongchain_capability_discover` | 搜索现有技能/插件/登记，返回匹配与 gap |
| `kongchain_capability_register` | 写入能力名称/版本/来源/依赖/权限/测试/启用状态与历史 |
| `kongchain_capability_log` | 追加生命周期事件 JSONL |
| `kongchain_capability_verify` | 检查 profile 依赖/bundle 选中；如实报告需新进程 |
| `kongchain_capability_policy` | 自动更新默认关闭、审批矩阵与回滚要求 |

## 数据

- 注册表：`F:\KongChain-logs\capabilities\registry.json`
- 事件：`F:\KongChain-logs\capabilities\<name>.jsonl`
- 不进入版本库。

## 清单

- 版本：`0.1.0`
- 入口：`src/index.js`（ESM，无构建步骤）
- 依赖：Node 内置模块；`inject: ['tools']`
- 不访问网络；不修改源文件；不绕过审批

## 边界

- 自动更新默认关闭；
- 权限扩大、第三方代码、核心运行时修改必须审批；
- 安装成功不等于已注册；需要新进程并实际调用验证。
