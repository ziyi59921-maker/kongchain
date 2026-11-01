# 第 3 批验证记录：自然语言驱动的插件创造与自我扩展

- 日期：2026-10-29（Asia/Shanghai）
- 基线：DSH `f3803c96`；进入本批前控链提交 `406f959`
- 项目：`F:\KongChain`
- 模型：DeepSeek 官方 API（`deepseek-v4-pro` / `deepseek-flash` 可用；本次真实调用使用官方 Key，不使用 Agentied 日卡）
- 未修改 `packages/`、`apps/`、Agent Loop、会话格式或上游锁文件

## 1. 复用的官方能力

| 能力 | 当前版本事实 |
|---|---|
| Creator Mode | Web agent preset `cordis`（`presets/cordis.patch.yml`）提供 `tool-cordis` 只读 runtime inspection；Standard/Creator 模式提供 Plugin Manager |
| Plugin Manager | `@deepseek-ai/dsh-plugin-manager` 服务 + `plugin_manager` 工具（install_bundle/remove_bundle/set_plugin/list_*） |
| 安装/更新/卸载 | `plugin_manager.install_bundle`（本地绝对目录亦可）与 CLI `dsh plugin --profile ... add link:<dir>`；bundle reconcile 自动加入 profile |
| 启用/禁用/重载 | `plugin_manager` 的 `set_plugin`/`set_bundle`；HMR 可用时立即应用，否则 `restart-required` |
| 插件开发技能 | `cordis-plugin-development`、`cordis-composition-reference` 等 |
| 清单格式 | 标准包 `package.json` + `dsh.bundle.patch` + Cordis patch；本批生成插件遵循该格式 |

结论：没有重写插件管理器。控链只增加“插件工坊”辅助工具（scaffold/check/install/rollback），安装仍走官方 `dsh plugin` bundle 机制。

## 2. 新增控链插件工坊

`extensions/kongchain-plugin-creator/`：
- `kongchain_plugin_status`：列生成插件、profile 状态、官方 Creator 能力；
- `kongchain_plugin_scaffold`：生成 `package.json`、`cordis.patch.yml`、`src/index.js`、`src/check.js`、`test/*.test.mjs`、`README.md`；
- `kongchain_plugin_check`：manifest、bundle patch、`node --check`、`node --test`；
- `kongchain_plugin_install`：检查→备份→官方 `dsh plugin` 安装/更新→失败恢复；
- `kongchain_plugin_rollback`：恢复最近备份。
- 技能 `extensions/kongchain-skills/skills/kongchain-plugin-creator/SKILL.md`；
- 工作区 `extensions/kongchain-plugins/`，`.backups/` 与 `.test-fixtures/` 不进入版本库。

## 3. 验收过程与结果

### 3.1 用户对话提出需求

真实 Headless 会话（DeepSeek Key，加载控链 bundle + 插件工坊）提出：

> 实现一个采购发票重复检查插件……检查供应商、发票号码和金额，并允许配置匹配条件。

会话实际调用：`skill(kongchain-developer)`、`skill(kongchain-plugin-creator)`、`kongchain_runtime_info`、`kongchain_extension_catalog`、`kongchain_plugin_status`、`kongchain_developer_policy`、`kongchain_plugin_scaffold`，然后读/写插件文件。
日志：`F:\KongChain-logs\create-plugin.jsonl`。

### 3.2 创建、测试、安装（0.1.0）

- 目录：`extensions/kongchain-plugins/invoice-duplicate-check/`；
- 文件：`package.json`、`cordis.patch.yml`、`src/check.js`、`src/index.js`、`test/check.test.mjs`、`README.md`；
- 测试骨架与业务测试实际执行；
- `kongchain_plugin_install` 首次安装到 `kongchain-demo`；
- **发现真实问题**：真实 profile 加载时报
  `JsonSchemaError: schema.properties.duplicates.items.properties.key.additionalProperties must be a boolean`，工具未注册。

### 3.3 修改同一插件（0.1.1，不新建）

真实 Headless 会话要求“修改同一个目录，不要新建插件”，智能体：
- 修复 output schema（`key` 改为明确 properties，`additionalProperties: false`）；
- 增加 `match` 校验：只允许 `supplier`/`invoiceNo`/`amount` 的非空子集，未知字段/空 match 返回可读错误；
- 新增 `test/index.test.mjs`（apply 注册 smoke + 错误路径）；
- `kongchain_plugin_check` 返回 `ok: true`，**19 个测试全部通过**（12+7）；
- `kongchain_plugin_install` 返回 `mode: update-in-place`、`version: 0.1.1`；
- profile 依赖仍是同一路径，bundles 仍为 base + headless + 本插件，没有生成无关新插件。
日志：`F:\KongChain-logs\update-plugin.jsonl`。

### 3.4 真实模型实际调用新插件

`kongchain-demo` profile 依赖与 bundles：

```json
{
  "dependencies": {
    "@kongchain-plugin/invoice-duplicate-check": "link:F:/KongChain/extensions/kongchain-plugins/invoice-duplicate-check"
  },
  "dsh": {
    "profile": {
      "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-headless", "@kongchain-plugin/invoice-duplicate-check"]
    }
  }
}
```

真实 DeepSeek Headless 会话 1（默认三项匹配）：

```
tool_call: invoice_duplicate_check
rows: 甲公司/INV-001/1000, 乙公司/INV-002/2000, 甲公司/INV-001/1000
tool_result: completed
duplicates: [{ key: {supplier: 甲公司, invoiceNo: INV-001, amount: "1000"}, count: 2 }]
checked: 3, match: ["supplier","invoiceNo","amount"]
```

日志：`F:\KongChain-logs\demo-call2.jsonl`。

真实 DeepSeek Headless 会话 2（可配置 `match`，仅发票号）：

```
tool_call: invoice_duplicate_check
match: ["invoiceNo"]
rows: 甲公司/INV-001/1000, 乙公司/INV-001/2000, 丙公司/INV-003/500
tool_result: completed
duplicates: [{ key: {invoiceNo: "INV-001"}, count: 2 }]
```

日志：`F:\KongChain-logs\demo-call3.jsonl`。

说明：智能体自己的会话内无法启动新 profile（workspace-write 沙箱拒绝 pnpm 管道/profile 根文件写入）；以上真实调用由 Lead 在 danger-full-access shell 中执行，仍使用真实 Harness profile、真实插件和真实 DeepSeek Key。

### 3.5 模拟安装失败与旧版本保留

- 构造损坏插件夹具 `extensions/kongchain-plugins/.test-fixtures/broken-plugin-demo`（入口语法错误）；
- 真实 Headless 会话调用 `kongchain_plugin_install(dir=...broken..., profile=kongchain-demo)`：
  - 返回 `ok: false`、`stage: "check"`；
  - `node-check` 与 `tests` 失败，未进入备份/安装；
- 事后检查：
  - `kongchain-demo/package.json` 依赖与 bundles 未变；
  - 原插件 `0.1.1` 的 `kongchain_plugin_check` 仍 `ok: true`；
  - 原插件真实调用仍成功（见 3.4）。
日志：`F:\KongChain-logs\broken-install.jsonl`。

## 4. 验收对照

| 验收项 | 结果 |
|---|---|
| 1 用户对话提出新增插件需求 | ✅ 真实 DeepSeek 会话 |
| 2 智能体创建插件文件 | ✅ scaffold + 读/写文件 |
| 3 生成测试 | ✅ 单元/行为/注册测试 |
| 4 测试实际执行 | ✅ 19/19 通过 |
| 5 插件被安装/启用 | ✅ `kongchain-demo` 依赖 + bundles |
| 6 智能体实际调用新插件 | ✅ 默认匹配与 `match` 配置两次真实调用 |
| 7 修改现有插件而非新建 | ✅ 同目录 0.1.0→0.1.1，update-in-place |
| 8 模拟安装失败，旧版本仍存在 | ✅ 检查阶段拦截，profile 未变，旧 0.1.1 可用 |

## 5. 限制

1. 用户授权的自动安装范围仅限 `@kongchain-plugin/*` 自有低风险插件；未测试第三方/未知来源插件。
2. 生成插件的真实调用由 Lead shell 执行；智能体自身会话的 workspace-write 沙箱不允许启动新 profile/监听端口，这是预期权限边界，不能视为插件失败。
3. 测试数据为合成发票；重复组只是待核实线索，不直接等同于违规、重复付款或舞弊。
4. 未实现插件市场/远程分发；`.backups/`、`.test-fixtures/` 不进入版本库。
