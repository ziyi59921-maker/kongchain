# 第 5 批验证记录：内控专业插件与工具生态

- 日期：2026-10-29（Asia/Shanghai）
- 基线：DSH `f3803c96`；起点提交 `7d58fed8`
- 项目：`F:\KongChain`
- 模型：DeepSeek 官方 API
- 工具运行方式：真实 Headless 会话 + 真实 Python 子进程；没有用预写答案冒充工具结果

## 1. 新增工具

`extensions/kongchain-internal-control-tools/`，五个独立工具，均可单独调用：

| 工具 | 独立能力 |
|---|---|
| `kongchain_document_extract` | PDF/DOCX/XLSX/CSV/文本提取、来源哈希、页码/工作表/行列定位、限制 |
| `kongchain_financial_compare` | 两表键/金额比对、差异、重复、数据质量、Decimal 重算 |
| `kongchain_rule_check` | 规则 list/save/disable/check，规则版本与执行参数、证据行 |
| `kongchain_evidence_pack` | 来源哈希、原始字段、定位、事实/计算/推断/待核实 |
| `kongchain_report_generate` | Word/Excel 底稿，引用真实来源；无来源拒绝生成 |

它们没有串成固定流程；智能体按任务选择。

新增技能：
`expense-reimbursement`、`asset-management`、`treasury-management`、`contract-management`、`kongchain-internal-control-tools`。

## 2. 依赖选型

| 依赖 | 版本 | 许可证 | 用途/判断 |
|---|---|---|---|
| openpyxl | 3.1.2 | MIT | Excel 读写；已使用 |
| python-docx | 1.2.0 | MIT | Word 读写；已使用 |
| pdfplumber | 0.11.10 | MIT（上游项目；pip 元数据未给 License 字段） | PDF 文本层/表格；已使用 |
| pdfminer.six | 20260107 | MIT | pdfplumber 依赖 |
| reportlab | 4.0.9 | BSD | 仅用于生成测试 PDF |
| PyMuPDF | 1.28.2 | **AGPL-3.0 或商业许可** | 已安装但**未使用**；避免 AGPL 传染，记录风险 |
| Docling | 未安装 | MIT（上游） | 候选；重型模型/依赖，本轮不安装 |
| PaddleOCR | 未安装 | Apache-2.0（上游；模型条款另论） | 候选 OCR；本轮不安装，文本层优先 |

结论：本轮采用轻量文本层方案；扫描件明确提示需要 OCR，不擅自安装重型依赖。维护状态只按当前安装版本记录，生产引入前仍需单独复核上游安全公告与模型条款。

## 3. 四种任务实测

### 任务 1：分析模拟合同

真实会话调用：
- `accounting-document-review`、`contract-management` 技能；
- `kongchain_document_extract` 读取 `contract.docx`（21 段落、0 表格）和 `contract-summary.pdf`；
- 返回 SHA-256、段落定位、验收/付款条款与附件缺失。

实际结果：验收 2026-04-10 前交付、7 个工作日验收、逾期视为合格；付款 30%/60%/10%；附件一/二、签章、验收单等无法核对。
日志：`F:\KongChain-logs\b5-contract.jsonl`。

### 任务 2：只比较两个 Excel

真实会话调用 `kongchain_financial_compare`（只做金额比对，没有先跑合同流程）：

- 左表 4 行、右表 3 行；
- 差异 3 项：`right_only`、`left_only`、`amount_diff`；
- 左表合计 4,500.00，右表合计 3,800.00；
- 左表重复：甲公司 / INV-001 两行（第 2、4 行）；
- 使用 supplier+invoiceNo 匹配、amount 比较，容差 0.01。
日志：`F:\KongChain-logs\b5-compare.jsonl`。

### 任务 3：自然语言新增检查规则

真实会话调用：
- `kongchain_rule_check action=save`：规则 `duplicate-invoice-same-supplier-day-amount`，type `unique`，fields `supplier/date/amount`；
- 写入 `F:\KongChain-logs\samples\rules-batch5.json`；
- `action=check` 对 `invoices_a.xlsx` 执行；
- 规则文件版本 0.1.0，单条规则版本 1.0.0；该数据中同日同金额无重复，结果为 pass（0 条违规）——这是真实执行结果，不是预写。
日志：`F:\KongChain-logs\b5-rule.jsonl`。

### 任务 4：多工具开放任务

真实会话按用户指定组合：
1. `kongchain_document_extract` 提取合同验收/付款条款；
2. `kongchain_financial_compare` 比对两张发票表；
3. `kongchain_rule_check action=check` 按 `rules.json` 检查；
4. `kongchain_evidence_pack` 生成 `evidence-batch5.json`（4 个来源、8 条发现，分类含 fact/calculation/toVerify）；
5. `kongchain_report_generate` 生成 `working-paper-batch5.docx`（28 段落，含源文件 SHA-256、工作底稿结构）。
日志：`F:\KongChain-logs\b5-open.jsonl`。

输出：
- `F:\KongChain-logs\samples\evidence-batch5.json`（8,847 B）
- `F:\KongChain-logs\samples\working-paper-batch5.docx`（41,651 B，实际可解析）

## 4. 发现并修复的真实问题

Word 报告工具在智能体传入列数不一致的表格时抛出 `IndexError: tuple index out of range`，智能体重试多次才成功。Lead 定位为 `report()` 按首行列数创建表格、后续行超宽导致越界；已修复为：

- 先计算所有行的最大列数；
- 表头/数据行按最大宽度补齐；
- 对短行/长行均安全。

修复后独立测试 `ragged-report.docx` 成功，Python `py_compile` 通过。没有把失败重试隐藏掉。

## 5. 验收对照

| 验收项 | 结果 |
|---|---|
| 分析模拟合同 | ✅ DOCX+PDF 实际提取，引用 SHA/段落 |
| 对比两个模拟 Excel | ✅ 3 项差异、重复、质量、可重算 |
| 自然语言创建新规则/工具 | ✅ 保存并执行新规则 |
| 多工具完成开放任务 | ✅ 5 类工具实际调用并生成证据包/Word 底稿 |
| 自主选择工具、非固定工作流 | ✅ 任务 2 只比对、任务 3 只规则、任务 4 才组合 |
| 不以预写答案冒充 | ✅ 日志含真实 `tool_call`/`tool_result` |

## 6. 限制

1. DOCX 无稳定页码，使用段落/表格序号定位；PDF 仅文本层，无 OCR。
2. `pdfplumber` 的 pip 元数据没有 License 字段；按上游 MIT 记录，生产引入仍需复核。
3. PyMuPDF 为 AGPL/商业双许可，本轮未使用；Docling/PaddleOCR 未安装。
4. 规则引擎目前支持 unique/min_amount/max_amount/required/equals；复杂条件需扩展。
5. 报告模板是通用底稿结构；用户指定格式时需扩展模板。
6. 所有样例与输出位于 `F:\KongChain-logs\samples`（授权测试工作区），不进入版本库。
