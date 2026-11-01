# 第 2 批验证记录：内控专业化与 Agent Profile

- 日期：2026-10-29（Asia/Shanghai）
- 基线：DSH `f3803c96`（0.2.2-alpha.2）；控链分支 `kongchain/dev`
- 项目：`F:\KongChain`
- Profile：`kongchain`（`@deepseek-ai/dsh-base` → `@deepseek-ai/dsh-web-app` → `@kongchain/bundle`）
- 本轮未修改 `packages/`、`apps/`、Agent Loop、会话格式、模型适配源码。

## 1. 本轮新增

| 内容 | 路径 | 说明 |
|---|---|---|
| 专业指令插件 | `extensions/kongchain-professional/` | `ctx.systemPrompt.section({ name: 'kongchain:professional', order: 100 })` |
| 品牌客户端插件 | `extensions/kongchain-brand/` | 占用 `sidebar.brand.mark` / `sidebar.brand.name` 槽位 |
| 6 个专业技能 | `extensions/kongchain-skills/skills/` | 内控基础、采购付款、单据审阅、证据追溯、底稿、财务数据分析 |
| Bundle 行 | `extensions/kongchain-bundle/cordis.patch.yml` | 新增 `kongchain-professional`、`kongchain-brand` |
| 文档 | `docs/kongchain/` | 本记录 + 架构/指南/规格更新 |

专业技能共 8 个（含原有 `kongchain-product`、`kongchain-developer`）。

## 2. 启动与加载验证

```powershell
$env:DSH_HOME='F:\KongChain-home'
$env:DSH_PROFILE='kongchain'
Set-Location F:\KongChain
pnpm dsh --profile kongchain --no-open --port 3082
```

启动日志（节选）：

```
[kongchain-professional] registered system section kongchain:professional (order=100)
[kongchain-core] loaded ... profile=kongchain
[kongchain-core] registered tool kongchain_runtime_info
[kongchain-tools] loaded
[kongchain-tools] registered tool kongchain_extension_catalog
[kongchain-developer] loaded
[kongchain-developer] registered tools kongchain_developer_policy, kongchain_validate_extensions
dsh web: http://127.0.0.1:3082/?token=...
```

- `--dump-config` 显示新增行和 persona；
- Web 页面侧边栏品牌显示 **控链 / KongChain**（客户端插件生效）：
  `F:\KongChain-logs\kongchain-brand.png`
- 页面文本包含 `控链`、`KongChain`，证明不是仅创建文件。

## 3. 真实模型通道

- 本机 DeepSeek 官方 Key 返回 401（不在本轮修复范围）。
- 改用用户 Desktop 已在用的 **Agentied 日卡** OpenAI 兼容通道：
  - baseURL `https://agentied.top/v1`
  - 模型 `deepseek-v4.1-flash-daycard`（UI 显示 `DeepSeek V4.1 Flash（日卡）`）
  - Key 来自本机 `~/.dsh/.credentials.yaml` 的 `AGENTIED_API_KEY`，**未写入仓库、未出现在日志**。
- 该配置写在个人 profile 的 `~/.dsh/profiles/kongchain/cordis.patch.yml`，属于本机运行配置，不是控链源码。
- 简单对话验证：回复“连接成功”，用时 6 秒，`DeepSeek V4.1 Flash（日卡）`。

## 4. 四个开放任务实测

测试工作区：`G:\日历`（个人 Home 现有工作区）；任务通过真实 Web 会话发送，非 mock。

| # | 任务 | 会话/时间 | 实际技能与工具 | 结果 |
|---|---|---|---|---|
| 1 | 解释采购付款环节常见的内部控制风险。 | `3c451940` / 21:06:49 | `skill: purchase-payment-analysis`、`internal-control-basics`；无其他工具 | 按阶段给出风险、控制、证据、设计/运行缺陷、限制；明确“未读取实际单据，不能下舞弊结论” |
| 2 | 帮我分析这份模拟采购合同，提取其中关键条款。 | `a5e79721` / 21:08:06 | `skill: accounting-document-review`、`purchase-payment-analysis`；`read` 合同文件 1 次；`pwsh` 1 次 | 提取 8 类条款，做金额/税率/违约金计算，列出附件/签章/账户等缺失与无法核对项 |
| 3 | 编写一个比较两张表格金额的 Python 程序。 | `f2f131d5` / 21:09:40（首跑） | `skill: financial-data-analysis`；`pwsh:21`、`write:10`、`job_output:4` | 首跑尝试执行并安装 pandas，工作区环境不完整，超时；不作为最终结果 |
| 3b | 同上，但明确“只给完整代码，不执行”。 | `67d5ea52` / 21:12:36 | `skill: financial-data-analysis`；无执行工具 | 给出完整可运行程序（Decimal、键匹配、容差、差异明细/汇总 CSV、限制说明） |
| 4 | 帮我规划一个与内控无关的普通文件整理任务。 | `df7f9b52` / 21:14:00 | **无内控技能**；`pwsh:6`（只读扫描） | 识别当前工作区是 Android 工程，给出安全整理方案与需用户确认项，没有套用内控流程 |

会话日志证据：

- 四个任务的技能/工具调用汇总：`F:\KongChain-logs\task-sessions.txt`
- 任务 1/2/3b/4 的完整对话文本：`F:\KongChain-logs\chat-task1.log`、`chat-task2.log`、`chat-task3b.log`、`chat-task4.log`
- 任务 3 首跑（环境失败）：`F:\KongChain-logs\chat-task3.log`
- 截图：`F:\KongChain-logs\chat-task1.png` 等同名 PNG

### 技能确实由运行时读取

从 zstd 会话日志解压后确认：

- 任务 1 调用 `skill` 两次，参数分别为 `purchase-payment-analysis`、`internal-control-basics`；
- 任务 2 调用 `skill` 两次，参数为 `accounting-document-review`、`purchase-payment-analysis`，并调用 `read`；
- 任务 3/3b 调用 `skill`，参数为 `financial-data-analysis`；
- 任务 4 **没有**调用内控技能，只有只读 `pwsh`。

说明：`dsh-skill-filesystem` 的 `customSkillDirs` provider 在运行时确实发现了这些 `SKILL.md`，模型按任务匹配加载，而不是只把 Markdown 放在磁盘上。

## 5. 与内控无关任务的开放性

任务 4 证明智能体没有被限制在采购付款流程：

- 它先扫描工作区，识别出 Android 工程；
- 按“普通文件整理”给出 P0 安全约束、分阶段方案和用户确认项；
- 没有加载内控技能，也没有套用审批/凭证模板。

## 6. 限制与未完成项

1. 干净 `F:\KongChain-home` 没有模型凭据，Web 对话需在个人 Home 的 kongchain profile 中配置模型；模型配置未纳入仓库。
2. 任务 3 首跑暴露测试工作区 Python 环境缺少 pandas/numpy；本轮用“只给代码不执行”完成验收，未在该工作区搭建完整 Python 环境。
3. 任务 2 的合同是模拟文件，不含真实主体/账户；分析中的金额与条款结论仅对模拟文本有效。
4. 品牌是侧边栏槽位级改动；浏览器标题仍由构建期 `DSH_CLIENT_TITLE` 决定，本轮未重建标题。
5. 开发者模式入口仍使用官方 Plugins/Settings 页面与 `kongchain_developer_policy` 工具，未新增独立前端页面。
6. 未开发采购付款业务工作流；本轮只做专业指令、技能与品牌。

## 7. 验收对照

- [x] 原版 Harness 功能仍可运行（原 `web` profile 3080 仍 200；控链 profile 3082 可启动）
- [x] 控链扩展被运行环境识别（启动日志、dump config、插件页、品牌槽位）
- [x] 新增扩展未破坏 Agent Loop（未改核心源码；四任务均走真实 Agent Loop）
- [x] 自有代码与上游代码可区分（`extensions/`、`docs/kongchain/`；`git diff` 不含上游文件）
- [x] `PRODUCT_SPEC.md` 已建立并更新
- [x] 实际启动并验证扩展加载结果
- [x] 四个开放任务实测；技能在运行时被实际加载
