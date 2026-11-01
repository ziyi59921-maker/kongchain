# 第 7 批验证记录：控链用户工作台

> 用户消息称为第 7 批；仓库已有 BATCH_7（插件生命周期），故按提交顺序命名为 BATCH_9，避免覆盖历史。

- 日期：2026-10-30（Asia/Shanghai）
- 项目：`F:\KongChain`
- Harness：`0.2.2-alpha.2`
- 模型：DeepSeek 官方 API

## 1. 技术审计与实现边界

复用现有 Harness 能力，不另起炉灶：

- 会话、模型调用、工具执行：原生 `AppWebEntry` / conversation；
- 任务输入、文件上传：原生 composer 与 `input[type=file]`；
- 历史：原生会话持久化与侧边栏；
- 插件/能力中心：原生“插件”入口；
- 开发者模式：原生 `/developer` 命令。

新增仅一个客户端插件：`extensions/kongchain-workbench`，通过 `conversation.hero.brand.mark`、`conversation.input.dock` 槽位装饰界面。

## 2. 主界面

真实 DOM 验收（Chrome CDP）：

- 产品名：`控链 KongChain`
- 定位：`财务与内控 AI Agent`
- 自然语言输入区：原生 composer
- 文件添加入口：原生 `input[type=file]` + “添加文件”按钮
- 常用任务：财务数据分析、会计资料核查、审计与内控、政策研究、创建新能力
- 入口：历史任务、专家与能力中心、开发者模式
- 视觉：白色/中性色、青绿色单主色、圆角芯片、响应式布局

截图：`F:\KongChain-logs\workbench-home-desktop.png`、`workbench-mobile2.png`。

## 3. 真实执行状态

状态胶囊数据来自 `InputState.phase` 与 `SessionStatus.running/pendingInteraction`，不是动画：

| 状态 | 实测 |
|---|---|
| 准备就绪 | 首页初始状态 |
| 正在执行工具或步骤 | 点击“政策研究”后 `data-state=running` |
| 等待审批或补充信息 | 任务触发真实审批/补充信息 |
| 已完成，查看结果 | 新会话提交“请只回答四个字：工作台完成”后 `data-state=done` |

任务结果文本由原生会话显示；文件下载/打开沿用原生 deliverables。

## 4. 端到端验收

1. **任务提交**：常用任务“政策研究”点击后提交真实 Agent 会话。
2. **状态显示**：观察到 running → waiting；简单任务观察到 done。
3. **完成展示**：`工作台完成` 结果文本 + `已完成，查看结果`。
4. **文件上传**：`DOM.setFileInputFiles` 送入 `expenses.csv`，界面出现 `expenses.csv CSV 276B` 与移除按钮。
5. **刷新与历史**：刷新后任务仍在历史会话列表/正文。
6. **响应式**：390×844 移动视口无横向溢出，任务入口仍可见。
7. **入口按钮**：添加文件、历史任务、专家与能力中心、开发者模式均有实际行为（原生文件选择器、会话搜索、插件面板、`/developer status` 提交）。
8. **失败展示**：未伪造成功；原生会话错误卡片负责失败详情。无效斜杠命令被交给模型处理，不显示假完成。此前 API key 缺失时 UI/CLI 显示 `MISSING_CREDENTIAL`。

日志：`F:\KongChain-logs\workbench-e2e.out`、`workbench-e2e2.out`、`workbench-buttons.mjs` 输出。

## 5. Web 构建说明

- 标准 `pnpm run build` 的 Web gate 在当前 Windows 环境失败：Vite/esbuild 删除临时文件被拒绝（环境权限/文件锁），不是业务代码编译错误。
- 为保证本轮真实启动界面，使用同一 esbuild 技术栈的兼容构建：`node scripts/build-web-workbench.mjs`。
- 该脚本打包 `apps/web/src/main.ts`，生成 `apps/web/dist`，由 `pnpm dsh web` 真实服务；不是静态 HTML 原型。
- `scripts/build-web-workbench.mjs` 与 `apps/web/src/node-builtin-stub.ts` 仅作构建兜底，不改变运行时 Agent Loop。

## 6. 未实现/限制

- 失败详情依赖原生会话错误卡片，状态胶囊不解析具体错误文本。
- Hero 首屏在尚无会话时沿用原生输入区；常用任务在 composer dock 中提供。
- 文件选择能力受浏览器/移动端限制。
- 未新增后端 API、路由或独立数据库。
- 标准 Vite Web 构建仍需在临时文件权限正常的环境修复。

## 7. 恢复与提交

- 工作台插件：`extensions/kongchain-workbench`
- 兼容构建：`scripts/build-web-workbench.mjs`
- 启动：`node scripts/build-web-workbench.mjs && pnpm dsh --profile kongchain --no-open --port 3083`
