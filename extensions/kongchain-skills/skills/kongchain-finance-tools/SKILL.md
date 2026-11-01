---
name: kongchain-finance-tools
description: 控链五类财务工具的独立使用指南：Excel/CSV 数据画像、凭证与附件核对、财务分析、审计内控底稿、财务文档交付。根据任务选工具，不做固定流程；计算用工具结果，结论区分事实/计算/推断/待核实。
---

# 控链财务工具

## 五类工具

| 能力 | 工具 | 用途 |
|---|---|---|
| Excel/财务数据 | `kongchain_finance_profile` | 字段识别、清洗、缺失、重复、合计、分组、异常，输出新文件 |
| 凭证与附件 | `kongchain_voucher_reconcile` | 必填项、金额勾稽、附件索引、低置信扫描件待核实 |
| 财务分析 | `kongchain_finance_analyze` | 期间对比、预算执行、成本结构、比率、异常波动 |
| 审计与内控 | `kongchain_audit_workpaper` | 风险点、控制目标、测试程序、异常、整改、分类 |
| 财务文档交付 | `kongchain_finance_deliver` | XLSX/DOCX/CSV/PDF，含范围、口径、结果、问题、限制、复核建议 |

## 使用纪律

- 重要数字必须来自工具或独立 Decimal 复算，不由模型口算。
- 原始文件不覆盖；输出必须另存到授权目录。
- 注明字段、统计口径、假设；没有政策原文支持的会计/审计/税务结论标为待核实。
- 扫描件/图片没有 OCR；置信度低只列 `toVerify`，不臆造票面内容。
- 异常是线索，不断言舞弊；结果属于辅助分析。
- 优先复用 `kongchain_document_extract`、`kongchain_financial_compare`、`kongchain_rule_check`、`kongchain_evidence_pack`、`kongchain_report_generate`，不重复造轮子。
