# @kongchain/experts

控链财务专家调度。复用 Harness 的 `subagent`/Agent Teams、Agent Preset、工具注册表和会话记录；不创建平行 Agent Loop，不创建只有头像和提示词的空壳专家。

## 专家

- 财务分析专家
- 会计核算专家
- 审计与内控专家
- 税务与政策研究专家
- Excel 与财务数据专家
- 报告与底稿专家（汇总专家）

每个专家是一个真实 `@deepseek-ai/dsh-agent-preset`，包含 persona、技能目录和真实工具（财务工具、文件工具、Web/报告工具按职责裁剪）。

## 工具

| 工具 | 作用 |
|---|---|
| `kongchain_expert_catalog` | 专家职责、工具、技能、输入输出、场景、真实状态 |
| `kongchain_expert_plan` | 任务→direct/single/parallel/review 调度建议与理由 |
| `kongchain_expert_dispatch` | 通过 `ctx.subagents.startActivation` 启动真实子代理 |
| `kongchain_expert_status` | 读取真实 dispatch/start/end 状态 |
| `kongchain_expert_log` | 记录计划、交接、复核、分歧、失败 |

## 协作约定

交接结构固定为：`conclusion`、`evidence`、`calculation`、`unknowns`、`nextSteps`、`disagreements`。

- 简单任务由主 Agent 直接完成。
- 复杂任务只调度有独立价值的专家。
- 独立复核必须使用不同数据检查/计算规则。
- 分歧明示，不强行平均。
- 未被调用的专家不显示为协作。

## 界面

`plugins.tab` 中提供“专家与能力中心”，展示专家职责、工具、技能、输入输出、场景；按钮把专家选择/自动调度提示写入原生任务输入区。真实参与与结果由 Harness 子代理卡片显示。

## 状态与日志

`F:\KongChain-logs\experts\status.json`、`events.jsonl` 记录 dispatch/start/end；失败和分歧保留原始 stopReason/输出预览。
