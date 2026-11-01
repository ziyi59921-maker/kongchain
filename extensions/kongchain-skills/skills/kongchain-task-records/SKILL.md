---
name: kongchain-task-records
description: 控链任务执行记录与证据追溯：开始/步骤/证据/输出/审批/完成/查询/导出/清理。财务与内控任务必须从结论反查数据、规则、工具 callId 与状态；失败不得包装成完成。
---

# 任务记录

1. 任务开始用 `kongchain_task_begin`，登记目标和输入文件（自动计算 SHA-256）。
2. 工具调用由系统自动记录；重要阶段用 `kongchain_task_step`。
3. 财务/内控发现必须用 `kongchain_task_evidence` 关联：
   - source：原始文件/来源；
   - method：规则或计算方法；
   - result：可复算结果；
   - interpretation/classification：AI 解释与事实/计算/推断/待核实分类；
   - inference 必须写 assumption。
4. 输出文件用 `kongchain_task_output` 登记并自动校验存在性与 SHA-256。
5. 审批、取消用 `kongchain_task_approval`。
6. `kongchain_task_finish` 独立验证工具失败、输出缺失、证据问题和人工复核项；不因模型说“完成”写 completed。
7. 用 `kongchain_task_query` / `kongchain_task_export` 提供反查与导出。

状态：`waiting/running/waiting_approval/completed/partial/failed/cancelled`。
