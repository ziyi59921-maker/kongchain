# @kongchain/bundle

控链 Profile Bundle。它把控链扩展组合到官方 `dsh-base` + `dsh-web-app` 之上，不复制、不替换 Harness 的核心能力。

## 组合内容

| 行 | 插件 | 说明 |
|---|---|---|
| `kongchain-core` | `@kongchain/core` | 运行时身份与 `kongchain_runtime_info` |
| `kongchain-tools` | `@kongchain/tools` | 扩展/技能发现工具 |
| `kongchain-developer` | `@kongchain/developer` | 开发者模式边界与静态校验 |
| `kongchain-professional` | `@kongchain/professional` | 内控专业系统指令 section（order 100） |
| `kongchain-brand` | `@kongchain/brand` | Web 侧边栏品牌槽位（控链 KongChain） |
| `kongchain-dev-mode` | `@kongchain/dev-mode` | 开发者模式状态、工具层 guard、diff/快照/回滚、/developer 命令 |
| `kongchain-internal-control-tools` | `@kongchain/internal-control-tools` | 文档提取、财务比对、规则、证据包、报告 |
| `kongchain-capability-evolution` | `@kongchain/capability-evolution` | 能力发现、登记、日志、安装核验、更新策略 |
| `kongchain-skill-filesystem` | `@deepseek-ai/dsh-skill-filesystem` | 读取 `extensions/kongchain-skills/skills` 的全局技能 provider |
| `system-prompt` | 覆盖既有行 | KongChain persona（保留 Harness identity，默认 true） |

## 清单

- 版本：`0.1.0`
- 清单字段：`dsh.bundle.patch` → `./cordis.patch.yml`
- 依赖的 profile 包：`@kongchain/core`、`@kongchain/tools`、`@kongchain/developer`、`@kongchain/professional`、`@kongchain/brand`、`@kongchain/bundle` 自身
- 不依赖：任何第三方运行时包；技能由磁盘目录提供
- 模型配置不属于本 bundle：由 profile 的 `cordis.patch.yml` 或用户在设置中配置

## 安装到 profile

```powershell
$env:DSH_HOME='F:\KongChain-home'
Set-Location F:\KongChain
pnpm dsh plugin --profile kongchain add `
  link:F:/KongChain/extensions/kongchain-core `
  link:F:/KongChain/extensions/kongchain-tools `
  link:F:/KongChain/extensions/kongchain-developer `
  link:F:/KongChain/extensions/kongchain-professional `
  link:F:/KongChain/extensions/kongchain-brand `
  link:F:/KongChain/extensions/kongchain-skills `
  link:F:/KongChain/extensions/kongchain-bundle
```

安装后 profile 的 `dsh.profile.bundles` 末尾应出现 `@kongchain/bundle`。验证：

```powershell
pnpm dsh --profile kongchain --dump-config | Select-String -Pattern 'kongchain'
```

## 行为

- 加载：由 Loader 在 profile 组合时应用 patch；host 级插件在服务就绪后注册工具/提示 section；客户端插件占用侧边栏品牌槽位；技能 provider 在 `skills` 服务就绪后注册。
- 卸载：从 profile 移除本 bundle 并重启即可；插件注册通过 Cordis effect 自动清理，侧边栏回到官方 fallback。
- 不触碰：`packages/`、`apps/`、Agent Loop、会话格式、模型适配、Web UI 源码。
