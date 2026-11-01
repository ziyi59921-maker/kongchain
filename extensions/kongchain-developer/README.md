# @kongchain/developer

控链开发者模式边界与扩展静态校验。宿主级 Cordis 插件，仅依赖 Node 内置模块。

## 提供

- `kongchain_developer_policy`：返回开发者模式允许写入的目录（`extensions/`、`docs/kongchain/`）、禁止修改的上游目录，以及验证命令。它只报告策略，不授予权限。
- `kongchain_validate_extensions`：只读校验
  - `docs/kongchain/PRODUCT_SPEC.md` 存在且包含产品定义与采购付款边界；
  - bundle patch 挂载 core/tools/developer；
  - 每个 `extensions/kongchain-*` 包的 `package.json`/`README.md`；
  - 每个 `SKILL.md` 的 frontmatter。

## 清单

- 版本：`0.1.0`
- 入口：`src/index.js`（ESM，无构建步骤）
- 依赖：无第三方运行时依赖；`inject: ['tools']`
- 只读：不写文件、不执行子进程

## 边界

开发者模式的实际文件系统边界由 Harness 的 sandbox/permission preset 执行，不由本插件执行。插件只提供可检查的策略描述与静态校验结果，避免“插件自授权”。
