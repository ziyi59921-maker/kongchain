# @kongchain/internal-control-tools

控链第一批内控工具。五个工具相互独立，智能体按任务选择，不串成固定工作流。

| 工具 | 独立用途 |
|---|---|
| `kongchain_document_extract` | 解析授权工作区 PDF/DOCX/XLSX/CSV/文本，返回来源、页码/工作表/行定位与限制 |
| `kongchain_financial_compare` | 两表金额/键比对、重复、差异、数据质量、可重算过程 |
| `kongchain_rule_check` | 规则 list/save/disable/check，规则版本与执行参数、证据行 |
| `kongchain_evidence_pack` | 证据包：来源哈希、原始字段、定位、事实/计算/推测/待核实 |
| `kongchain_report_generate` | Word/Excel 工作底稿，引用实际来源；无来源拒绝生成 |

## 财务工具

| 工具 | 独立用途 |
|---|---|
| `kongchain_finance_profile` | XLSX/CSV 字段识别、清洗、缺失、重复、合计、分组、异常；结果另存 |
| `kongchain_voucher_reconcile` | 凭证/发票/附件核对：必填项、金额勾稽、附件索引、低置信扫描件 |
| `kongchain_finance_analyze` | 期间对比、预算执行、成本结构、比率、异常波动 |
| `kongchain_audit_workpaper` | 风险点、控制目标、测试程序、异常、整改、分类底稿 |
| `kongchain_finance_deliver` | XLSX/DOCX/CSV/PDF 财务交付，含范围/口径/结果/问题/限制/复核建议 |

所有金额计算使用 Decimal；输出文件不覆盖输入。测试：`python/tests/test_finance_tools.py`、`test_finance_e2e.py`。

## 依赖与选型

- Python 3.11
- `openpyxl` 3.1.2（MIT）— Excel
- `python-docx` 1.2.0（MIT）— Word
- `pdfplumber` 0.11.10（MIT）+ pdfminer.six（MIT）— PDF 文本层
- `reportlab` 4.0.9（BSD）— 仅用于生成测试 PDF
- 未安装 Docling / PaddleOCR / PyMuPDF：重型或 AGPL/模型条款需单独评估；当前文本层足够，扫描件明确提示需要 OCR。

## 权限边界

- 输入只允许 `F:\KongChain` 与 `F:\KongChain-logs\samples`；
- 证据包/报告输出只允许 `F:\KongChain-logs\samples`；
- 不访问网络、不执行 OCR、不修改源文件；
- 无法解析时返回限制，不编造内容。

## 清单

- 版本：`0.1.0`
- 入口：`src/index.js`；Python 辅助器：`python/tools.py`
- 依赖：Node 内置模块 + 上述 Python 库
- 测试：`node --check src/index.js`；样本任务见 `docs/kongchain/BATCH_5_VERIFICATION.md`
