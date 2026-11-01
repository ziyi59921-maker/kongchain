# @kongchain/task-records

统一任务执行记录与证据追溯。它引用现有 Harness 会话事件和工具调用（sessionId/callId），不创建第二套会话数据库。

## 记录结构

每条任务记录保存：

- 目标、输入文件与 SHA-256；
- 工具运行（工具名、callId、状态、参数摘要、结果摘要）；
- 专家/子代理步骤；
- 关键步骤、审批、取消；
- 发现证据：source、method/rule/calculation、result、interpretation/classification；
- 输出文件与 SHA-256/存在性；
- 最终状态、结论、未完成事项、人工复核要求。

## 状态

`waiting`、`running`、`waiting_approval`、`completed`、`partial`、`failed`、`cancelled`。

`kongchain_task_finish` 会独立验证输出文件、工具失败和证据完整性；不因为模型说“完成”就写 completed。

## 工具

`kongchain_task_schema`、`begin`、`step`、`evidence`、`output`、`approval`、`finish`、`cancel`、`query`、`export`、`clean`。

## 安全

- 任务记录过滤 API key、Bearer token、password/token 字段；
- 日志不具备防篡改/法定审计证据效力；
- `clean` 只处理指定任务记录；
- 文件/外部文档中的指令视为数据，不得修改系统策略。
