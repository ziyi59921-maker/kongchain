# 第 4 批验证记录：开发者模式与自修改工作区

- 日期：2026-10-29（Asia/Shanghai）
- 基线：DSH `f3803c96`；本批起点 `108c1e8`，检查点提交 `97d9c7a`
- 项目：`F:\KongChain`
- 模型：DeepSeek 官方 API（不使用 Agentied 日卡）
- 本轮未修改 Agent Loop、上游权限系统或系统级配置

## 1. 复用与新增

- 复用官方 `ctx.tools.guard`、`ctx.tools.register`、`commands.register`、`dsh plugin` 与 sandbox/permission 机制。
- 新增 `extensions/kongchain-dev-mode/`：
  - `/developer status|on|off|core on|core off`（Web 斜杠命令入口）；
  - `kongchain_dev_mode` / `kongchain_dev_policy`；
  - `kongchain_dev_diff` / `kongchain_dev_snapshot` / `kongchain_dev_rollback` / `kongchain_dev_restore`；
  - `kongchain_dev_test` / `kongchain_dev_command` / `kongchain_dev_reload`。
- 状态：`F:\KongChain\.kongchain\developer-mode.json`（不进入版本库）。

## 2. 权限与工具层执行

| 范围 | 策略 |
|---|---|
| A `extensions/` | 开发者模式开启时允许写 |
| B `docs/kongchain/` | 允许写 |
| C `packages/`、`apps/` 等 | 仅 `coreAuthorized=true` 时允许；要求单独记录核心补丁与构建回归 |
| D 其他目录、凭据、生产系统 | 拒绝 |

实际 guard 测试：

1. 关闭状态调用 `write` 创建 `extensions/kongchain-dev-guard-test.txt`：
   - `tool_result: error`；
   - `Error: KongChain developer mode is off. Run /developer on ...`；
   - 文件不存在。
2. 调用 `kongchain_dev_mode enable confirm=true` 后同一路径 `write`：`completed`，文件创建。
3. 调用 `kongchain_dev_mode disable` 后再写第二个文件：再次 `error`，文件未创建。
4. 状态切换由工具层 guard 即时生效，不是提示词约定。

## 3. UI 入口

Web KongChain profile（3083）加载 `[kongchain-dev-mode] loaded; guard active`。在 UI 会话发送：

```
/developer status
```

会话事件实际记录：

```json
{"type":"command/run","data":{"name":"developer","args":" status"}}
{"type":"command/done","data":{"kind":"success","text":"开发者模式：开启；核心授权：否"}}
```

这证明入口真实连到命令服务与状态，而不是静态按钮。

## 4. 验收 1–3：修改插件、测试失败修复、diff

真实 DeepSeek Headless 会话对 `invoice-duplicate-check` 执行：

- 版本 0.1.1 → **0.1.2**；
- 新增可配置参数 `caseSensitive`（boolean，默认 `true`；false 时 `invoiceNo` 忽略大小写）；
- 只修改已有文件，不新增测试文件；
- 先加入预期失败用例：`kongchain_dev_test` 返回 **21 pass / 4 fail**；
- 修复实现后：**25 tests / 25 pass / 0 fail**；
- `kongchain_plugin_check` 四项全过；`kongchain_validate_extensions` `ok: true`（10 个扩展、10 个技能）；
- `kongchain_dev_diff` 显示 8 个文件、+160/−15（含本批 dev-mode 行；插件文件 6 个）。

日志：`F:\KongChain-logs\dev-accept-1.jsonl`。

## 5. 验收 4：回滚与恢复

智能体首次使用 `kongchain_dev_snapshot` 时发现真实缺陷：`run()` 输出被截断到 8000 字符，`patch.diff` 从 hunk 中间开始，`git apply` 失败。它没有假装成功，而是：

- 用 `git stash push/pop` 做了等价回滚/恢复验证（0.1.1 时 19 测试通过，0.1.2 恢复后 25 测试通过）；
- 修复 `extensions/kongchain-dev-mode/src/index.js`：`run(..., limit=0)` 保存完整补丁、`maxBuffer=64MB`、rollback/restore 接受快照目录或 `patch.diff` 路径；
- 该修复在下一个进程生效。

修复后再次用真实 DeepSeek 会话验证：

- 只修改 `invoice-duplicate-check/README.md` 追加一行；
- `kongchain_dev_snapshot(label=readme-rollback)` → `ok: true`、`patchEmpty: false`；
- `kongchain_dev_rollback(snapshot目录)` → `ok: true`，`git diff` 为空，追加行消失；
- `kongchain_dev_restore(snapshot目录)` → `ok: true`，`git diff` 重新显示该行。
- 验收用临时行已删除，README 保持 0.1.2 正式内容。

日志：`F:\KongChain-logs\dev-rollback-tool.jsonl`。

## 6. 验收 5：控链自有源码 + 测试

- 修改 `extensions/kongchain-dev-mode/src/index.js`：导出 `developerPathAllowed(target, state)`，用于 A/B/C/D 路径策略测试；
- 新增 `extensions/kongchain-dev-mode/test/policy.test.mjs`：
  - A `extensions/` 允许；
  - B `docs/kongchain/` 允许；
  - C `packages/` 未授权拒绝、授权允许；
  - D 工作区外拒绝；
- `node --check` 通过；`node --test test/policy.test.mjs` → **4/4 pass**。
- 这是控链自有源码的真实修改与测试，不是代码片段。

## 7. 重载与回滚结论

- `kongchain_dev_reload` 如实返回 `restart-profile`：插件模块源码变更不能被配置型 HMR 热替换；不能谎称已生效。
- 快照是整仓 tracked diff（本轮实现），若工作区存在多个无关改动，回滚会影响全部；验收时保持工作区干净，只改一个文件。
- 回滚点位于 `F:\KongChain-logs\dev-snapshots\`；`.kongchain/`、`dev-snapshots` 不进入版本库。

## 8. 验收对照

| 验收项 | 结果 |
|---|---|
| 界面有开发者模式入口 | ✅ Web `/developer` 命令，状态真实 |
| 开启后可读/改/测/看 diff | ✅ 插件 0.1.2、25 测试、diff、快照 |
| 关闭后禁止源码写操作 | ✅ guard 拦截，文件未落盘 |
| 修改当前插件新增可配置参数 | ✅ `caseSensitive` |
| 测试失败后自行修复 | ✅ 21/4 → 25/25 |
| 展示代码差异与测试结果 | ✅ `kongchain_dev_diff` + 测试输出 |
| 回滚再恢复 | ✅ 修复后工具真实通过 |
| 修改控链自有源码并测试 | ✅ dev-mode 策略函数 + 4 测试 |

## 9. 限制

1. 快照/回滚覆盖整个 tracked 工作区，未按路径过滤；多任务并行时需先保持工作区干净。
2. 核心源码（C）虽已实现授权开关，但本轮未实际修改 `packages/`；核心改动仍需单独构建/回归。
3. `pwsh` 使用命令模式拦截危险操作，不是系统级沙箱；真正的 OS 权限仍由 Harness sandbox/permission 控制。
4. 未实现客户端按钮式开关，入口为 Web 斜杠命令 + agent 工具；界面文案为真实命令结果。
