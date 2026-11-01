# 第 8 批验证记录：可复用财务专业能力

- 日期：2026-10-30（Asia/Shanghai）
- 项目：`F:\KongChain`
- Harness：`0.2.2-alpha.2`
- 模型：DeepSeek 官方 API
- 测试数据：仅使用合成数据，位于 `F:\KongChain-logs\samples\finance-batch\inputs`

## 1. 环境与复用审计

- Node `24.13.0`、pnpm `11.28.5`、Python `3.11.9`。
- 复用 `@kongchain/internal-control-tools` 的解析、来源哈希、Decimal 金额、规则/证据/报告代码。
- 依赖：openpyxl 3.1.2（MIT）、python-docx 1.2.0（MIT）、pdfplumber 0.11.10（MIT）、reportlab 4.0.9（BSD）。
- 未安装 Docling/PaddleOCR/PyMuPDF；扫描件明确标注低置信/待核实，不臆造票面内容。

## 2. 五类真实工具

| 能力 | 工具 | 核心输出 |
|---|---|---|
| Excel/财务数据 | `kongchain_finance_profile` | 字段类型、清洗/缺失、重复、Decimal 合计、分组、异常；结果另存 |
| 凭证与附件核对 | `kongchain_voucher_reconcile` | 必填项、金额勾稽、附件索引、低置信扫描件 toVerify |
| 财务分析 | `kongchain_finance_analyze` | 期间对比、预算执行、成本结构、比率、异常波动 |
| 审计与内控 | `kongchain_audit_workpaper` | 风险点、控制目标、测试程序、异常、整改、分类 |
| 财务文档交付 | `kongchain_finance_deliver` | XLSX/DOCX/CSV/PDF，含范围/口径/结果/问题/限制/复核建议 |

工具通过现有 `ctx.tools.register` 暴露；主 Agent 可独立调用，不强制工作流。

## 3. 测试

- 单元测试：`python/tests/test_finance_tools.py`，覆盖五类能力与无来源拒绝。
- 端到端测试：`python/tests/test_finance_e2e.py`，一次执行五类能力并检查输出文件。
- 结果：`6 tests, OK`（`python -m unittest discover -s tests`）。
- Node 注册代码：`node --check` 通过。

## 4. 合成输入

| 文件 | 说明 |
|---|---|
| `inputs/current_period.xlsx` | 本期分类、金额、指标字段 |
| `inputs/previous_period.xlsx` | 上期分类金额 |
| `inputs/budget.xlsx` | 预算金额 |
| `inputs/vouchers.csv` | 凭证（含空金额） |
| `inputs/invoices.csv` | 发票（含金额差异） |
| `inputs/attachments.csv` | 附件索引（含低置信扫描件） |

## 5. 主 Agent 实测

### 财务分析

日志：`F:\KongChain-logs\finance-agent-analysis.jsonl`

实际调用：`kongchain_finance_profile`、`kongchain_finance_analyze`、`kongchain_finance_deliver`，并用 Python Decimal 独立复算：

- 本期合计 `2900.00`；
- 上期合计 `1900.00`；
- 期间差额 `1000.00`；
- 预算执行：采购实际 `2100.00` / 预算 `1800.00`，费用实际 `800.00` / 预算 `1200.00`；
- 比率：expenseRatio `0.60`、currentRatio `2.00`。

### 凭证/内控分析

日志：`F:\KongChain-logs\finance-agent-voucher.jsonl`

实际调用：`kongchain_voucher_reconcile`、`kongchain_audit_workpaper`：

- `V003` 金额必填缺失（row 4）；
- `V002` 凭证 500.00 vs 发票 450.00，差额 `50.00`；
- `V002` 扫描件置信度 `0.55`，标为 `toVerify`，未推断票面内容；
- 底稿区分 fact/calculation/inference/toVerify/recommendation。

## 6. 输出文件

工具原生输出已复核并作为示例：

| 文件 | 说明 |
|---|---|
| `tool-native/profile.xlsx` / `examples/profile-current.xlsx` | Cleaned/Summary |
| `tool-native/analysis.xlsx` / `examples/analysis-current.xlsx` | Analysis/Structure |
| `tool-native/voucher.xlsx` / `examples/voucher-reconcile.xlsx` | Findings |
| `tool-native/workpaper.docx` / `examples/audit-workpaper.docx` | 审计内控底稿 |
| `tool-native/deliver.xlsx` / `examples/finance-delivery.xlsx` | 财务交付 |

所有输出写入新文件，不覆盖 `inputs/` 原始文件。

## 7. 财务专业约束

- 计算注明字段、口径、假设；Decimal 金额。
- 无政策原文支持的会计/审计/税务结论标为待核实。
- 异常只是线索，不断言舞弊；结论属于辅助分析。
- 扫描件/图片没有 OCR，低置信项只列待核实。

## 8. 未完成事项

- OCR、复杂凭证版式识别、PDF 扫描件抽取未做。
- 规则 DSL、税务/会计政策库、真实企业数据接入未做。
- `kongchain_finance_deliver` 的 PDF/CSV/DOCX 已有单元测试，主 Agent 本轮端到端只生成了 XLSX 与 DOCX。
- 公式单元格按缓存值读取，未执行 Excel 重算。
