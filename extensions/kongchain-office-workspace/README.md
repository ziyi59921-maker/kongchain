# @kongchain/office-workspace

控链文件空间：连接真实本地文件注册表、CSV 编辑/版本化、Office/PDF 元数据读取和 AI 协同入口。

## 已支持

- 五个面向 Agent 的工具：`office_file_register`、`office_file_list`、`office_file_read`、`office_csv_save_version`、`office_file_export`。
- 真实文件注册表：文件名、类型、大小、修改时间、来源、SHA-256、版本、任务关联。
- CSV：打开、编辑、保存为**新版本**（原文件只读）。
- XLSX/DOCX/PDF：元数据与内容读取（PDF 文本层），预览依赖现有 Harness `ui-sidebar-documentpreview`/`office-to-pdf`。
- AI 协同：把文件路径和任务写入原生任务输入区，由真实 Agent/工具读取计算。
- 导出：复制到授权输出目录，拒绝覆盖。
- 无 Web 服务器的 profile（如 headless）同样注册全部文件工具：本地预览/注册表 HTTP 路由只在存在 `webServer` 服务时挂载。

## 配置

| 项 | 说明 |
| --- | --- |
| `KONGCHAIN_OFFICE_ROOT` | 注册表与版本文件根目录，默认 `F:/KongChain-logs/office`。需为可写目录。 |
| 授权路径根 | office 根目录，以及宿主进程的启动工作目录（会话工作区）。两个根以外的路径一律拒绝。 |

## 未支持

- Univer/ONLYOFFICE 深度编辑器未集成；当前最小编辑器只编辑 CSV。
- XLSX 公式、格式、合并单元格、图表保真未验证。
- PDF 标注/编辑未实现，仅可靠预览。
- 本地功能不需要模型 API；AI 任务需要 API/联网。

## 安全

- 原始文件默认只读；保存产生新版本。
- 不覆盖源文件，不删除用户文件。
- 文件路径限制在授权根内（office 根与会话工作区），同前缀的兄弟目录不算根内。
- API key 不写入文件、日志或打包产物。
