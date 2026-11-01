# 控链 KongChain 产品架构（第一阶段：方向纠偏与能力底座重构）

- 版本：v0.2.2-alpha.2（基于 DeepSeek Harness `f3803c96`）
- 日期：2026-10-31
- 状态：第一阶段交付文档

---

## 一、产品定位（纠偏后）

**控链 KongChain 是一套桌面 AI 工作平台**，以财务与内控为专业主场，以文件和业务任务为工作对象，以 Agent 自主执行为核心，以可追溯的工作成果为交付物。

### 与"聊天机器人"的核心区别

| 维度 | 聊天式 Agent（当前） | 桌面 AI 工作平台（目标） |
|---|---|---|
| 主界面 | 聊天对话流 | 文件工作区 + 任务面板 |
| 交互模式 | 输入框 + 快捷按钮 | 文件拖放、任务创建、结果审阅 |
| 信息组织 | 会话历史 | 文件库、任务看板、证据链 |
| 能力发现 | 不可见 | 能力中心（工具/Skill/插件） |
| 专业闭环 | 对话中执行 | 工作台中执行、审阅、交付 |

### 明确禁止

1. 不允许仅修改 Logo、颜色、文案和快捷任务按钮
2. 不允许继续把聊天窗口作为整个产品的主界面
3. 不允许把空白页面、静态卡片包装成已实现的业务模块
4. 不允许重复造已有的 Harness 功能
5. 不允许擅自删除现有可用能力

---

## 二、当前项目真实状态（深度代码审查结论）

### 2.1 当前首页构成

当前 UI 是 **100% 上游 Harness 对话界面**，KongChain 只通过 `extensions/kongchain-workbench/client.js` 注入两个槽位：

- `conversation.hero.brand.mark`：SVG logo + "控链 KongChain / 财务与内控 AI Agent"
- `conversation.input.dock`：5 个快捷任务按钮 + 添加文件/历史任务/专家中心/开发者模式入口 + 状态指示器

**深层问题**：
- 品牌改造用 DOM 抓取 `<span>` 重写文案、CSS 隐藏 `[class*=titleGroup]`（`client.js:72-81,59-60`）——脆弱的 hack，不是 API 用法
- 快捷任务按钮只做 `inputActions.setDraft(prompt)` + `submit()`（预设提示词）
- 历史任务/专家中心按钮是对 `aria-label="搜索会话"/"插件"` 按钮的模拟点击
- `kongchain-workbench/index.js`（host 半）是空的 `apply(){}`（216 字节）

**结论：聊天包装器 + 预设按钮 + 装饰性品牌。没有文件工作区、任务看板、能力中心作为一等页面。**

### 2.2 真实能力 vs UI 壳

| 扩展 | 注册工具数 | 注册路由数 | 真实执行 | 仅 UI |
|---|---|---|---|---|
| kongchain-core | 1 | 0 | ✅ runtime_info | |
| kongchain-tools | 1 | 0 | ✅ extension_catalog | |
| kongchain-developer | 2 | 0 | ✅ policy/validate | |
| kongchain-professional | 0 | 0 | ✅ system_prompt.section | |
| kongchain-plugin-creator | 14 | 0 | ✅ scaffold/check/install/rollback/inventory | |
| kongchain-dev-mode | 9 | 0 | ✅ guard/diff/snapshot/rollback/test/reload | |
| kongchain-internal-control-tools | 10 | 0 | ✅ document/compare/rules/evidence/report + finance | |
| kongchain-capability-evolution | 5 | 0 | ✅ discover/register/log/verify/policy | |
| kongchain-experts | 5 | 0 | ✅ catalog/plan/dispatch/status/log | |
| kongchain-task-records | 11 | 0 | ✅ schema/begin/step/evidence/output/finish/export | |
| kongchain-office-workspace | 5 | 1 | ✅ file registry/read/save/export | |
| kongchain-brand | 0 | 0 | | ✅ sidebar brand |
| kongchain-workbench | 0 | 0 | | ✅ quick tasks + status |
| **合计** | **63** | **1** | **14 个扩展真实工具** | **2 个纯 UI** |

### 2.3 Agent 执行能力

- ✅ Agent 可调用工具、操作文件、完成多步骤任务（63 个工具已注册）
- ✅ 子代理调度（6 个专家，真实 `ctx.subagents.startActivation`）
- ✅ 任务记录与证据追溯（结构化 JSONL）
- ✅ 插件生命周期（创建/测试/安装/升级/回滚）
- ❌ 文件管理无统一入口（office-workspace 有注册表，但 UI 只是插件页的一个 tab）
- ❌ 无独立的任务看板（任务记录是工具，不是 UI 页面）

### 2.4 文件管理现状

- `extensions/kongchain-office-workspace/` 提供文件注册表（SHA-256、版本、任务关联）
- HTTP 路由：`/api/kongchain-office/files`、`/api/kongchain-office/file`、`/api/kongchain-office/csv`
- **但 UI 只是插件页的一个 tab（"文件空间"），不是一级导航**
- CSV 可编辑/版本化；XLSX/DOCX/PDF 只能通过工具读取，UI 是占位提示

### 2.5 插件/Skill 机制

- 插件通过 `cordis.patch.yml` 声明式注册到 bundle
- Skill 通过 `@deepseek-ai/dsh-skill-filesystem` 的 `customSkillDirs` 加载（19 个 SKILL.md）
- Profile 通过 `link:` 依赖指向扩展目录（开发模式）
- **机制正确，但 Skill 只是 Markdown 知识文件，需要配套真实工具**

### 2.6 桌面端

- `apps/desktop/` 完整 Electron 框架（已打包成功：NSIS 302MB + 便携 1,074MB）
- 运行时随包携带 Node/Python/pnpm
- **可复用，不需要另起 Electron**

---

## 三、目标架构

### 3.1 核心原则

1. **保留 Harness 成熟能力**：Agent Loop、会话管理、工具系统、插件系统、Skill 系统
2. **在扩展层实现控链功能**：不修改上游核心，通过 `extensions/` 实现产品能力
3. **文件优先**：工作区以文件为中心，不是以对话为中心
4. **任务驱动**：任务是第一级实体，有状态、有证据、有交付物
5. **能力可见**：工具/Skill/插件在能力中心可浏览、可管理

### 3.2 七大架构缺口（深度审查发现）

1. **UI 是装饰**：首页 = 上游聊天 + 提示词按钮；真实能力（文件/任务/能力/专家）埋在插件 tab 或无 UI
2. **无工作面**：没有文件工作区面板、任务看板、交付物审阅、证据链查看器
3. **脆弱 DOM 契约**：文案替换、`aria-label` 点击、`document.execCommand`——上游 UI 改动即坏
4. **硬编码绝对路径**：`F:/KongChain-logs/*`、`F:/KongChain-home`——不 portable、不适合打包桌面
5. **数据碎片化**：office registry / task index / expert status / capability registry / plugin log 各自独立，无交叉引用
6. **Skill-Tool 无绑定**：Skill 和专家在文案中描述工具，运行时无机器可读的绑定关系
7. **未使用上游编排层**：`packages/workflow`、`plan`、`goal`、`todo`、`jobs`、`schedule` 存在但未利用

### 3.4 推荐技术路线（深度审查建议）

1. **保留** Cordis 扩展方式和全部 62 个工具；修复表现层。用稳定槽位 API 替换 DOM hack
2. **提升 3 个工作面为一等客户端插件**（`plugins.tab` 或导航槽位）：
   - ① **文件工作区**：office registry + 上游 document preview/attachment 合并；拖放、目录树、版本时间线
   - ② **任务看板**：task-records 渲染为任务/证据面板；迁移到 `ctx.sessions`/goal/todo
   - ③ **能力中心**：`ctx.tools` 内省 + capability-evolution registry + plugin-creator 安装流；专家调度状态
3. **统一任务主轴**：task id → files → tool runs → evidence → deliverables（复用 `packages/deliverables` + `present`）
4. **路径配置化**：所有 `F:/...` 默认值 → 环境/profile 配置（`KONGCHAIN_OFFICE_ROOT` 模式扩展）
5. **复用上游编排**：workflow/plan/goal/jobs 做多步骤任务，而非提示词按钮
6. **桌面端**：现有品牌 Electron 构建；演示模式（合成财务数据 + 预置任务）作为旗舰流程
7. **Skill 机器可读绑定**：frontmatter 关联 skill → required tools，由 `kongchain_validate_extensions` 验证

### 3.5 界面层级（目标）

```
┌─────────────────────────────────────────────────────┐
│  控链 KongChain  工作区 [抗联]  标准模式  开发者模式   │
├────────┬────────────────────────────────────────────┤
│        │                                            │
│ 侧边栏  │  主工作区（按导航切换）                      │
│        │                                            │
│ 📁 文件 │  ├─ 工作台（默认）                          │
│ 📋 任务 │  │   文件列表 / 活跃任务 / 快捷操作          │
│ 🤖 能力 │  ├─ 文件空间                               │
│ 💬 对话 │  │   文件管理 / 预览 / 编辑 / 版本           │
│ ⚙ 开发  │  ├─ 任务中心                               │
│        │  │   任务列表 / 状态 / 证据 / 交付            │
│        │  ├─ 能力中心                               │
│        │  │   工具 / Skill / 插件 / 专家              │
│        │  ├─ 对话（保留，但非主界面）                  │
│        │  └─ 开发者模式                              │
│        │      代码编辑 / 测试 / 版本控制              │
└────────┴────────────────────────────────────────────┘
```

### 3.3 技术实现方式

| 层 | 实现 | 说明 |
|---|---|---|
| Agent Runtime | 完全复用 Harness | 不修改 Agent Loop |
| 工具系统 | 复用 `ctx.tools.register` | 已有 63 个工具 |
| 插件系统 | 复用 `cordis.patch.yml` + bundle | 已有 16 个插件 |
| Skill 系统 | 复用 `dsh-skill-filesystem` | 19 个 Skill，需配套工具 |
| UI 壳 | **新增 workspace shell** | 通过 `ctx.slots` 注入一级导航 |
| 文件管理 | 扩展 `kongchain-office-workspace` | 从插件页 tab 升级为一级导航 |
| 任务管理 | 扩展 `kongchain-task-records` | 从工具升级为任务看板 UI |
| 能力中心 | 扩展 `kongchain-workbench` | 从品牌插件升级为能力管理 |
| 桌面端 | 复用 `apps/desktop` | 已打包成功 |

### 3.4 关键技术决策

1. **Workspace Shell**：通过 `ctx.slots.inject('sidebar.navigation')` 或等效槽位注入一级导航，不重写前端
2. **文件工作区**：复用 `workspace-files` API + `kongchain-office-workspace` 注册表，升级 UI 为独立页面
3. **任务看板**：复用 `kongchain-task-records` 的 JSONL 存储，增加查询/展示 UI
4. **能力中心**：复用 `kongchain-tools` 的扩展目录 + `kongchain-experts` 的专家目录
5. **对话保留**：作为工具（可被工作台调用），不是主界面

---

## 四、能力包规划（六类专业能力）

| 能力包 | Skill | Tool | 状态 |
|---|---|---|---|
| office-file | office-file 规范 | document_extract, office_file_read, office_file_export | ✅ 已有工具 |
| financial-analysis | financial-data-analysis | finance_profile, finance_analyze, financial_compare | ✅ 已有工具 |
| accounting-review | accounting-document-review | voucher_reconcile, rule_check | ✅ 已有工具 |
| internal-control-audit | internal-control-basics | evidence_pack, audit_workpaper, report_generate | ✅ 已有工具 |
| report-workpaper | working-paper-drafting | report_generate, finance_deliver | ✅ 已有工具 |
| tax-policy-research | tax-policy-research | web_search, web_fetch, document_extract | ⚠️ 需新建 Skill |

**原则**：Skill 是知识和规范，Tool 是真实可调用的能力。每个 Skill 必须配套至少一个可执行工具。

---

## 五、后四阶段技术路线

| 阶段 | 目标 | 核心交付 |
|---|---|---|
| **第二阶段** | 工作台重构 | Workspace Shell 一级导航、文件空间独立页面、任务看板 UI |
| **第三阶段** | 专业能力闭环 | 六类能力包完整实现、Skill+Tool 配套、端到端演示 |
| **第四阶段** | 桌面产品化 | 演示保障模式、首启体验、数据持久化、进程管理 |
| **第五阶段** | 集成验收 | 干净环境安装验收、全量测试、交付包、安全审计 |

---

## 六、与上游 Harness 的关系

- **不修改**：Agent Loop、会话管理、工具系统、插件系统、Skill 系统、模型适配层
- **不复制**：不创建平行 Agent Runtime
- **扩展**：所有控链功能在 `extensions/` 和 `docs/kongchain/` 实现
- **上游改动**（需标注）：
  - `apps/desktop/scripts/electron-builder-config.mjs`（品牌配置）
  - `apps/desktop/scripts/prepare-dsh.ts`（本地打包 workaround）
  - `apps/desktop/scripts/smoke-packaged-runtime.ts`（productName 解析）
  - `apps/web/vite.config.ts`（构建 workaround）
  - `apps/desktop/src/locale.ts`（品牌文案）

---

## 七、基线测试计划

运行当前项目基线测试，记录结果：

1. `pnpm run test`（上游完整测试）
2. 自有扩展测试（每个扩展的 `test/` 目录）
3. 启动检查（Web + Desktop）
4. 记录结果到 `docs/KONGCHAIN_CAPABILITY_MATRIX.md`
