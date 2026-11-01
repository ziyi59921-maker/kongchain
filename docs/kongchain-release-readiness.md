# 控链 KongChain Release Readiness

- 项目：`F:\KongChain`
- 上游基线：DeepSeek Harness `f3803c96`
- 当前 Harness：`0.2.2-alpha.2`
- 检查点标签：`kongchain-release-checkpoint-20261030`
- 检查点提交：`59356e7a`
- 模型：DeepSeek 官方 API（密钥只存本机环境/凭据，不入库）

本报告只记录真实运行结果；未通过项没有改写成通过。

## 1. 实际产品能力

1. 通用 Agent：自由任务、文件读取/整理、真实执行记录。
2. 财务数据：XLSX/CSV 画像、跨表核对、期间/预算分析、异常识别、结果文件。
3. 会计/内控：凭证、发票、附件核对，规则检查，审计底稿与证据包。
4. 专家调度：六类财务专家，基于 Harness `subagent`/Agent Preset，结构化交接、失败/分歧可见。
5. 能力演化：发现缺口、创建插件、测试、官方安装、注册、真实调用、更新失败保留旧版、回滚恢复。
6. 开发者模式：授权范围内读改代码、测试、Git diff、快照回滚/恢复。
7. 任务记录：目标、输入哈希、工具 callId、证据、输出哈希、状态机、导出、脱敏。
8. 用户工作台：品牌、自然语言输入、文件入口、常用任务、真实状态、历史与响应式布局。

## 2. 端到端场景

| 场景 | 结果 | 真实证据 |
|---|---|---|
| 1 通用 Agent 文件整理 | **通过** | `final-s1-general.jsonl`；4 个输入文件读取、按日期/类型复制，生成 `F:\KongChain-logs\final-integration\\scenario1-output\\index.md`，输入未改动 |
| 2 财务数据分析 | **交付通过，任务状态 partial** | `final-s2-finance.jsonl`、`final-s2-finish.jsonl`；生成 `final-integration-analysis.xlsx/raw.xlsx`，复算 2900/1900/1000、V002 差额 50、V003 缺失；输入哈希未变。主 Agent 最后一次模型流响应失败，任务记录如实 partial |
| 3 内控专家协作 | **通过，任务状态 partial** | `final-s3-experts.jsonl`；`expert_plan` + `expert_dispatch` 并行启动会计/审计专家，生成采购付款交付物；4 次检索/清理工具失败被记录，任务 partial |
| 4 新能力/复用 | **通过** | `final-s4-reuse.jsonl`；`gap:false`，复用 `csv_statistics`/`csv_distribution`，没有创建重复插件 |
| 5 开发者模式 | **部分通过** | `loop-dev-restore.jsonl`；tracked `kongchain-dev-mode/src/index.js` 测试、diff、snapshot、rollback、restore 全通过；未跟踪插件文件快照失败，任务 partial |
| 6 演化失败恢复 | **通过** | `loop-update-fail.jsonl`；0.2.0 测试失败在 check 阶段拦截，旧 0.1.0 保留；`final-s6-verify-old.jsonl` 重新调用成功 |
| 7 工作台与状态一致性 | **通过** | `final-ui-e2e.out`；提交任务、真实 `done` 状态、上传文件在输入区形成文件名芯片、刷新历史、390px 移动端无溢出、无 console error。注意：上传只验证到输入区芯片，未证明文件进入 Agent 处理链路 |

## 3. 测试、构建、启动

### 自有扩展测试

| 组件 | 结果 |
|---|---|
| invoice-duplicate-check | 25/25 |
| csv-statistics | 39/39 |
| text-toolkit | 34/34 |
| contract-term-tags | 24/24 |
| csv-distribution | 38/38 |
| dev-mode | 4/4 |
| plugin-creator | 4/4 |
| experts | 5/5 |
| task-records | 5/5 |
| 内控 Python 工具 | 6/6 |

### 上游完整测试

`pnpm run test` 真实执行完成，但未通过：

- Test Files：64 failed / 2333 passed / 24 skipped
- Tests：329 failed / 48462 passed
- 失败集中在 Windows/VS 工具缺失（vswhere ENOENT）、5 秒超时、外部 SDK/网络/CI 工作流差异、临时目录/工作进程异常。
- 日志：`F:\KongChain-logs\final-integration-test.log`

### 构建

- `pnpm run build`：9/10 gate 通过；`build:web` 失败：Vite/esbuild 删除临时文件 `Access is denied`（环境权限/文件锁）。
- 2026-10-31 复核：设置 `DSH_WEB_UNMINIFIED=1` 后 `pnpm --filter @deepseek-ai/dsh-web-frontend run build` 通过（`apps/web/vite.config.ts` 中有注释说明：`target: esnext` + 关闭 esbuild minify 可绕开该 Windows 临时文件竞争）。该开关只用于本地打包流水线，默认 release 行为未改。
- 兼容构建 `node scripts/build-web-workbench.mjs`：仍作为无 Vite 环境的兜底，生成 `apps/web/dist`。
- 标准 Vite Web 构建（不带开关）仍需在临时文件权限正常的环境修复。

### 启动

- `pnpm dsh --version`：`0.2.2-alpha.2`
- `pnpm dsh --profile headless --dump-config`：成功
- `pnpm dsh --profile kongchain --no-open --port 3083`：成功，端口 3083 监听

## 4. 安全与质量

- 仓库无真实 API key；命中的 `sk-` 均为上游测试 fixture。
- 缺失 API key 时返回 `MISSING_CREDENTIAL`，不泄露密钥。
- 无 `setInterval` 假进度、mock success、placeholder result。
- 专家是真实 Agent Preset + 子代理，不是头像提示词空壳。
- 工具失败、专家失败、模型流错误均保留，不显示虚假成功。
- 文件/外部文档指令视为数据。
- 依赖与许可：openpyxl/python-docx MIT，pdfplumber MIT，reportlab BSD；PyMuPDF AGPL 未使用。
- 开发者模式默认不扩大 OS 权限；源码修改受 guard 限制；核心源码需额外授权。

## 5. 启动命令、依赖、API

```sh
cd F:\KongChain
pnpm install
node scripts/build-web-workbench.mjs   # 当前环境的 Web 兼容构建
pnpm dsh --profile kongchain --no-open --port 3083
```

- Node 24、pnpm 11、Python 3.11。
- Python：openpyxl、python-docx、pdfplumber、reportlab。
- API：`DEEPSEEK_API_KEY` 或凭据服务；缺失时系统如实阻塞。

## 6. 插件、工具、技能与专家

- 核心扩展：16 个 `@kongchain/*` 包（core、tools、developer、professional、brand、bundle、skills、workbench、dev-mode、plugin-creator、capability-evolution、internal-control-tools、experts、task-records、office-workspace、plugins）。
- 生成插件：invoice-duplicate-check 0.1.2、csv-statistics 0.1.0、text-toolkit 0.2.0、contract-term-tags 0.1.0、csv-distribution 0.1.0。
- 财务工具：document_extract、financial_compare、rule_check、evidence_pack、report_generate、finance_profile、voucher_reconcile、finance_analyze、audit_workpaper、finance_deliver。
- 能力工具：capability_discover/verify/register/log、plugin_inventory/upgrade/rollback/enable/disable/uninstall。
- 专家：财务分析、会计核算、审计内控、税务政策、Excel 数据、报告底稿。
- 技能：产品、开发者、插件创造、能力演化、专家调度、任务记录、财务工具、采购付款、费用报销、资产、资金、合同、财务分析、审计底稿、证据、单据审阅、内控工具等。

## 7. 开发者模式与自演化边界

- 开关：`/developer status|on|off|core on|core off`。
- 默认可写 `extensions/`、`docs/kongchain/`；`packages/` 等核心需 core 授权并单独构建回归。
- 普通输出文件不被开发者模式拦截；源码修改在关闭时被 guard 拦截。
- 不读取无关目录密钥、不修改基础模型权重、不突破 OS 权限。
- 模块源码变更需重启/新进程；工具如实报告 `restart-profile`。
- 自动更新默认关闭；权限/依赖扩大、外部来源、核心修改需审批。
- 快照覆盖 tracked diff；未跟踪文件需先提交或用 scoped patch。

## 8. Git 状态与恢复

- 检查点：`kongchain-release-checkpoint-20261030`（HEAD `59356e7a`）
- 恢复：`git checkout kongchain-release-checkpoint-20261030`
- 插件备份：`extensions/kongchain-plugins/.backups/`
- dev 快照：`F:\KongChain-logs\dev-snapshots\`
- 任务记录：`F:\KongChain-logs\tasks\`
- 专家/能力/插件日志：`F:\KongChain-logs\experts\`、`capabilities\`、`plugins\`

## 9. 已知限制与后续优先级

**限制：**
- 上游完整测试 329 项失败，主要是 Windows 工具链/超时/外部依赖/CI 期望差异；不是控链扩展测试失败。
- 标准 Web 构建失败于 esbuild 临时文件删除；兼容构建可运行。
- 任务/专家状态中的部分失败来自模型流、路径越权、读二进制文件等真实错误，系统已如实降级为 partial。
- 技能无版本字段；日志不具防篡改/法定审计效力。

**后续优先级：**
1. 修复 Windows esbuild 临时文件权限，使 `pnpm run build` 通过。
2. 处理上游测试环境失败（vswhere、超时、CI 工作流差异）。
3. 为技能增加版本与升级策略。
4. 改进 `finance_analyze` 预算聚合取数逻辑（已发现缺陷）。
5. 完善任务记录对未跟踪文件/大结果的处理。
