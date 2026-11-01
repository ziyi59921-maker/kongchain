# @kongchain/tools

控链扩展发现工具。宿主级 Cordis 插件，仅依赖 Node 内置模块。

## 提供

- 工具 `kongchain_extension_catalog`：返回
  - 全部 `extensions/kongchain-*` 包的目录名、npm 名、版本、说明、是否声明 `dsh.bundle`；
  - `@kongchain/bundle` 的版本、patch 路径与 patch 是否存在；
  - `extensions/kongchain-skills/skills/` 下每个 `SKILL.md` 的 name/description/路径/合法性。

## 清单

- 版本：`0.1.0`
- 入口：`src/index.js`（ESM，无构建步骤）
- 依赖：无第三方运行时依赖；`inject: ['tools']`
- 只读：不写文件、不执行子进程、不访问网络

## 用途

在新增工具、技能或 bundle 行之前，让智能体先读取真实目录与清单，避免猜测路径；也用于验证“扩展已被运行环境识别”的静态证据。
