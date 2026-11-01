# 控链文件空间与办公协同

## 已实现

- 一级入口：插件页「文件空间」客户端插件。
- 真实文件注册表：文件名、类型、大小、修改时间、来源、SHA-256、版本、任务关联。
- 分类：最近文件、全部文件、表格、文档、PDF 与附件、AI 生成成果。
- CSV：打开、编辑、保存新版本、导出；原文件只读。
- XLSX/DOCX/PDF：工具层 `office_file_read`/`document_extract` 可读内容；文件空间页签内只显示占位说明，**未接入原生 documentpreview**，读取能力走工具而不是 UI。
- AI 协同按钮：把文件路径和任务写入原生输入区，由 Agent 调用真实工具计算。
- HTTP 路由：`/api/kongchain-office/files`、`/api/kongchain-office/file`、`/api/kongchain-office/csv`。

## 工具

- `office_file_register`
- `office_file_list`
- `office_file_read`
- `office_csv_save_version`
- `office_file_export`

## 实测

- 首轮 e2e（`office-e2e.jsonl`）读取 CSV 因 `spawnSync python EPERM` 失败；第二次（`office-e2e2.jsonl`）注册、读取、新版本保存、导出均成功，原文件 SHA-256 未变——首次失败与一次重复注册错误也如实保留在日志中。
- 文件空间页签在浏览器中实测可打开（`F:\KongChain-logs\shots\office-tab.png`），列表来自真实注册表。
- `kongchain_finance_profile` 对同一 CSV 真实计算 amount 合计/缺失。
- 任务记录 `task-1793372111413-f84vki` 完成证据/输出登记；因人工复核项为 `partial`。
- 内控演示：提取采购制度、生成规则、勾稽凭证/发票/附件、生成风险清单和报告草稿；原始文件未覆盖；末次模型流出现 `MALFORMED_RESPONSE`，任务记录未被标成完整成功。

## 局限

- XLSX 深度编辑、公式、格式、图表保真未实现。
- PDF 仅预览/文本层，无标注编辑。
- Univer/ONLYOFFICE 未集成；需许可证、部署和兼容性评估。
- 文件注册表是本地交叉引用层，不具防篡改能力。
- 无模型 API 时本地文件读取/CSV 编辑可用；AI 分析需要 API/联网。
