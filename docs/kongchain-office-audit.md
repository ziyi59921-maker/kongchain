# 控链 Office / 文件能力审计

- 项目：`F:\KongChain`
- Harness：`0.2.2-alpha.2`
- 审计日期：2026-10-30

## 1. 已确认存在的能力

| 能力 | 证据 | 状态 |
|---|---|---|
| 文件上传 | `packages/client/file-upload`、Composer 附件、`fileUploads` Remote | 已有 |
| 本地文件读取 | `packages/api/workspace-files`、`read/readBytes/list/stat/changes` | 已有，受 scope 限制 |
| 文件预览 | `ui-sidebar-documentpreview`：Office、Spreadsheet、Markdown、PDF、HTML、图片、文本 | 已有 |
| Office→PDF | `@deepseek-ai/dsh-office-to-pdf` + LibreOffice kit | 已有 |
| Excel 解析 | `ui-sidebar-documentpreview` 依赖 `xlsx`；工具侧 openpyxl/finance_tools | 已有 |
| Word/PDF 文本 | python-docx、pdfplumber、document_extract | 已有 |
| 任务/附件/历史 | Session、fileUploads、deliverables、任务记录 | 已有 |
| 沙箱与权限 | workspace-files、文件 sandbox、开发者模式 guard | 已有 |

实际验证过：CSV 导入/读取/保存新版本/导出；XLSX/DOCX/PDF 文本与表格读取；PDF 文本层限制；原始文件不覆盖。

## 2. 缺口

1. Univer：未发现已集成 SDK；本批未引入。
2. ONLYOFFICE：未发现集成；商业/社区版许可与服务部署需单独评估。
3. XLSX 完整编辑：公式、格式、合并单元格、图表、日期保真未验证。
4. PDF 标注/编辑：未实现，可靠预览优先。
5. 文件资源与任务关联：已由 `office-workspace` 注册表补上，但原生 workspaceFiles/preview 仍是只读。
6. 桌面本地持久化：Electron/DSH_HOME/profile 已有；办公文件注册表使用 `F:\KongChain-logs\office`。

## 3. 处理路线

- 优先复用现有 `workspace-files`、`office-to-pdf`、Sidebar 预览、openpyxl/python-docx/pdfplumber。
- 第一阶段：CSV 编辑/版本化 + Office/PDF 元数据/预览 + Agent 协同。
- XLSX 深编辑需要选择许可证兼容的 SDK 并验证导入/导出保真后才引入。
