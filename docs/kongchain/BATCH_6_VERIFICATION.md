# 第 6 批验证记录：能力演化闭环

- 日期：2026-10-29/30（Asia/Shanghai）
- 起点提交：`c24554f7`；能力层检查点：`4e695de2`
- 项目：`F:\KongChain`
- 模型：DeepSeek 官方 API
- 原则：创建/测试/安装/注册/调用全部有真实工具日志；不把“生成代码”当完成

## 1. 能力演化层

新增 `extensions/kongchain-capability-evolution/`：

| 工具 | 作用 |
|---|---|
| `kongchain_capability_discover` | 搜索现有 Skills/插件/登记记录，返回匹配与 gap |
| `kongchain_capability_register` | 登记名称/版本/来源/依赖/权限/测试/启用状态与历史 |
| `kongchain_capability_log` | 追加生命周期事件 JSONL |
| `kongchain_capability_verify` | 检查 profile 依赖/bundle 选中，如实报告需新进程 |
| `kongchain_capability_policy` | 自动更新默认关闭、审批矩阵、回滚要求 |

新增技能 `kongchain-capability-evolution`，规定“先发现、后创建”，并区分自动化/审批/手动事项。

## 2. 验收 1：创建 CSV 统计工具（完整闭环）

真实 DeepSeek Headless 会话执行：

1. `kongchain_capability_discover` + `kongchain_extension_catalog`：
   - 现有工具无 CSV 描述性统计；
   - `kongchain_financial_compare` 需要两表/键列，只比差异；
   - verdict = `gap`。
2. `kongchain_plugin_scaffold` 创建 `csv-statistics`，工具 `csv_statistics`；
3. 实现 `src/stats.js`、`src/check.js`、`src/index.js` 与 3 个测试文件；
4. 先出现两次真实失败（BigInt 初始值、零字节夹具未创建），修复后：
   - `kongchain_plugin_check` 通过；
   - **39 tests / 39 pass**；
5. `kongchain_plugin_install` 到 `kongchain-demo`：
   - `ok: true`, `stage: installed`, mode `link`；
   - profile dependency `link:F:/KongChain/extensions/kongchain-plugins/csv-statistics`；
   - bundle 选中；
6. `kongchain_capability_verify`：`installed: true`, `bundleSelected: true`, `registration: requires-new-process`；
7. `kongchain_capability_register` 写入 0.1.0、来源 local、依赖、权限（只读工作区）、测试 39/39、enabled true；
8. `kongchain_capability_log` 记录 discovered/gap/created/tested/installed/verified。

### 实际调用（不是导入测试）

全新 `kongchain-demo` Agent 会话：

- 首次直接调用 `F:\KongChain-logs\samples\expenses.csv` 被拒绝：
  `path outside authorized workspace ... (authorized root: F:\KongChain)`；
- 将同一文件复制到 `F:\KongChain\.tmp-csv-stats\expenses.csv`（SHA-256 一致）后实际调用成功；
- 返回：6 行、5 列、1 个缺失值、来源 SHA-256，以及 amount 列的 count/sum/mean/min/max；
- 首次失败没有被隐藏，也没有用预写结果代替。

日志：`F:\KongChain-logs\b6-create-csv.jsonl`、`b6-call-csv.jsonl`。

## 3. 验收 2：更新失败与旧版本保留

候选 `csv-statistics-candidate` 版本 0.2.0，加入故意失败测试：

- `kongchain_plugin_check`：`ok: false`，40 tests / 38 pass / 2 fail；
- `kongchain_plugin_install`：`ok: false`, `stage: check`；
- profile 依赖/bundle 未变；
- registry `csv-statistics` 仍为 0.1.0、enabled true；
- `kongchain_capability_log` 记录 `update-failed`，`replaced: false`、`rollbackExecuted: false`（安装在 check 阶段中止，未写 profile）；
- 再次用新会话调用旧版 0.1.0 `csv_statistics`：成功，6 行、缺失 1、金额统计正常。

日志：`F:\KongChain-logs\b6-update-fail.jsonl`、`b6-call-after-fail.jsonl`。

本场景的“回滚”是“失败更新未被执行、旧版本保持可用”，不是假装执行了一次安装再回滚。更一般的代码级回滚由 dev-mode 快照验证（下节）。

## 4. 验收 3：开发者模式修改、测试、diff、回滚/恢复

第一次在 CSV 插件尚未提交时，`kongchain_dev_snapshot` 只覆盖 tracked diff，插件文件 untracked，snapshot 不完整；智能体没有谎称成功，改用 scoped patch 完成验证，并明确记录限制。

随后提交能力代码（`4e695de2`），在干净工作区重测：

- 修改 `extensions/kongchain-plugins/csv-statistics/src/stats.js` 一行注释（不改变行为、不改版本）；
- `kongchain_dev_test` → `ok: true`，39 tests；
- `kongchain_dev_snapshot` → `ok: true`，patch 非空，目录 `.../2026-10-29T23-50-10-183Z-csv-tracked`；
- `kongchain_dev_diff` → 1 file changed, 1 insertion(+), 1 deletion(-)；
- `kongchain_dev_rollback` → `ok: true`，`git apply -R` 成功，注释恢复原样；
- `kongchain_dev_restore` → `ok: true`，注释回来；
- 再次 `kongchain_dev_test` → 39/39 通过。

日志：`F:\KongChain-logs\b6-dev-tracked.jsonl`。

## 5. 能力清单与记录

- 注册表：`F:\KongChain-logs\capabilities\registry.json`
  - `csv-statistics` 0.1.0，kind plugin，source local，enabled true，profile kongchain-demo；
- 事件：`F:\KongChain-logs\capabilities\csv-statistics.jsonl`
  - discovered/gap/created/tested/registered/installed/verified/called/update-failed；
- 安装 profile：`F:\KongChain-home\profiles\kongchain-demo`；
- 插件目录：`extensions/kongchain-plugins/csv-statistics/`。

## 6. 自动化 / 审批 / 手动 区分

### 自动化完成

- 能力发现、缺口判断；
- 插件 scaffold/实现/测试/检查；
- 安装到 profile、bundle 选中核验；
- 注册表/事件日志；
- 实际调用与失败更新拦截；
- 开发者模式快照、测试、diff、回滚/恢复。

### 需要用户审批

- 开发者模式本身（本轮由用户授权开启）；
- 自动更新策略（默认关闭；需明确开启）；
- 权限扩大、第三方来源代码、核心运行时修改、破坏性操作、生产部署；
- 本会话未申请审批，也未绕过审批。

### 仍需手动/新进程

- 已安装插件不会追溯注册到运行中的进程：需要新会话/重启 profile；
- 模块源码变更需要重启，不能声称 HMR 已生效；
- 审计结论、外部证据、真实业务数据需要人工复核；
- 快照当前覆盖整个 tracked 工作区，未跟踪文件需先提交或使用 scoped 补丁（本轮已记录）。

## 7. 验收对照

| 验收 | 结果 |
|---|---|
| 自然语言创建无害 CSV 统计工具 | ✅ 插件真实创建 |
| 测试 | ✅ 39/39，先失败后修复 |
| 安装 | ✅ `kongchain_plugin_install` link 到 demo |
| 注册 | ✅ 新进程实际注册并调用 |
| 实际调用 | ✅ 6 行 CSV 真实统计 |
| 日志记录 | ✅ registry + jsonl |
| 更新失败与回滚 | ✅ check 阻止 0.2.0，旧 0.1.0 仍可调用 |
| 开发者模式改码/测试/diff/恢复 | ✅ 39 tests、1 file diff、rollback/restore |
| 自动化/审批/手动区分 | ✅ 见第 6 节 |

## 8. 边界

- 不修改基础模型权重；不声称能自行修改模型。
- 不默认获得完整主机权限；开发者模式仍受 workspace 范围与 guard 约束。
- 不读取无关目录凭据/个人文件；本轮只使用 `F:\KongChain` 与 `F:\KongChain-logs\samples`。
- 创建/更新都走官方插件机制，没有绕过插件管理器。
