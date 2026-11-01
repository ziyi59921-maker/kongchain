# @kongchain/professional

控链内控专业系统指令插件。宿主级 Cordis 插件，向 `systemPrompt` 注册一个有序 section，不把所有知识塞进 persona。

## 提供

- 系统提示 section `kongchain:professional`（order 100）：
  - 专业方向：会计财务基础、内控原则、采购付款、合同/发票/验收/付款资料、数据核对与异常筛查、证据与底稿、审计术语、不确定性说明；
  - 六条专业纪律：不编造证据、不把异常等同违规/舞弊、说明限制、精确计算交给程序工具、专业判断说明依据、支持内控范围外的开放任务；
  - 开放任务行为：多步骤执行、结果检查、失败汇报、按需扩展。

详细方法放在 `@kongchain/skills` 的技能文件里，避免超长系统提示词。

## 清单

- 版本：`0.1.0`
- 入口：`src/index.js`（ESM，无构建步骤）
- 依赖：Harness `systemPrompt` 服务（`inject: ['systemPrompt']`）；无第三方依赖
- 只读：不写文件、不执行子进程、不访问网络

## 安装

由 `@kongchain/bundle` 的 patch 以 `@kongchain/professional` 包名挂载；profile 依赖需以 `link:` 安装该包。
