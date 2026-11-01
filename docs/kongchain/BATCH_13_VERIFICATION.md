# 第 11 批验证记录：能力演化闭环

- 日期：2026-10-30（Asia/Shanghai）
- 项目：`F:\KongChain`
- Harness：`0.2.2-alpha.2`
- 任务记录：`F:\KongChain-logs\tasks\*.jsonl`

## 1. 能力发现

用户需求：无害 CSV 统计工具。

- `kongchain_capability_discover` 与 `kongchain_extension_catalog` 检查现有能力；
- 现有 `@kongchain-plugin/csv-statistics` 0.1.0 覆盖 count/sum/mean/min/max、缺失、列信息；
- 确认缺口：中位数、分位数、直方图/分箱；
- 因此创建互补 `csv-distribution`，不重复、不替换现有工具。

## 2. 能力说明

- 名称：`@kongchain-plugin/csv-distribution` 0.1.0
- 工具：`csv_distribution`
- 输入：授权工作区 CSV、column、bins
- 输出：min/max/mean/median/percentiles/histogram/missing/source SHA-256
- 依赖：Node 内置模块
- 权限：只读授权工作区
- 失败处理：路径越权、缺少列、非数值明确报错

## 3. 创建闭环

任务：`task-1793331480041-2fs8l0`，最终 **completed**。

1. `kongchain_task_begin` 登记目标、输入与期望输出；
2. 发现缺口并记录；
3. `kongchain_plugin_scaffold` 创建；
4. 实现纯函数与测试；
5. `kongchain_plugin_check` 通过；
6. 检查 MIT 许可与无第三方运行依赖；
7. `kongchain_plugin_install` 到 `kongchain-demo`；
8. `kongchain_capability_verify`、`kongchain_plugin_inventory`、`kongchain_capability_register`、`kongchain_capability_log`；
9. 新进程实际调用 `csv_distribution`；
10. `kongchain_task_evidence` 8 条、`kongchain_task_output` 校验 SHA-256、`kongchain_task_finish`。

测试：`csv-distribution` **38/38**。

## 4. 实际调用

日志：`F:\KongChain-logs\loop-call-csv-dist.jsonl`

- 直接调用 `F:\KongChain-logs\open-task\input\invoice-2026-03-02.csv` 被工具拒绝（授权根为 `F:\KongChain`）；
- 将同一文件复制到工作区，SHA-256 一致；
- `csv_distribution` 返回 count=2、missing=0、min=100、max=200、均值/中位数=150、分位数/直方图；
- `csv_statistics` 独立交叉验证同一源哈希。

## 5. 更新失败与回滚

任务：`task-1793331856903-qdf9wm`，最终 **failed**。

- 候选 `.test-fixtures/csv-distribution-0.2.0` 含故意失败测试；
- `kongchain_plugin_check`：manifest/bundle/node 通过，tests 失败；
- `kongchain_plugin_upgrade`：`stage: check` 拒绝；
- live `csv-distribution` 仍 0.1.0、installed/enabled；
- `kongchain_plugin_history` 有备份；
- `kongchain_task_finish requestedStatus=failed`，失败原因记录，未包装成完成。

## 6. 开发者模式

任务：`task-1793331918917-b5vm0z`，最终 **partial**（如实记录）。

- 开发者模式开启，`coreAuthorized: false`；
- 修改 `csv-distribution/src/stats.js` 注释；
- `kongchain_dev_test` 通过；
- `csv-distribution` 文件未 Git 跟踪，snapshot/rollback/restore 对该文件失败（`No valid patches`）；
- 随后在 tracked 的 `kongchain-dev-mode/src/index.js` 修改注释：
  - `kongchain_dev_test` 通过；
  - `kongchain_dev_snapshot` 生成非空补丁；
  - `kongchain_dev_diff` 显示 1 文件 +2/−1；
  - `kongchain_dev_rollback` 成功；
  - `kongchain_dev_restore` 成功；
  - 再次测试通过；
- `kongchain_task_finish` 保持 partial，因为未跟踪文件步骤失败。

## 7. 自动化 / 审批 / 手动

**自动化完成：**
能力发现、能力说明、scaffold、实现、测试、许可证/安全检查、官方安装、清单/注册/日志、实际调用、更新失败拦截、tracked 代码快照/回滚/恢复、任务记录。

**需要用户审批：**
开发者模式本身、自动更新策略、权限/依赖扩大、核心运行时修改、第三方来源、破坏性命令。本轮更新为用户授权的显式 `approve=true`。

**仍需手动/限制：**
- 插件模块变更需重启/新进程才能注册；
- `csv-distribution` 创建时文件未跟踪，dev snapshot 不能处理未跟踪文件；已改为 tracked 文件验证恢复；
- 快照目前覆盖 tracked diff，未跟踪文件需先提交；
- 真实企业数据、外部政策/税务资料、人工复核仍需用户授权；
- 日志/任务记录不具防篡改或法定审计证据效力。

## 8. 关键代码与记录

- 能力发现/注册：`extensions/kongchain-capability-evolution`
- 插件创建/安装/升级/回滚：`extensions/kongchain-plugin-creator`
- 新插件：`extensions/kongchain-plugins/csv-distribution`
- 任务记录：`extensions/kongchain-task-records`
- 开发者模式：`extensions/kongchain-dev-mode`
- 能力日志：`F:\KongChain-logs\capabilities\csv-distribution.jsonl`
- 插件维护日志：`F:\KongChain-logs\plugins\kongchain-plugin-csv-distribution.jsonl`
