# 第 9 批验证记录：财务专业专家调度

> 用户消息称为第 7 批；仓库已有 BATCH_7/9/10，故按提交顺序命名为 BATCH_11，避免覆盖历史。

- 日期：2026-10-30（Asia/Shanghai）
- 项目：`F:\KongChain`
- Harness：`0.2.2-alpha.2`
- 模型：DeepSeek 官方 API

## 1. 复用的真实机制

审计确认并直接使用：

- `ctx.subagents.startActivation` / `subagent/start` / `subagent/end`；
- `subagent`、`subagent_fork`、`list_agents`、`send_message`、`interrupt_agent`；
- `@deepseek-ai/dsh-agent-preset` / Agent Preset Registry；
- 工具注册表、技能目录、文件能力、会话记录。

没有创建平行 Agent Loop，没有只靠提示词包装的“专家头像”。

## 2. 六种专家配置

| 专家 | Agent Preset | 真实工具 | 技能 | 输入/输出 |
|---|---|---|---|---|
| 财务分析专家 | `expert-finance-analysis` | finance_profile/analyze、document_extract、finance_deliver | financial-data-analysis | 期间/预算/分类 → 结构化交接 |
| 会计核算专家 | `expert-accounting` | voucher_reconcile、rule_check、document_extract | accounting-document-review | 凭证/发票/附件/账表 → 勾稽结果 |
| 审计与内控专家 | `expert-audit-internal` | audit_workpaper、rule_check、evidence_pack | internal-control-basics、working-paper-drafting | 流程/控制/发现 → 风险/测试/整改 |
| 税务与政策研究专家 | `expert-tax-policy` | web_search/web_fetch、document_extract | policy-research | 政策问题 → 条款/来源/待核实 |
| Excel 与财务数据专家 | `expert-excel-data` | finance_profile、financial_compare、finance_analyze | financial-data-analysis | XLSX/CSV/键列 → 清洗/对账/异常 |
| 报告与底稿专家 | `expert-report-workpaper` | report_generate、finance_deliver、audit_workpaper、present | working-paper-drafting | 多专家结果 → 底稿/报告/复核清单 |

每个 preset 都包含 persona、agent-instructions、技能目录、文件/计算工具和职责化工具；不是空壳。

## 3. 调度与协作

工具：

- `kongchain_expert_catalog`
- `kongchain_expert_plan`
- `kongchain_expert_dispatch`（底层 `ctx.subagents.startActivation`，支持 Agent Preset 与 `outputSchema`）
- `kongchain_expert_status`
- `kongchain_expert_log`

结构化交接固定字段：`conclusion`、`evidence`、`calculation`、`unknowns`、`nextSteps`、`disagreements`。

状态日志：`F:\KongChain-logs\experts\status.json`、`events.jsonl`。

## 4. 验收场景

### 场景 1：简单表格汇总不组队

日志：`expert-s1-simple.jsonl`

- 任务：汇总 `current_period.xlsx` 的 amount 合计与行数。
- 主 Agent 直接调用 `kongchain_finance_profile` / `kongchain_document_extract`。
- 未调用 `subagent`、`kongchain_expert_dispatch`。
- 结果：4 行、合计 `2900.00`。

### 场景 2：采购付款内控分析，自动分工并合并

日志：`expert-s2b-procurement.jsonl`

- `kongchain_expert_plan` 返回 review/parallel 计划；
- `kongchain_expert_dispatch` 真实启动：
  - `expert-accounting`（child `941e238d-…`）
  - `expert-audit-internal`（child `04d93abd-…`）
  - `expert-excel-data`（child `3ff2647c-…`）
  - 后续 `expert-report-workpaper`（child `075655e6-…`）
- 专家实际调用 `voucher_reconcile`、`rule_check`、`financial_compare`、`finance_analyze`、`audit_workpaper` 等工具。
- 主 Agent 合并并保留分歧，产出：
  - `F:\KongChain-logs\expert-artifacts\procurement-payment-2026-10-30\merged-expert-results.json`
  - `procurement-payment-2026-10-30-report.docx`
  - `procurement-payment-2026-10-30-workpaper.xlsx`
  - `procurement-payment-2026-10-30-workpaper-tool.xlsx`

### 场景 3：专家失败/矛盾结果可见

同一场景内真实出现：

- `expert-accounting` 运行状态 `failed:error`（未返回终态 JSON），但过程消息、工具结果和 `accounting-workpaper.json` 保留；
- 状态文件显示 `stopReason: error`，UI/主 Agent 报告失败；
- 合并结果保留明示分歧：
  - `V003 是否构成漏记`：审计专家 vs 会计专家，采用“待核实/不认定漏记”表述；
  - `600.00 差异是否可用预算/上期解释`：双方一致要求对账，不强行配平；
  - 阈值分歧（附件置信度 0.60 vs 0.80）同时保留。

## 5. 界面：专家与能力中心

CDP 验收：

- 打开 Web「插件」→「专家与能力中心」；
- 显示六位专家、职责、工具、技能、输入输出、场景；
- 显示“未被调用不显示协作”；
- “选择专家”按钮真实把 `请由专家【财务分析专家】处理：` 写入任务输入区；
- “自动调度”写入自动调度提示；
- 真实参与专家与结果由原生子代理卡片显示。

## 6. 测试

- `extensions/kongchain-experts/test/catalog.test.mjs`：5/5 通过。
- `node --check` host/client 通过。
- 修复过一个真实缺陷：工具包装层曾丢掉 `exec`，导致 `exec.agent` 报错；已修复并重启验证。

## 7. 限制

- 专家中心选择按钮写入任务提示，不直接替换当前会话的 Agent Preset；实际调度由主 Agent 调用 `kongchain_expert_dispatch`。
- 预注册的 `subagent` 旧记录会显示 `unknown`；专用 dispatch 记录能正确归属专家。
- 专家失败时，过程产物可引用，但不能当作完整成功终态。
- 未实现在线专家市场、跨机器专家注册或模型权重修改。
