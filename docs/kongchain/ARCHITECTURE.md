# KongChain 扩展架构（基于 DSH 0.2.2-alpha.2 实检）

本文只描述当前检出版本中**已存在**的机制与 API；所有结论均来自 `F:\KongChain` 源码/文档，不假设未来 API。

## 1. 运行时组合：Profile → Bundle → Patch → Plugin

- Profile 位于 `$DSH_HOME/profiles/<name>/`，由 `package.json` 与 `cordis.patch.yml` 组成。
- `package.json` 的 `dsh.profile.bundles` 是**有序** bundle 列表；每个 bundle 的 `package.json` 用 `dsh.bundle.patch` 声明一个 patch 文件或 patch 文件数组。
- 组合顺序：空根 → 按 bundle 顺序应用每个 bundle 的 patch → profile 的 `cordis.patch.yml` → home patch → `--patch` 覆盖层。后层按 `id` 覆盖前层；覆写是**整段 `config` 替换**，不是深合并。
- 一个 patch 条目可以：
  - `insert` 新行（`name` 可以是 package specifier、绝对路径、file URL，或相对 patch 文件的 `./`/`../` 路径）；
  - 按 `id` 覆盖既有行的 `config`/`disabled`；
  - 使用 `!!js` 表达式在加载时求值。
- 官方事实来源：
  - `packages/boot/app-boot/README.md#profiles`
  - `packages/bundle/base/cordis.patch.yml`
  - `packages/bundle/web-app/cordis.patch.yml`
  - `apps/cli/src/args.ts`

### KongChain 的落地

- 新 profile：`F:\KongChain-home\profiles\kongchain`，bundles 为
  `@deepseek-ai/dsh-base` → `@deepseek-ai/dsh-web-app` → `@kongchain/bundle`。
- `@kongchain/bundle` 的 `dsh.bundle.patch` 指向 `extensions/kongchain-bundle/cordis.patch.yml`。
- 控链 patch 只 `insert` 插件行/技能 provider，并覆盖 `system-prompt` 的 `personaPrefix`。
- 不新增 app 入口，不修改 `apps/cli`。

## 2. 插件：声明、加载、启用、卸载

- 插件是 Cordis 模块，通常导出：
  - `export const name = '...'`
  - `export const inject = ['tools', ...]`（依赖的 ctx 服务）
  - `export function apply(ctx, config)`（注册能力）
  - 可选 `export const Config = ...`（Schemastery 配置 schema）
- 加载：Loader 按组合树挂载插件；`inject` 声明的服务未就绪时插件等待，而不是报错。
- 启用/禁用：通过 patch 行 `disabled: true/false`；profile 或 bundle 层均可控制。
- 卸载：Cordis effect 自动清理 `ctx.on`、`ctx.tools.register` 等注册；`ctx.effect` 用于显式 disposer。
- 重载：
  - `dsh-hmr` 监听 profile manifest、profile patch、home patch；配置变化重组合。
  - 模块级热重载需在 `hmr.root` 显式配置；官方 Web 开发使用 `pnpm run dev:web`。
  - 无 HMR 时，配置/包变化需要重启。
- 官方事实来源：
  - `docs/user/develop/basic/index.md`
  - `docs/user/develop/framework/service.md`
  - `packages/boot/hmr/README.md`
  - `packages/boot/plugin-manager/README.md`

### 控链插件形态

`extensions/kongchain-core/src/index.js`、`kongchain-tools`、`kongchain-developer` 都是普通 ESM Cordis 插件，只使用 Node 内置模块；通过 package specifier（profile 依赖 `link:`）挂载，避免复制上游代码。

## 3. 工具注册与调用

- 工具由 `ctx.tools.register(definition, options?)` 注册（`packages/core/tools/src/index.ts:128`）。
- `ToolDefinition` 必填：`name`、`description`、`parameters`（JSON Schema 子集）、`output.schema`、`output.render`、`execute(args, exec)`。
- 工具注册表是 host + per-scope 分层：
  - host 级插件注册进入 global layer，所有 agent 可见；
  - agent preset 内注册进入该 preset 的 scope layer。
- 模型调用工具后，结果以 `tool/result` 进入会话；输出先按 `output.schema` 校验，再经 `render` 生成模型可见内容。
- 官方事实来源：
  - `packages/core/tools/src/index.ts`
  - `packages/core/tools/src/contracts.ts`
  - `docs/user/develop/basic/tool.md`
  - `packages/bundle/web-app/presets/standard.patch.yml`

### 控链工具

- `kongchain_runtime_info`：运行时身份/commit/profile/扩展清单。
- `kongchain_extension_catalog`：扩展包、bundle patch、技能目录。
- `kongchain_developer_policy`：开发者模式可写/禁写边界与验证命令。
- `kongchain_validate_extensions`：PRODUCT_SPEC、bundle patch、manifest、skill frontmatter 静态校验。

这些工具是 host 级注册，不修改 `tools` 服务或 Agent Loop。

## 4. 模型适配层

- 模型适配由 `ctx.llm` 服务与具体 adapter（`packages/llm/llm-deepseek`、`dsh-llm-pi-ai` 等）承担；请求/流/工具 schema 由 `packages/llm/llm` 定义。
- 控链不新增 adapter，不复制 provider 逻辑；只通过既有 profile 配置和会话模型选择使用。
- 官方事实来源：`docs/architecture.md`、`packages/llm/llm/README.md`、`packages/llm/llm-deepseek/README.md`。

## 5. 会话记录机制

- `ctx.sessions` 是 append-only `SessionEvent` 日志与内存 store（`packages/core/session`）。
- 模型可见内容必须可从会话日志重建（model-visible ⟺ logged）。
- 控链不新增会话事件类型，不修改 `SessionEventMap`、`SESSION_FORMAT_VERSION`。
- 工具调用、结果、turn/step 事件由既有 Agent Loop 记录。
- 官方事实来源：`docs/architecture.md#turn-flow`、`docs/subsystems/session.md`、`packages/core/session/README.md`。

## 6. 插件管理器与安装/重载/卸载

- CLI：`dsh plugin --profile <name> <pnpm args>` 在 profile 目录转发 pnpm；新增依赖中声明 `dsh.bundle` 的包会自动加入 bundle 选择（`packages/boot/plugin-manager/src/operations.ts#reconcile`）。
- Web Plugin Manager / `plugin_manager` 工具提供 `install_bundle`、启用/禁用、移除、更新等操作；host 级代码在进程内执行，不受 workspace sandbox 保护。
- 安装：
  - 本地开发路径用 `link:<absolute dir>`；
  - 安装成功后 bundle 追加到 `dsh.profile.bundles` 末尾；
  - 插件在重启/重组合后加载。
- 重载：HMR 可用时 profile 重组合，新行挂载；不可用时报告 `restart-required`。
- 卸载：先 deselect/卸载 bundle，再移除包；HMR 下会停止受影响插件并 evict 模块。
- 官方事实来源：`packages/boot/plugin-manager/README.md`、`apps/cli/src/plugin.ts`、`docs/user/develop/basic/publish.md`。

### 控链选择

第 1 批使用 CLI `dsh plugin --profile kongchain add link:...` 安装本地扩展；install 之后通过 `--dump-config` 和启动日志验证。没有使用 `plugin_manager` 工具（本会话未暴露该工具），也没有手改 profile 的 package.json。

## 7. 开发模式与源码调试入口

- 源码启动：`pnpm dsh --profile <name>`（内部 `node --import tsx/esm apps/cli/src/bin.ts`）。
- 构建：`pnpm run build`；仅构建客户端/开发用 `pnpm run dev:web`（会先 `build:artifacts`，再 serve 并重建 client bundle）。
- 组合预览：`dsh --profile <name> --dump-config`；schema 预览：`--dump-config-schema`。
- 临时覆盖层：`dsh --profile <name> --patch <file>`；可插入绝对路径插件，用于开发验证。
- 官方事实来源：`docs/development.md`、`apps/cli/README.md`、`docs/user/develop/basic/index.md`。

## 8. 控链扩展目录与边界

```
extensions/
  kongchain-core/        # 运行时身份 + 工具
  kongchain-tools/       # 扩展/技能发现工具
  kongchain-developer/   # 开发者模式边界 + 静态校验
  kongchain-professional/# 内控专业系统指令 section
  kongchain-brand/       # 侧边栏品牌槽位（client.js）
  kongchain-skills/      # SKILL.md
  kongchain-bundle/      # profile bundle + patch + headless 验证 overlay
docs/kongchain/          # 产品规格/架构/扩展指南/验证记录
```

- 上游目录（`packages/`、`apps/`、`vendor/`、`native/` 等）保持零修改。
- 自有代码通过 `extensions/` 目录、独立 `package.json`、独立 README 与 git 分支与上游区分。
- 明确不做：复制 Agent Loop、另建智能体框架、固定采购付款工作流、重写前端。

## 9. 已知限制（当前版本）

- 第 2 批已在 Web 会话中用真实模型验证四个开放任务（见 `BATCH_2_VERIFICATION.md`）；干净 Home 没有模型凭据，真实模型测试使用个人 Home 的 kongchain profile。
- `dsh-skill-filesystem` 的 `customSkillDirs` 使用本 checkout 的绝对路径；移动仓库需同步更新 bundle patch。
- 插件管理器安装/卸载的实际行为以当前版本为准；第 1/2 批只做安装、启动与技能调用验证，未做卸载演练。
- 品牌只占用侧边栏槽位；浏览器标题仍由构建期 `DSH_CLIENT_TITLE` 决定。
- 专业指令是 system prompt section，技能是运行时加载的 `SKILL.md`；没有把全部规则塞进一个超长提示词。
