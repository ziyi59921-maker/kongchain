---
name: kongchain-internal-control-tools
description: 控链内控工具的独立使用指南：文档提取、财务比对、规则检查、证据包、Word/Excel 底稿。用于根据用户任务选择最少工具，不按固定采购付款工作流串行执行。
---

# 内控工具选择

这五个工具可以单独调用，也可以按任务自由组合。**不要**无论用户问什么都先跑完整流程。

| 用户任务 | 首选工具 | 可选后续 |
|---|---|---|
| 看合同/发票/文档内容 | `kongchain_document_extract` | 条款分析用 contract-management 技能 |
| 只比较两个 Excel/CSV | `kongchain_financial_compare` | 仅当用户要底稿时才生成报告 |
| 重复/金额/字段规则检查 | `kongchain_rule_check` | 规则可 list/save/disable |
| 把发现整理成证据 | `kongchain_evidence_pack` | 需要正式底稿时再 report |
| 生成 Word/Excel 底稿 | `kongchain_report_generate` | 必须提供真实来源 |
| 新增检查规则 | `kongchain_rule_check` action=save | 用 check 立即验证 |
| 处理特殊格式发票的插件 | `kongchain_plugin_scaffold` 等插件工坊 | 不要硬编码进核心 |

## 使用纪律

- 先看实际文件，再下结论；解析失败时读取 `limitations`，明确说明缺什么。
- 金额/差异用工具计算结果，不要心算；引用 `recomputation` 参数。
- 证据包/报告必须引用真实来源路径与 SHA-256；无来源时拒绝生成。
- 规则结果只是线索；事实、计算、推断、待核实要分开。
- 文档解析默认无 OCR；扫描件需明确说明限制，不擅自安装重型依赖。
