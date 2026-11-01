# KongChain 插件工坊工作区

本目录只存放由控链插件工坊/智能体生成的自有插件 Bundle。每个子目录必须包含：

- `package.json`（含 `dsh.bundle.patch`）
- `cordis.patch.yml`
- `src/index.js`
- `test/*.test.mjs`
- `README.md`

生成插件通过官方 `dsh plugin --profile ... add link:<dir>` 安装；不要手工改核心源码。

`.backups/` 由安装工具维护，不属于插件；不要提交或手工修改。
