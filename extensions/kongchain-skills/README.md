# @kongchain/skills

控链技能包。技能文件是磁盘上的 `SKILL.md`，由 `@deepseek-ai/dsh-skill-filesystem` provider 在运行时读取，不需要把技能内容编译进插件。

## 技能

| 技能 | 用途 |
|---|---|
| `kongchain-product` | 产品定位、开放任务原则、会计/内控/审计辅助能力边界 |
| `kongchain-developer` | 开发者模式可写边界、先读后写、扩展点优先级、验证命令 |
| `internal-control-basics` | 内控五要素、控制类型、职责分离、授权审批、缺陷与例外 |
| `purchase-payment-analysis` | 采购付款阶段风险、三单/四单匹配、重复付款、供应商异常 |
| `accounting-document-review` | 合同/发票/验收/付款资料审阅、关键条款提取、一致性检查 |
| `evidence-traceability` | 证据来源、完整性标识、保管链、事实/推断/建议分离 |
| `working-paper-drafting` | 工作底稿结构、发现写法、问题清单、复核要点 |
| `financial-data-analysis` | 数据画像、勾稽比对、异常筛查、抽样、可复现脚本 |
| `kongchain-plugin-creator` | 通过官方 Bundle/Plugin 机制创建、测试、安装、更新、回滚自有插件 |
| `kongchain-dev-mode` | 开发者模式入口、写范围 guard、diff/快照/回滚/恢复、测试与重启说明 |
| `expense-reimbursement` | 费用报销政策、发票、审批、重复/超标准/跨期 |
| `asset-management` | 固定资产/存货取得、折旧、盘点、处置 |
| `treasury-management` | 银行账户、网银权限、收付款、对账、资金舞弊 |
| `contract-management` | 合同评审、验收/付款条款、变更、违约、归档 |
| `kongchain-internal-control-tools` | 五个内控工具的独立选择与使用纪律 |
| `kongchain-capability-evolution` | 先发现后创建、测试/安装/注册/调用、更新失败回滚、审批边界 |
| `kongchain-finance-tools` | 五类财务工具：数据画像、凭证核对、财务分析、内控底稿、交付 |
| `kongchain-expert-dispatch` | 专家调度：direct/single/parallel/review、结构化交接、分歧与失败 |
| `kongchain-task-records` | 任务记录/证据追溯：工具 callId、状态、输出校验、失败降级 |

## 清单

- 版本：`0.1.0`
- 内容：`skills/<name>/SKILL.md`
- 依赖：无第三方运行时依赖；需要 Harness 的 `skills` 服务与 `skill-filesystem` provider
- 发现方式：`@kongchain/bundle` patch 中的 `kongchain-skill-filesystem` 行把 `customSkillDirs` 指向本目录

## 新增技能

1. 在 `skills/` 下新建 `<kebab-case-name>/SKILL.md`；
2. 文件开头写 YAML frontmatter：`name`、`description`（必填）；
3. 正文写触发条件、步骤、边界与验证方式；
4. 重启 profile 或等待 provider 的文件监听刷新；
5. 用 `kongchain_extension_catalog` 或 `kongchain_validate_extensions` 检查。
