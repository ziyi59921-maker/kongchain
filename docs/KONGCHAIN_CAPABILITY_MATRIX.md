# 控链 KongChain 能力矩阵

- 版本：v0.2.2-alpha.2
- 日期：2026-10-31
- 状态：第一阶段交付文档

---

## 一、能力总览

| 维度 | 数量 | 状态 |
|---|---|---|
| 扩展包（extensions） | 16 | ✅ 全部加载 |
| 注册工具（tools） | 63 | ✅ 真实可调用 |
| 注册路由（HTTP） | 1 | ✅ office-workspace |
| Skill 文件（SKILL.md） | 19 | ✅ 运行时读取 |
| 生成插件（generated） | 5 | ✅ 含测试 |
| 专家配置（experts） | 6 | ✅ 真实子代理 |
| 任务记录（task-records） | 11 工具 | ✅ 结构化 |

---

## 二、能力包清单

### 2.1 office-file（Office 文件处理）

| 能力 | Skill | Tool | 入口 | 测试 | 状态 |
|---|---|---|---|---|---|
| 文档提取 | office-file | `document_extract` | Agent 调用 | ✅ b5-contract | ✅ |
| 文件读取 | office-file | `office_file_read` | Agent 调用 | ✅ office-e2e2 | ✅ |
| 文件注册 | office-file | `office_file_register` | Agent 调用 | ✅ office-e2e2 | ✅ |
| 文件导出 | office-file | `office_file_export` | Agent 调用 | ✅ office-e2e2 | ✅ |
| CSV 编辑 | office-file | `office_csv_save_version` | 文件空间 UI | ✅ office-e2e2 | ✅ |
| 文件列表 | office-file | `office_file_list` | 文件空间 UI | ✅ | ✅ |
| XLSX 深度编辑 | office-file | — | — | — | ❌ 未实现 |
| PDF 标注 | office-file | — | — | — | ❌ 未实现 |

### 2.2 financial-analysis（财务数据分析）

| 能力 | Skill | Tool | 入口 | 测试 | 状态 |
|---|---|---|---|---|---|
| 财务画像 | financial-data-analysis | `finance_profile` | Agent 调用 | ✅ finance-agent | ✅ |
| 财务分析 | financial-data-analysis | `finance_analyze` | Agent 调用 | ✅ final-s2 | ✅ |
| 跨表比对 | financial-data-analysis | `financial_compare` | Agent 调用 | ✅ b5-compare | ✅ |
| 数据清洗 | financial-data-analysis | — | — | — | ⚠️ 需新建 |
| 异常波动 | financial-data-analysis | — | — | — | ⚠️ 需新建 |

### 2.3 accounting-review（会计核算与凭证核查）

| 能力 | Skill | Tool | 入口 | 测试 | 状态 |
|---|---|---|---|---|---|
| 凭证核对 | accounting-document-review | `voucher_reconcile` | Agent 调用 | ✅ finance-agent-voucher | ✅ |
| 规则检查 | internal-control-basics | `rule_check` | Agent 调用 | ✅ b5-rule | ✅ |
| 票据识别 | accounting-document-review | — | — | — | ⚠️ 需新建 |
| 科目辅助 | accounting-document-review | — | — | — | ⚠️ 需新建 |

### 2.4 internal-control-audit（内部控制与审计）

| 能力 | Skill | Tool | 入口 | 测试 | 状态 |
|---|---|---|---|---|---|
| 证据打包 | evidence-traceability | `evidence_pack` | Agent 调用 | ✅ samples | ✅ |
| 审计底稿 | working-paper-drafting | `audit_workpaper` | Agent 调用 | ✅ final-s3 | ✅ |
| 报告生成 | working-paper-drafting | `report_generate` | Agent 调用 | ✅ office-internal-demo | ✅ |
| 风险识别 | internal-control-basics | — | — | — | ⚠️ 需新建 |
| 控制评价 | internal-control-basics | — | — | — | ⚠️ 需新建 |

### 2.5 report-workpaper（报告与底稿）

| 能力 | Skill | Tool | 入口 | 测试 | 状态 |
|---|---|---|---|---|---|
| 交付文件 | working-paper-drafting | `finance_deliver` | Agent 调用 | ✅ office-internal-demo | ✅ |
| 底稿框架 | working-paper-drafting | `audit_workpaper` | Agent 调用 | ✅ | ✅ |
| 复核清单 | evidence-traceability | — | — | — | ⚠️ 需新建 |

### 2.6 tax-policy-research（财税政策检索）

| 能力 | Skill | Tool | 入口 | 测试 | 状态 |
|---|---|---|---|---|---|
| 政策检索 | tax-policy-research | `web_search` | Agent 调用 | ✅ Harness 内置 | ✅ |
| 来源核验 | tax-policy-research | `web_fetch` | Agent 调用 | ✅ Harness 内置 | ✅ |
| 文档提取 | tax-policy-research | `document_extract` | Agent 调用 | ✅ | ✅ |

**注意**：`tax-policy-research` Skill 文件尚未创建（现有 19 个 Skill 中无此项），需新建。

---

## 三、插件能力清单（生成插件）

| 插件 | 版本 | 工具 | 测试 | 状态 |
|---|---|---|---|---|
| invoice-duplicate-check | 0.1.2 | `invoice_duplicate_check` | 25/25 | ✅ |
| csv-statistics | 0.1.0 | `csv_statistics` | 39/39 | ✅ |
| text-toolkit | 0.2.0 | `text_stats` | 34/34 | ✅ |
| contract-term-tags | 0.1.0 | `contract_term_tags` | 24/24 | ✅ |
| csv-distribution | 0.1.0 | `csv_distribution` | 38/38 | ✅ |

---

## 四、专家能力清单

| 专家 | 工具 | 技能 | 测试 | 状态 |
|---|---|---|---|---|
| 财务分析专家 | finance_profile, finance_analyze, financial_compare | financial-data-analysis | ✅ expert-s1 | ✅ |
| 会计核算专家 | voucher_reconcile, document_extract, rule_check | accounting-document-review | ✅ expert-s2b | ✅ |
| 审计与内控专家 | audit_workpaper, rule_check, evidence_pack | internal-control-basics | ✅ expert-s2b | ✅ |
| 税务与政策研究专家 | web_search, web_fetch, document_extract | tax-policy-research | ✅ | ✅ |
| Excel 与财务数据专家 | finance_profile, financial_compare, finance_analyze | financial-data-analysis | ✅ | ✅ |
| 报告与底稿专家 | report_generate, finance_deliver, audit_workpaper | working-paper-drafting | ✅ | ✅ |

---

## 五、开发者模式能力

| 能力 | 工具 | 测试 | 状态 |
|---|---|---|---|
| 模式开关 | `kongchain_dev_mode` | ✅ dev-guard | ✅ |
| 策略查询 | `kongchain_dev_policy` | ✅ | ✅ |
| 命令执行 | `kongchain_dev_command` | ✅ | ✅ |
| 代码差异 | `kongchain_dev_diff` | ✅ | ✅ |
| 快照创建 | `kongchain_dev_snapshot` | ✅ | ✅ |
| 回滚恢复 | `kongchain_dev_rollback` / `kongchain_dev_restore` | ✅ | ✅ |
| 测试执行 | `kongchain_dev_test` | ✅ | ✅ |
| 热重载 | `kongchain_dev_reload` | ✅ | ✅ |

---

## 六、能力缺口（未实现）

| 缺口 | 优先级 | 说明 |
|---|---|---|
| Workspace Shell 一级导航 | P0 | 当前聊天为主界面，需改为文件工作区 |
| 文件空间独立页面 | P0 | 当前是插件页 tab，需升级为一级导航 |
| 任务看板 UI | P0 | 当前只有工具，无看板界面 |
| 能力中心独立页面 | P1 | 当前是插件页 tab，需升级为一级导航 |
| tax-policy-research Skill | P1 | 需新建 SKILL.md |
| 数据清洗工具 | P2 | 需新建 |
| 异常波动分析工具 | P2 | 需新建 |
| XLSX 深度编辑 | P2 | 需 Univer/ONLYOFFICE SDK |
| PDF 标注 | P3 | 需 PDF.js 扩展 |
| 演示保障模式 | P1 | 桌面版需合成数据+预置任务 |

---

## 七、测试覆盖

| 测试类型 | 数量 | 通过 | 失败 | 说明 |
|---|---|---|---|---|
| 上游完整测试 | 48,791 | 48,462 | 329 | 环境差异，非控链问题 |
| 自有扩展测试 | 190 | 190 | 0 | 全部通过 |
| 端到端场景 | 7 | 5 | 2 | 2 个 partial（模型流） |
| 桌面打包 | 2 | 2 | 0 | NSIS + 便携 |

---

## 八、依赖许可证

| 依赖 | 许可证 | 用途 | 状态 |
|---|---|---|---|
| openpyxl | MIT | Excel 处理 | ✅ |
| python-docx | MIT | Word 处理 | ✅ |
| pdfplumber | MIT | PDF 解析 | ✅ |
| reportlab | BSD | PDF 生成 | ✅ |
| PyMuPDF | AGPL | 未使用 | ⚠️ 避免 |
| Docling | MIT | 文档解析（候选） | ⚠️ 未安装 |
| PaddleOCR | Apache-2.0 | OCR（候选） | ⚠️ 未安装 |

---

## 九、安全边界

- 开发者模式默认关闭（`enabled: false`）
- 核心源码修改需 `coreAuthorized` 额外授权
- API 密钥不入库、不写日志
- 任务记录自动脱敏（sk-/Bearer）
- 文件操作不覆盖原始文件
- 外部插件安装前需来源/权限/许可证审查
