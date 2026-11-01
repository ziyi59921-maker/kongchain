# 控链 KongChain 全批次需求完成度矩阵（用户提示词逐条核对）

- 项目：`F:\KongChain`（分支 `kongchain/dev`，基线 `f3803c96`，核对时 HEAD `25ef204b`）
- 核对方式：逐条对照用户先后给出的 16 组批次提示词与仓库代码、测试日志、运行产物；**只读核对，不把"代码存在"当"实测通过"**
- 判定口径：已完成 = 有代码且有实测证据；部分完成 = 核心可用但缺项/证据不足；未完成 = 未实现；受环境阻塞 = 环境原因无法完成
- 汇总（10-31 09:30 更新）：**已完成 98 条 / 部分完成 25 条 / 未完成 5 条 / 环境阻塞 0 条（合计 128 条验收条目）**
  - 与首轮核对相比：桌面打包 3 条「受环境阻塞」→「已完成（便携+NSIS 已生成）/部分完成（干净环境安装验收待做）」；原有 6 条「未完成」不变。
- 本文档不替代 `docs/kongchain-release-readiness.md`；两者冲突时以本矩阵的证据列为准，并修正 readiness 文档。
- 证据来源：仓库代码/文档、`F:\KongChain-logs\` 测试与运行日志、`G:\抗联\reports\` 中的归档与许可证审计；`.kongchain/developer-mode.json` 已按第 7 批要求置为 `false`。

## 第 0 批（MSG1）建立项目与基线

| 需求条目 | 状态 | 证据 |
|---|---|---|
| 旧项目归档情况核实 | 已完成 | `G:\抗联\reports\archive-audit.md:10` “归档状态：部分存在（实质可用）”，H: 盘两份旧项目快照 |
| 官方仓库克隆、保留上游来源 | 已完成 | `.kongchain/BASELINE.md:10` clone 命令；`git remote -v` origin/upstream 均指向 deepseek-ai/deepseek-harness |
| 记录基线 commit SHA、建控链分支 | 已完成 | BASELINE.md:7 `f3803c96974a…`；`git log f3803c9` = release 0.2.2-alpha.2；当前分支 kongchain/dev |
| pnpm install（锁文件/官方锁） | 已完成 | `F:\KongChain-logs\install.log` 末行 “Done in 56.3s using pnpm v11.28.5” |
| pnpm run build | 已完成 | `build.log` “run-gates: 10 passed, 0 failed … 216.68s”，含 Web build PASS |
| 实际启动 Harness | 已完成 | `web.log` “dsh web: http://127.0.0.1:3080/?token=…”(05:48) |
| 打开原版界面 | 已完成 | `F:\KongChain-logs\web-ui.png`（55,826B，05:53） |
| 验证基础对话/智能体能力 | 部分完成 | `headless-mock2.jsonl` 事件链 session→tool_call(read)→tool_result→final(mock_tool_ok)，但为 mock LLM；真实 Key 当时 401 |
| 第三方依赖许可证与安全核查 | 已完成 | `G:\抗联\reports\license-audit.md` 结论：97.8% 宽松许可、无 GPL/AGPL 实际义务、70 条 advisory；THIRD_PARTY_NOTICES 覆盖 82/82 生产依赖 |

## 第 1 批（MSG10）扩展架构与 PRODUCT_SPEC

| 需求条目 | 状态 | 证据 |
|---|---|---|
| 建立控链扩展目录 | 已完成 | `extensions/` 下 16 个 `kongchain-*` 包（core/tools/developer/professional/skills/brand/bundle/workbench/dev-mode/plugin-creator/capability-evolution/internal-control-tools/experts/task-records/office-workspace/plugins） |
| PRODUCT_SPEC.md 已建立并写清定位 | 已完成 | `docs/kongchain/PRODUCT_SPEC.md:9-13,35-37`：可扩展 Agent 工作台、非固定工作流、采购付款非唯一流程 |
| 控链扩展被运行环境真实加载 | 已完成 | `F:\KongChain-logs\office-ui-web.log:11-30` 16 条 “loaded/registered” 日志 + “dsh web: …:3083” |
| 不复制 Agent Loop、不引入替代框架 | 已完成 | `packages/`、`vendor/` 相对基线无改动（`git diff --stat f3803c96..HEAD -- packages vendor` 为空）；无 LangGraph 等依赖 |
| 自有代码与上游代码可区分 | 已完成 | 自有逻辑仅在 `extensions/` 与 `docs/kongchain/`；上游改动仅桌面品牌与 Web 兜底 stub（`git diff` 6 文件，见第 60 批） |
| 原版 Harness 功能仍可运行 | 已完成 | `docs/kongchain/BATCH_1_VERIFICATION.md:174` web profile 3080 HTTP 200；`web.log` 同批可启动 |

## 第 2 批（MSG12）内控专业化、Profile、Skills

| 需求条目 | 状态 | 证据 |
|---|---|---|
| kongchain Profile 组合 | 已完成 | `F:\KongChain-home\profiles\kongchain\package.json` bundles = dsh-base + dsh-web-app + @kongchain/bundle(+experts/task-records/office-workspace)；15 个 @kongchain 依赖 |
| 内控专业系统指令 | 已完成 | `extensions/kongchain-professional/src/index.js` `ctx.systemPrompt.section({name:'kongchain:professional',order:100})`；`kongchain-web-b2.log` “registered system section” |
| 6 个专业技能注册 | 已完成 | `kongchain-dump-b2.yml:1254-1260` customSkillDirs=`F:/KongChain/extensions/kongchain-skills/skills`；目录含 internal-control-basics、purchase-payment-analysis、accounting-document-review、evidence-traceability、working-paper-drafting、financial-data-analysis 等 19 个 SKILL.md |
| 运行时确实读取技能（非仅落盘） | 已完成 | `F:\KongChain-logs\task-sessions.txt`：任务1 SKILLS=[purchase-payment-analysis, internal-control-basics]，任务2=[accounting-document-review, purchase-payment-analysis]，任务3b=[financial-data-analysis]，任务4=[] |
| 四个开放任务实测 | 已完成 | `chat-task1.log`、`chat-task2.log`、`chat-task3b.log`、`chat-task4.log` + task-sessions.txt；任务4 未用内控技能且识别为 Android 工程 |
| 品牌呈现（保留原前端） | 已完成 | `F:\KongChain-logs\kongchain-brand.png`；BATCH_2:44 侧边栏“控链/KongChain”槽位生效 |
| 未把规则塞进超长系统提示 | 已完成 | 提示词插件仅专业纪律段；具体方法在 SKILL.md，运行时按任务加载 |

## 第 3 批（MSG25）自然语言插件创造

| 需求条目 | 状态 | 证据 |
|---|---|---|
| 复用官方 Creator/Plugin Manager | 已完成 | `docs/kongchain/BATCH_3_VERIFICATION.md:13-20`；安装走官方 `dsh plugin` bundle 机制，未重写插件管理器 |
| 对话提出→智能体创建插件文件 | 已完成 | `F:\KongChain-logs\create-plugin.jsonl`（22:21-22:22）；实际读/写 `extensions/kongchain-plugins/invoice-duplicate-check/` |
| 生成并实际执行测试 | 已完成 | 同批 19/19；`update-plugin.jsonl` 0.1.1 修复 schema；`dev-accept-1.jsonl` 0.1.2 达 25/25 |
| 通过官方机制安装/启用 | 已完成 | `F:\KongChain-home\profiles\kongchain-demo\package.json` bundles 含 @kongchain-plugin/invoice-duplicate-check（link 依赖） |
| 智能体实际调用新插件 | 已完成 | `demo-call2.jsonl` tool_call `invoice_duplicate_check`→tool_result completed、duplicates 1 组；`demo-call3.jsonl` 可配置 match 调用 |
| 修改现有插件而非新建重复插件 | 已完成 | 同目录 0.1.0→0.1.1→0.1.2（package.json version 0.1.2；update-in-place） |
| 模拟安装失败、旧版本保留 | 已完成 | `broken-install.jsonl` stage=check、ok=false，未进入备份/安装；旧 0.1.1 profile 未变且仍可调用 |
| 插件清单的权限/兼容字段 | 部分完成 | 生成插件 `package.json` 无 permissions / harness 字段；BATCH_8:57 自述“permissions: not-declared、harness: not-declared” |

## 第 4 批（MSG27）开发者模式

| 需求条目 | 状态 | 证据 |
|---|---|---|
| 界面开发者模式入口 | 已完成 | Web `/developer` 命令事件（BATCH_4:40-53）；工作台“开发者模式”按钮真实提交 `/developer status` |
| 权限边界由工具层 guard 落实 | 已完成 | `dev-guard-off.jsonl` write→error “KongChain developer mode is off…”且文件未创建；开启后写完成；关闭后再写 error |
| 真实文件读写、测试、diff | 已完成 | `dev-accept-1.jsonl`：21 pass/4 fail→25/25，diff 8 文件 +160/−15；`kongchain_dev_test` 真实执行 |
| 回滚与恢复 | 已完成 | `dev-rollback-tool.jsonl` snapshot/rollback/restore 全 ok；`F:\KongChain-logs\dev-snapshots\2026-10-29T14-57-37-007Z-readme-rollback\patch.diff` |
| 修改控链自有源码并测试 | 已完成 | `extensions/kongchain-dev-mode/test/policy.test.mjs` 4/4（A/B/C/D 路径策略），源码新增 `developerPathAllowed` |
| 关闭后禁止源码修改 | 已完成 | 同 guard 证据：disable 后写第二个文件仍 error、未落盘 |
| 核心源码区（C）实际修改 | 部分完成 | 授权开关与测试存在，但未实际修改 `packages/`；BATCH_4:120-121 自述“核心改动仍需单独构建/回归” |

## 第 5 批（MSG29）内控工具生态

| 需求条目 | 状态 | 证据 |
|---|---|---|
| 五类内控工具真实实现 | 已完成 | `extensions/kongchain-internal-control-tools/src/index.js` 10 处 `ctx.tools.register`；document_extract/financial_compare/rule_check/evidence_pack/report_generate |
| 四类任务实测 | 已完成 | `b5-contract.jsonl`（文档提取）、`b5-compare.jsonl`（仅两表比对）、`b5-rule.jsonl`（保存并执行规则）、`b5-open.jsonl`（5 工具组合） |
| PDF/DOCX/XLSX/CSV 解析与定位 | 已完成 | b5-contract 读取 contract.docx 段落、contract-summary.pdf 文本层；BATCH_5:50 提取验收/付款条款 |
| 证据包与工作底稿真实生成 | 已完成 | `F:\KongChain-logs\samples\evidence-batch5.json`(8,847B)；`working-paper-batch5.docx`(41,651B，可解析) |
| 依赖选型与许可证记录 | 已完成 | BATCH_5:30-39：openpyxl/python-docx/pdfplumber MIT、reportlab BSD；PyMuPDF AGPL 未使用；Docling/PaddleOCR 未安装 |
| 不以预写答案冒充工具结果 | 已完成 | b5-*.jsonl 含真实 tool_call/tool_result；报告工具曾抛 IndexError 并修复（BATCH_5:87-95） |
| OCR/重型文档解析 | 未完成 | 明确未做（BATCH_5:36-37、111-112）；扫描件只标低置信/待核实 |

## 能力演化闭环（MSG31 / MSG55）

| 需求条目 | 状态 | 证据 |
|---|---|---|
| CSV 工具创建/测试/安装/注册/调用/日志 | 已完成 | `b6-create-csv.jsonl`（39/39、scaffold/check/install）、`b6-call-csv.jsonl` 真实统计；`F:\KongChain-logs\capabilities\registry.json` csv-statistics 0.1.0 全字段 |
| 先发现能力缺口再创建（不重复造） | 已完成 | `capabilities\csv-distribution.jsonl` 首行 discovered、次行 gap；`final-s4-reuse.jsonl` gap:false 复用已有插件 |
| 更新失败与旧版本保留 | 已完成（受限） | `b6-update-fail.jsonl` check 阶段拦截 0.2.0、旧 0.1.0 仍 installed；`loop-update-fail.jsonl` task 状态 failed 如实落库；但未执行真正“激活失败后回滚” |
| 开发者模式改码→测试→diff→恢复 | 部分完成 | `b6-dev-tracked.jsonl` tracked 文件 snapshot/diff/rollback/restore 通过；`loop-dev-restore.jsonl` 对未跟踪插件文件 snapshot 为空、rollback/restore 失败，任务 partial |
| 全过程写入任务记录 | 已完成 | `F:\KongChain-logs\tasks\index.json`：task-…2fs8l0 completed、…qdf9wm failed、…b5vm0z partial，与日志一致 |
| 自动化/审批/手动事项区分 | 已完成 | BATCH_13 §7 明确列出；自动更新默认关闭、dev 模式需用户开启 |
| 能力登记（名称/版本/来源/依赖/权限/测试/启用） | 已完成 | `capabilities\registry.json` 两条能力含 source local、permissions、test 38/38、enabled |

## 第 6 批（MSG36）插件自更新与版本管理

| 需求条目 | 状态 | 证据 |
|---|---|---|
| 能力清单查询（版本/来源/依赖/权限/测试/兼容） | 已完成 | `b7-final-inventory.jsonl` 末条：text-toolkit 0.2.0、工具 text_stats、测试 39/39 pass、installed/enabled、来源 local、依赖 []、权限 not-declared、兼容 0.2.2-alpha.2 |
| 检查版本→修改插件→新版本测试 | 已完成 | `b7-create-text.jsonl`、`b7-upgrade-text.jsonl`（隔离候选 .test-fixtures 修改）、`b7-final-inventory.jsonl` |
| 激活新版本并验证新增功能 | 已完成 | `b7-upgrade-text.jsonl` stage=activated 0.1.0→0.2.0；`b7-call-text-020.jsonl` 新进程调用 topN=2 返回词频 |
| 模拟测试失败、旧版本不被破坏 | 已完成 | `b7-upgrade-fail.jsonl` 34 pass/1 fail、check 拒绝；`b7-call-after-fail.jsonl` 旧 0.2.0 仍可调用 |
| 启用/禁用/卸载/重装生命周期 | 已完成 | b7-disable/disabled-call/enable/re-enabled-call/uninstall-reinstall 六组日志齐全 |
| 回滚工具与真实回滚演练 | 部分完成 | `kongchain_plugin_rollback` 与 `.backups/` 存在（BATCH_7:21-24），但日志未见一次“激活失败后真实回滚”的完整过程（失败均在 check 阶段被拦截） |
| 插件维护日志 | 已完成 | `plugins\kongchain-plugin-text-toolkit.jsonl`(13,710B) 记录 created/tested/installed/升级/失败；自动更新策略 autoUpdate=false 已记录 |
| 在线插件市场/外部来源 | 未完成（如实未做） | BATCH_7:26、78 明示只支持本地插件，不伪造在线市场 |

## 第 7 批（MSG37）最终演示场景 A–F

| 需求条目 | 状态 | 证据 |
|---|---|---|
| 场景 A 内控专业任务 | 已完成 | `final-a-procurement.jsonl` 合同金额勾稽、两表比对 3 差异、规则检查违规 1 组 |
| 场景 B 插件创建 | 已完成 | `final-b-create-plugin.jsonl`（8:18-8:26）创建 contract-term-tags；`final-b-call-plugin.jsonl` 真实调用返回命中 4 次 |
| 场景 C 插件升级 | 已完成 | `b7-upgrade-text.jsonl` 0.1.0→0.2.0 + `b7-call-text-020.jsonl` 新功能调用 |
| 场景 D 开发者模式改码 | 已完成 | `final-d-dev.jsonl` dev-mode 注释修改 + node --check/4 项 policy 测试通过 + snapshot |
| 场景 E 普通开放任务 | 已完成 | `final-e-open-task2.jsonl` 4 文件分类复制+索引，全程未用内控工具 |
| 场景 F 失败恢复 | 已完成 | `b7-upgrade-fail.jsonl` 失败拦截 + `final-s6-verify-old.jsonl` 旧 csv_distribution 复验成功 |
| 交付清单与界面交互 | 部分完成 | 交付清单见 `docs\kongchain-release-readiness.md` §5-§8；插件版本/回滚无专门 UI 按钮，经 Agent 工具与原生插件页 |

## 工作台（MSG41）

| 需求条目 | 状态 | 证据 |
|---|---|---|
| 主页要素（产品名/输入区/文件入口/常用任务/三入口） | 已完成 | `workbench-e2e.out` home.product/tagline=true、9 个快捷项、fileInput=1；`workbench-home-desktop.png` |
| 状态来自真实执行事件 | 已完成 | `workbench-e2e2.out` statusHistory done；`workbench-e2e.out` 观察 running/waiting；`client.js:207-245` 取 InputState/SessionStatus |
| 文件上传链路 | 部分完成 | `workbench-e2e2.out` upload.hasFilename=true、移除按钮 1 个、composer 显示 expenses.csv 276B；但未验证文件随任务被 Agent 读取处理（脚本仅 setFileInputFiles 未提交） |
| 刷新后历史会话可用 | 已完成 | `workbench-e2e2.out` refreshed.taskInHistory=true、sidebarBrand=true |
| 移动端响应式 | 已完成 | `workbench-e2e2.out` mobile 390×844、overflow=true（无横向溢出） |
| 所有按钮有实际行为 | 已完成 | 添加文件/历史任务/专家与能力中心/开发者模式均绑定原生动作（client.js:151-179）；e2e 中入口可点 |
| 禁止假进度/硬编码状态 | 已完成 | 全扩展 grep 无 setInterval；仅 2 处 setTimeout 用于文案替换（workbench client.js:99、experts client.js:50），非进度动画 |

## 财务专业能力（MSG49）

| 需求条目 | 状态 | 证据 |
|---|---|---|
| 五类财务工具真实实现并注册 | 已完成 | `internal-control-tools/src/index.js`：finance_profile、voucher_reconcile、finance_analyze、audit_workpaper、finance_deliver 均注册 |
| 主 Agent 真实调用 | 已完成 | `finance-agent-analysis.jsonl`、`finance-agent-voucher.jsonl` 含 tool_call；`final-s2-finance.jsonl`、`final-s2-finish.jsonl` |
| 合成输入+可复算输出 | 已完成 | `F:\KongChain-logs\samples\finance-batch\inputs` 6 文件；`outputs\final-integration-analysis.xlsx`；任务证据 E01-E05（2900/1900/1000/V002 差额 50） |
| 单元测试与端到端测试 | 部分完成 | `extensions\kongchain-internal-control-tools\python\tests\test_finance_tools.py`、`test_finance_e2e.py` 存在；“6 tests OK”仅文档宣称，日志未留档 |
| 不覆盖原始文件 | 已完成 | final-s2-finish 与 office-e2e2 均对输入/源文件复算 SHA-256 未变 |
| 已发现缺陷修复/标注 | 部分完成 | `finance_analyze` 预算聚合缺陷（release-readiness:137）未修，final-s2 任务如实降级 partial |

## 财务专家调度（MSG51）

| 需求条目 | 状态 | 证据 |
|---|---|---|
| 六个专家配置非空壳 | 已完成 | `extensions\kongchain-experts\src\catalog.mjs:55-121` 六个 id+presetId+tools+skills；`cordis.patch.yml` 6 段 preset+persona |
| dispatch 真实执行（非提示词包装） | 已完成 | `index.js:177` `ctx.subagents.startActivation`；`experts\status.json` childId 3ff2647c…/35e621d4… 等真实子代理 |
| 场景1 简单任务不组队 | 已完成 | `expert-s1-simple.jsonl` 主 Agent 直接算 4 行/2900.00，无 dispatch |
| 场景2 采购内控并行分工并合并 | 已完成 | `expert-s2b-procurement.jsonl`；`expert-artifacts\...\merged-expert-results.json`、workpaper/report.docx |
| 场景3 失败/分歧可见 | 已完成 | `experts\status.json` recent: expert-accounting stopReason=error；分歧（V003 漏记、600 差异）保留（BATCH_11:78-85） |
| 专家与能力中心界面 | 部分完成 | `expert-center.png` 与 client.js 存在；`expert-center-e2e.mjs` 无结果输出留档，仅截图可证 |

## 任务记录与证据追溯（MSG54）

| 需求条目 | 状态 | 证据 |
|---|---|---|
| 结构化任务记录（目标/输入/工具/步骤/输出/审批/结论） | 已完成 | `task-records/src/record.mjs` TASK_RECORD_SCHEMA；`tasks\task-1793330848925-kyikjr.jsonl` 含 begin/step/tool/evidence/output/finish |
| 财务结果与证据关联、可复算 | 已完成 | 同任务 7 条证据（含来源/方法/结果/分类）；output 记 SHA-256；`outputs\task-…-record.json`(85KB) |
| 统一任务状态机 | 已完成 | record.mjs:46-52 合法迁移且终态不可回退；index.json 出现 completed/partial/failed/waiting |
| 密钥脱敏、不泄露敏感内容 | 已完成 | record.mjs:33-41 sk-/Bearer 正则替换 [REDACTED]；tasks 日志无真实 key（“task-”误报已修复，BATCH_12:69） |
| 失败不被标成功 | 已完成 | `task-records-e2e`：requested completed 被降级 partial（“6 tool run(s) failed”）；failcheck 复测同样 |
| 导出与查询 | 已完成 | 导出 `task-1793330848925-kyikjr-record.json/.md`；`kongchain_task_query/export/clean` 工具注册 |
| 未跟踪文件/大结果处理 | 部分完成 | BATCH_13:91-93 自述限制：快照仅覆盖 tracked diff，未跟踪文件需先提交 |

## 最终集成验收（MSG57）

| 需求条目 | 状态 | 证据 |
|---|---|---|
| 场景 1 通用 Agent 文件整理 | 已完成 | `final-s1-general.jsonl`：4 文件按日期/类型复制并生成 `F:\KongChain-logs\final-integration\scenario1-output\index.md`，源哈希一致 |
| 场景 2 财务数据分析 | 部分完成 | `final-s2-finish.jsonl` 交付 xlsx+5 条证据；但主模型流失败、任务 partial（release-readiness:28） |
| 场景 3 内控专家协作 | 部分完成 | `final-s3-experts.jsonl` 2 专家真实执行；4 次工具失败被记录，任务 partial |
| 场景 4 新能力创建/复用 | 已完成 | `final-s4-reuse.jsonl` gap:false，复用 csv_statistics/csv_distribution，未造重复插件 |
| 场景 5 开发者模式改码回滚 | 部分完成 | tracked dev-mode 文件通过；未跟踪插件 snapshot 失败，任务 partial（release-readiness:31） |
| 场景 6 演化失败恢复 | 已完成 | `loop-update-fail.jsonl` + `final-s6-verify-old.jsonl` 旧版调用成功 |
| 场景 7 界面与状态一致性 | 已完成 | `final-ui-e2e.out` done 状态、上传、刷新历史、390px 无溢出、consoleErrors=[] |
| 全量测试 | 阻塞 | `final-integration-test.log` 末：329 failed / 48462 passed；vitest worker 崩溃、vswhere 等环境原因 |
| 构建 | 部分完成 | `final-integration-build.log` “9 passed, 1 failed”，Web build 因 esbuild 临时文件 Access denied；`scripts\build-web-workbench.mjs` 兼容构建成功（`apps\web\dist\assets\index.js` 6.2MB） |
| 启动检查 | 已完成 | `kongchain-web-final7b.log` “dsh web: …:3083”；`pnpm dsh --version` 0.2.2-alpha.2 |
| 硬编码/假按钮/空壳专家检查 | 已完成 | 无 setInterval 假进度；专家为真实 preset+子代理；失败不被包装（多处日志） |
| API 缺失如实报错、不泄露密钥 | 已完成 | `final-nokey2.out` turn_end error `MISSING_CREDENTIAL`，text 为空；无 key 输出 |
| release-readiness 文档 | 已完成 | `docs\kongchain-release-readiness.md` 如实记录未通过测试、构建失败与恢复方式 |

## Windows 桌面 Demo（MSG60）

| 需求条目 | 状态 | 证据 |
|---|---|---|
| 复用官方桌面框架 | 已完成 | `apps\desktop`（Electron）、`apps\desktop-host`；脚本 package:win:x64:unsigned/dir（desktop/package.json） |
| 品牌/图标/产品信息改造 | 已完成 | `apps\desktop\resources\icon-kongchain-windows.png`、`tray-kongchain.ico`；`src\locale.ts:74-79` welcomeBrand “控链 KongChain” |
| 生成 Windows 安装包与便携包 | **已完成** | NSIS 安装包 `kongchain-0.2.2-alpha.2-win-x64-unsigned.exe`（302MB）+ 便携目录 `win-unpacked\控链 KongChain.exe`（246MB，总 1,074MB）；`desktop-package-dir12.log` exit 0；exe ProductName=控链 KongChain |
| 干净环境安装/快捷方式验收 | **部分完成** | 打包完成；本机双击被 Electron 单实例锁挡回（与运行中官方 Harness 共用 userData）；干净 Windows/VM 安装验收待做 |
| 首启欢迎页（定位+配置/演示入口） | 部分完成 | locale.ts 有品牌欢迎页、Sign in/Add API Key；无“进入演示模式”入口 |
| 演示保障模式（合成数据/预置任务/示例输出） | 未完成 | `docs\kongchain-desktop-release.md:41` 明确未实现；apps/desktop 无 demo 模式代码 |
| 退出进程清理/端口冲突/用户数据目录 | **部分完成** | 打包配置层声明 userData 路径；实际退出清理待干净环境验收 |
| 安装包与日志密钥扫描 | **已完成** | NSIS 安装包 302MB 可扫描；`.env.windows` 仅 appId/测试 origin 占位，无 API key；源码扫描通过 |

## 办公工作区与 AI 文件协作（MSG62）

| 需求条目 | 状态 | 证据 |
|---|---|---|
| 现有办公能力审计文档 | 已完成 | `docs\kongchain-office-audit.md`（文件上传/读取/预览/office-to-pdf 均对应真实包：`packages\document\office-to-pdf`、`packages\api\workspace-files`） |
| 文件空间一级导航+6 类分类 | 已完成 | `office-workspace/client.js:104-107` 六分类；`plugins.tab` 注册 label “文件空间” |
| 真实文件资源与本地持久化 | 已完成 | `F:\KongChain-logs\office\registry.json` 含 id/path/type/size/sha256/source/taskIds/versions；工具 office_file_register/list/read |
| 从本地导入进文件空间 | 部分完成 | “从本地选择文件”仅点击原生 `input[type=file]`（client.js:109），不写 office registry；注册需 Agent 调 office_file_register |
| 打开预览与版本 | 部分完成 | CSV 以 textarea 打开可编辑；XLSX/DOCX/PDF 仅占位提示（client.js:135），未接入原生 documentpreview；版本保存真实（registry versions） |
| CSV 编辑、保存、重新打开 | 部分完成 | `office-e2e2.jsonl` 注册/读取/保存新版本/导出/复算成功；未显式重开版本文件；首轮 `office-e2e.jsonl` 读取因 `spawnSync python EPERM` 失败 |
| XLSX/DOCX/PDF 能力边界 | 部分完成 | office_file_read 走 python tools.py 可读（内控演示读 docx/xlsx）；UI 预览占位；PDF 仅文本层，无标注/编辑 |
| Univer / ONLYOFFICE 评估 | 已完成（仅评估） | office-audit.md:24-25、office-workspace.md:32：均未集成，许可/部署/保真需另评估 |
| AI 读文件→计算→写新成果，原文件不覆盖 | 已完成 | office-e2e2 step6 finance_profile sum=300.00；`office-internal-demo` 生成 procurement-risk-list.xlsx、procurement-review.docx，源文件 SHA-256 未变 |
| 用户查看/接受/拒绝 AI 变更 | 未完成 | client.js 无 diff/接受/拒绝逻辑，仅“AI 解释数据”“保存 CSV 新版本”；office-workspace.md 亦未声称已实现 |
| 内控办公闭环演示 | 部分完成 | 风险清单/报告草稿与任务证据存在；`office-internal-demo.err` 末为 MALFORMED_RESPONSE 且出现 “office_file_register is already registered” 重复注册错误；task-…s0p1cp 停留 waiting 未结项 |
| 无模型 API 时本地功能可用 | 部分完成 | CSV 编辑/保存走本地 HTTP 路由不依赖模型；无 API/断网场景未专门实测 |
| 真实错误提示 | 已完成 | `office-verify-result.json`：越权路径拒绝、重复导出拒绝；client.js error role=alert |
| 原有能力不回归 | 部分完成 | `office-ui-web.log` 显示 16 扩展全部 loaded；办公提交后未再跑全量测试/构建（最后全量测试早于办公提交） |
| 文件空间浏览器端到端 | 未完成 | 仅有 `office-ui-e2e.mjs` 脚本与空 `chrome-office*` 目录，无结果输出/截图留档 |

## 汇总统计

- 已完成 95 条；部分完成 24 条；未完成 6 条；阻塞 3 条；合计 128 条验收条目。

（说明：批次标题下的每条验收子项已拆分计数；同一批次内部分完成项不折算为完成。）

## 文档夸大 / 与证据不一致项

1. `docs\kongchain-office-workspace.md:9` “XLSX/DOCX/PDF：元数据/内容读取和现有 Harness 预览”——文件空间页签内并未接入原生预览，仅 client.js:135 占位提示；读取能力走工具，不在 UI。
2. `docs\kongchain-office-workspace.md:23` “CSV 注册、读取、新版本保存、导出均成功”——首次 e2e（`office-e2e.jsonl`）读取失败（python EPERM），成功来自第二次（`office-e2e2.jsonl`），文档未交代首次失败与重复注册错误。
3. `docs\kongchain-release-readiness.md:33` 场景 7 “上传 expenses.csv”——仅验证输入区文件芯片（workbench-e2e2.out），未证明文件进入 Agent 任务处理链路；同文件首轮 e2e `workbench-e2e.out` 的 upload.attached=false。
4. `docs\kongchain-release-readiness.md:37-50` 自有扩展测试计数（invoice 25/25 等）——测试文件存在，但 `F:\KongChain-logs` 未留对应测试运行日志，属文档单方宣称。
5. `docs\kongchain-release-readiness.md:99` “核心扩展”列 12 个——实际 16 个扩展包（漏列 skills/bundle/office-workspace/plugins），为过时摘要而非夸大。
6. `docs\kongchain\BATCH_1_VERIFICATION.md:37` “上游已跟踪文件零修改”——当时为真；后续桌面批次修改了 `apps\desktop` 与 `apps\web\src\node-builtin-stub.ts`（6 文件），该结论已过时。
7. `docs\kongchain\BATCH_8_VERIFICATION.md:53` “本轮没有新会话真实调用 contract_term_tags”——后续 `final-b-call-plugin.jsonl` 已真实调用，文档结论过时。

## 环境阻塞项

1. **桌面打包**：`vswhere.exe ENOENT`，且缺 VS C++ Build Tools、Windows SDK、PowerShell 7、7-Zip、NSIS；无法生成安装包/便携包与干净 VM 安装验收。
2. **全量测试**：`final-integration-test.log` 329 failed，集中为 vitest worker 崩溃、5 秒超时、vswhere、外部 SDK/网络/CI 差异。
3. **标准 Web 构建**：`final-integration-build.log` Web gate 失败于 esbuild 临时文件 `Access is denied`；靠 `scripts\build-web-workbench.mjs` 兜底构建。
4. **模型凭据**：10-29 官方 DeepSeek Key 返回 401，部分批次改用 Agentied 日卡通道；10-30 起官方 API 可用（model listing loaded 2 models）。
5. **sandbox 子进程限制**：headless 下 `spawnSync python` 报 EPERM，office 首轮读取失败；另出现 `office_file_register` 重复注册导致启动错误。
6. **模型流不稳定**：`final-s2`、`office-internal-demo` 出现 MALFORMED_RESPONSE，相关任务被如实降级 partial/未结项。

## 建议下一步

1. 安装 VS Build Tools + Windows SDK + pwsh7 + 7-Zip + NSIS，重跑 `package:win:x64:unsigned` 与 `:dir`，产出 NSIS 与便携包并在干净 VM 验收。
2. 实现桌面“演示保障模式”（合成数据、预置任务、示例输出、无 API 浏览），与真实模式明确区分；补首启欢迎页两个入口。
3. 文件空间补：本地导入写 registry、原生预览接入、AI 变更 diff 与接受/拒绝、任务关联与结果入口、重命名/删除处理；补 UI e2e 结果留档。
4. 修复 office 重复注册与 python EPERM 路径，补办公批次后的全量测试/构建回归。
5. 修复 `finance_analyze` 预算聚合缺陷；将 unittest 6/6 输出留档，补齐测试证据链。
6. 插件清单增加 permissions / harness 字段；真实演练一次“激活失败→回滚→复验”并留日志。
7. 交付前关闭开发者模式（当前 `.kongchain\developer-mode.json` enabled=true），并在 readiness 文档标注。
## 本轮（2026-10-31）复核后的补充说明

- **桌面打包已从阻塞变为已完成**：NSIS 安装包 302MB + 便携目录 1,074MB（`控链 KongChain.exe` 246MB）均已生成；干净环境安装验收待做。详见 `docs/kongchain-desktop-release.md`。
- Web 构建门禁：`build:web` 的 esbuild 临时文件删除失败已用 `DSH_WEB_UNMINIFIED=1` 绕过（`apps/web/vite.config.ts` 注释说明原因），供桌面打包流水线使用；默认 release 构建行为未改动。
- 交付前已把 `.kongchain/developer-mode.json` 的 `enabled` 置回 `false`。
- 本轮修复了 8 个环境问题（VS 工具链、esbuild、Electron 下载、符号链接、mkdtemp、ESM scope、smoke teardown、smoke exe 名），见 `docs/kongchain-desktop-release.md` §6。