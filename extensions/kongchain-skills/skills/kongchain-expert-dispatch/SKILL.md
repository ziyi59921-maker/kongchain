---
name: kongchain-expert-dispatch
description: 控链财务专家调度：先判断是否需要专家，使用 kongchain_expert_plan/dispatch 启动真实子专家，传递结构化交接，合并时保留分歧与失败。用于采购付款、财务分析、税务政策等复杂或多角色任务。
---

# 专家调度

1. 简单汇总/统计任务由主 Agent 直接完成，不组队。
2. 复杂任务先 `kongchain_expert_plan`，只选有独立价值的专家。
3. `kongchain_expert_dispatch` 启动真实 Harness 子代理；并行任务在一条消息中多次调用。
4. 交接结构：`conclusion`、`evidence`、`calculation`、`unknowns`、`nextSteps`、`disagreements`。
5. 独立复核必须使用不同数据检查/计算规则；不要重复同一模型请求当作验证。
6. 汇总专家（报告与底稿专家）整合结果；分歧明示，不强行平均。
7. 失败、超时、无终态 JSON 都如实显示；过程消息/产物可用于分析，但不能冒充完整成功。
8. 未调用的专家不得显示为“正在协作”。
