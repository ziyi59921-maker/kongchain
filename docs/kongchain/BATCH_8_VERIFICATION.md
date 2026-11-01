# 第 8 批验证记录：合同条款标记插件（场景 B）

- 日期：2026-10-30（Asia/Shanghai）
- 项目：`F:\KongChain`
- Harness：`0.2.2-alpha.2`
- 插件：`@kongchain-plugin/contract-term-tags` 0.1.0，工具 `contract_term_tags`
- profile：`kongchain-demo`（`F:\KongChain-home\profiles\kongchain-demo`）

## 1. 复用判断

`kongchain_plugin_inventory` 与 `kongchain_capability_discover` 实际执行结果：现有插件只有 `csv-statistics`、`invoice-duplicate-check`、`text-toolkit`（`text_stats` 统计字符/单词/词频，不含关键词命中与位置），`contract-management` 是提示词技能而非确定性工具，因此不存在等效能力，判定为新建。

## 2. 实现与测试

- `kongchain_dev_mode enable confirm=true` → `enabled: true`，`coreAuthorized: false`；
- `kongchain_plugin_scaffold` 创建 `extensions/kongchain-plugins/contract-term-tags`；
- 纯逻辑 `src/check.js`：`contractTermTags(text, keywords)` 返回 `{ textLength, totalHits, keywords: [{ keyword, count, firstIndex, snippet }] }`；
- 匹配口径：字面量子串、不区分大小写、不重叠计数、正则元字符转义、位置按 Unicode 码点、片段窗口前后 12/18 码点并折叠空白；
- 工具入口 `src/index.js`：`inject: ['tools']`，JSON Schema 参数 `text`（必填）+ `keywords`（可选，`minItems: 1`），渲染为中文文本块并给出“命中≠条款完整有效”的提示；
- `kongchain_plugin_check` → `ok: true`，`node --check` 通过，**24 tests / 24 pass / 0 fail**（`check.test.mjs` 15 + `tool.test.mjs` 9）；
- 覆盖：空文本、中文合同文本、英文大小写、多关键词顺序与重复关键词、不重叠计数、正则元字符、emoji 码点位置、片段截断与空白折叠、未命中关键词、非法输入（非字符串文本、非数组/空数组/非字符串/空字符串关键词）、工具注册与渲染。

## 3. 安装与注册证据

| 项 | 实际结果 |
|---|---|
| `kongchain_plugin_install` | `ok: true`、`stage: installed`、mode `install`、install 退出码 0 |
| profile dependency | `link:F:/KongChain/extensions/kongchain-plugins/contract-term-tags` |
| bundle 列表 | `@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-headless`、`invoice-duplicate-check`、`csv-statistics`、`text-toolkit`、`contract-term-tags` |
| 备份 | `F:\KongChain\extensions\kongchain-plugins\.backups\contract-term-tags-1793319599894` |
| `kongchain_plugin_version` | 本地 0.1.0、`installed: true`、`enabled: true`、Harness 0.2.2-alpha.2 |
| `kongchain_capability_verify` | `installed: true`、`bundleSelected: true`、`registration: requires-new-process` |
| `kongchain_plugin_inventory runTests=true` | 0.1.0、工具 `contract_term_tags`、`test.status: pass`、24/24、installed/enabled、备份可用 |
| `kongchain_validate_extensions` | `ok: true`，12 个扩展包、16 个技能无问题 |

`dsh --profile kongchain-demo --dump-config` 的实际组合结果末尾包含：

```yaml
# == @kongchain-plugin/contract-term-tags
- id: contract-term-tags
  name: >-
    file:///F:/KongChain-home/profiles/kongchain-demo/node_modules/@kongchain-plugin/contract-term-tags/src/index.js
```

这说明 bundle patch 已进入 profile 组合树；但组合成功不等于已挂载，当前进程也不会热加载。

## 4. 维护日志

`F:\KongChain-logs\plugins\kongchain-plugin-contract-term-tags.jsonl` 已写入三条事件：`created`（含版本、来源、理由、文件清单、依赖、权限、激活方式）、`tested`（24/24、检查命令）、`installed`（profile、dependency、bundle 列表、备份路径、`activation: requires-new-process`）。

## 5. 未完成与限制

1. 本轮没有新会话真实调用 `contract_term_tags`：`kongchain_plugin_install`、`--dump-config` 与单元测试都只证明“已安装、已组合、逻辑正确”，不证明模型侧已可用；需要新进程/新会话后才能调用。
2. 沙箱内 `node --test test/` 因测试运行器为每个文件派生子进程而返回 `spawn EPERM`，改为逐文件 `node test/*.test.mjs` 与 `kongchain_plugin_check` 执行，两者结果一致（24/24）。
3. `matching is case-insensitive` 只覆盖 JavaScript 正则的 Unicode 简化大小写折叠，`ß`/`SS` 这类完整折叠不覆盖；不做分词、同义词与条款结构解析。
4. 首次执行测试时 `render` 用例把文本长度写成 18（实际 17），是断言错误而非实现错误，修正后 24/24 通过。
5. 插件清单仍显示 `permissions: not-declared` 与 `harness: not-declared`，这是本仓库本地插件的既有状态，不是本轮引入的问题；未伪造声明。
