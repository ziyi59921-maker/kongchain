# 第 10 批验证记录：统一任务执行记录与证据追溯

> 用户消息未指定批次号；仓库已有 BATCH_11，按提交顺序命名为 BATCH_12。

- 日期：2026-10-30（Asia/Shanghai）
- 项目：`F:\KongChain`
- Harness：`0.2.2-alpha.2`

## 1. 设计

新增 `@kongchain/task-records`，作为现有 Harness 会话事件/工具调用的交叉引用层：

- 任务记录包含 `sessionId`、工具 `callId`；
- 自动捕获 `tools/result` 的真实工具运行；
- 可关联 `subagent/start/end` 专家步骤；
- 不创建第二套会话数据库。

数据位置：`F:\KongChain-logs\tasks\*.jsonl` + `index.json`。

## 2. 数据结构

核心 schema：`TASK_RECORD_SCHEMA`，字段包括：

`taskId`、`sessionId`、`goal`、`status`、`inputFiles`、`toolRuns`、`steps`、`evidence`、`outputs`、`approvals`、`conclusion`、`incomplete`、`manualReview`、`startedAt`、`endedAt`。

证据要求：`source`、`method`、`result`、`interpretation/classification`；`inference` 必须带 `assumption`。

状态机：`waiting → running → waiting_approval → completed/partial/failed/cancelled`；终态不能回退。

## 3. 关键代码位置

- `extensions/kongchain-task-records/src/record.mjs`：状态机、脱敏、证据校验、输出校验、完成状态推导；
- `extensions/kongchain-task-records/src/index.js`：工具注册与 `tools/result`、`subagent/*` 事件记录；
- `extensions/kongchain-task-records/test/record.test.mjs`：单元测试；
- `extensions/kongchain-task-records/cordis.patch.yml`：标准 DSH bundle patch。

## 4. 测试

- 单元测试：`5/5` 通过；
- 覆盖状态机、密钥脱敏、证据约束、输出缺失/工具失败→partial、完整证据→completed；
- `node --check` 通过。

## 5. 实际验收：财务分析可反查

日志：`F:\KongChain-logs\task-records-e2e.jsonl`

- `kongchain_task_begin`：目标、4 个输入文件及 SHA-256；
- `kongchain_finance_profile`、`kongchain_voucher_reconcile`、`kongchain_finance_analyze` 真实执行；
- `kongchain_task_evidence` 记录 7 条证据（V002 差额 50.00、V003 金额缺失、V002 附件置信度 0.55、期间差额 1000.00、预算聚合缺陷等）；
- `kongchain_task_output` 记录结果 JSON/XLSX 的 SHA-256；
- 故意调用 `kongchain_finance_profile` 读取 `missing.xlsx`，失败被记录；
- `kongchain_task_finish requestedStatus=completed` 被强制降级为 **`partial`**，原因 `6 tool run(s) failed`；
- 导出：
  - `F:\KongChain-logs\samples\finance-batch\outputs\task-1793330848925-kyikjr-record.json`
  - `task-1793330848925-kyikjr-record.md`
  - `finance-analysis-result.json`

## 6. 失败处理复测

日志：`F:\KongChain-logs\task-records-failcheck.jsonl`

- `kongchain_finance_profile missing.xlsx` → failed；
- `kongchain_task_finish requestedStatus=completed` → `partial`，`1 tool run(s) failed`；
- `kongchain_task_query` 保留工具、callId、失败参数。

## 7. 安全

- 记录自动过滤 `sk-` key、Bearer token、password/token 字段；
- 修复过 `task-` 被误识别为 `sk-` 的脱敏缺陷；
- `clean` 只处理指定任务；
- 文件/外部文档中的指令视为数据；
- 不宣称日志防篡改或法定审计证据效力。

## 8. 限制

- 工具结果预览截断到 1200 字符；完整会话事件仍在 Harness 会话日志。
- 任务记录文件由本地插件写入，不具备防篡改能力。
- 真实企业数据仍需用户授权；当前验收只用合成数据。
