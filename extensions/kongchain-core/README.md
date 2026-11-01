# @kongchain/core

控链运行时身份插件。宿主级（host plane）Cordis 插件，仅依赖 Node 内置模块。

## 提供

- 工具 `kongchain_runtime_info`：返回 KongChain 版本、上游 commit、工作区根目录、当前 DSH profile、全部 `extensions/kongchain-*` 包清单。
- 启动日志：`[kongchain-core] loaded` 与 `[kongchain-core] registered tool ...`，用于确认插件已被运行环境实际加载。

## 清单

- 版本：`0.1.0`
- 入口：`src/index.js`（ESM，无构建步骤）
- 依赖：无第三方运行时依赖；需要 Harness 的 `tools` 服务（`inject: ['tools']`）
- 只读：不写文件、不执行子进程、不访问网络

## 挂载

由 `@kongchain/bundle` 的 patch 以 `@kongchain/core` 包名挂载。删除或禁用该行只会移除本插件，不影响 Agent Loop、会话、模型适配或上游工具。
