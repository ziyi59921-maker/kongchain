# @kongchain/brand

控链 Web 客户端品牌插件。只占用侧边栏品牌槽位（`sidebar.brand.mark`、`sidebar.brand.name`），不重写前端、不替换应用根、不读取其他插件 DOM。

## 清单

- 版本：`0.1.0`
- Host 半：`index.js`（空 `apply`）
- Client 半：`client.js`（`window.__ModuleLoader__` 懒工厂，id = `@kongchain/brand`）
- 客户端清单：`dsh.client.platform=web`、`immediately=true`、`inject` renderer + sidebar
- 依赖：浏览器模块表提供的 `react`；无第三方依赖
- 生效方式：`@kongchain/bundle` patch 插入 `kongchain-brand` 行，客户端加载后占用品牌槽位

## 注意

- 浏览器标题由构建期 `DSH_CLIENT_TITLE` 决定，不在本插件范围内；本插件只负责侧边栏品牌。
- 卸载/禁用该行后，侧边栏回到 Harness 默认 fallback，不影响聊天、工具或会话。
