# @kongchain/workbench

控链用户工作台客户端插件。只装饰现有 Harness 会话界面，不替换会话、模型调用、工具执行、附件上传、历史持久化或插件管理机制。

## 功能

- `conversation.hero.brand.mark`：显示“控链 KongChain / 财务与内控 AI Agent”。
- `conversation.hero.agentPreset`：常用任务入口、添加文件、历史任务、专家与能力中心、开发者模式。
- `conversation.input.dock`：真实状态胶囊，来自 `InputState.phase` 与 `SessionStatus`。

## 行为

- 常用任务：把任务模板写入原生输入区并提交，走真实 Agent 会话。
- 添加文件：触发原生 `input[type=file]`，进入真实附件上传链路。
- 历史任务：点击原生侧边栏会话搜索。
- 专家与能力中心：点击原生“插件”入口。
- 开发者模式：提交 `/developer status` 命令。

## 构建与启动

当前 Windows 环境标准 `vite build` 会因 esbuild 临时文件删除被拒而失败；使用同一 esbuild 技术栈的兼容构建：

```sh
node scripts/build-web-workbench.mjs
pnpm dsh --profile kongchain --no-open --port 3083
```

## 限制

- 状态胶囊覆盖“准备就绪/正在理解/正在执行/等待审批/已完成”；失败详情由原生会话错误卡片展示。
- 没有新增后端接口；所有结果、文件下载、历史记录仍由 Harness 原生机制提供。
- 移动端使用响应式布局，但文件选择能力取决于浏览器。
