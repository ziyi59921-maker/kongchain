# CSV 统计

对授权工作区内的一个 `.csv` 文件做确定性统计：行数、列名、缺失值、数值列的 count/sum/mean/min/max。只读，不写、不移动、不删除文件；工作区外的路径直接拒绝。

## 工具

`csv_statistics`

输入：

```json
{
  "path": "extensions/kongchain-plugins/csv-statistics/test/fixtures/basic.csv",
  "amountColumn": "amount"
}
```

- `path` 必填，绝对路径或相对工作区根目录（`F:\KongChain`）的相对路径。
- `amountColumn` 可省略。省略时统计**所有整列都能解析为十进制数字**的列；给出时只统计该列（列名必须与表头完全一致），并把该列中非十进制数字的单元格单独报出来。

输出（节选）：

```json
{
  "source": {
    "path": "F:\\KongChain\\extensions\\kongchain-plugins\\csv-statistics\\test\\fixtures\\basic.csv",
    "sha256": "…",
    "bytes": 164,
    "rowCount": 4,
    "blankRows": 0,
    "columnCount": 4,
    "columns": ["supplier", "invoiceNo", "amount", "note"],
    "delimiter": ",",
    "encoding": "utf-8",
    "bomStripped": false
  },
  "missing": {
    "total": 3,
    "byColumn": [
      { "column": "supplier", "missing": 0, "filled": 4, "kind": "text" },
      { "column": "invoiceNo", "missing": 0, "filled": 4, "kind": "text" },
      { "column": "amount", "missing": 1, "filled": 3, "kind": "numeric" },
      { "column": "note", "missing": 2, "filled": 2, "kind": "text" }
    ]
  },
  "numeric": {
    "requestedColumn": "amount",
    "columnCount": 1,
    "columns": [
      {
        "column": "amount",
        "count": 3,
        "sum": "1455.25",
        "mean": "485.08333333",
        "min": "-45.25",
        "max": "1200.50",
        "decimalPlaces": 2,
        "nonNumericCount": 0,
        "nonNumericSamples": []
      }
    ]
  },
  "limitations": ["…"]
}
```

## 统计口径

- **行数**：`rowCount` 只计数据行；全为空单元格的行计入 `blankRows` 并从行数中排除。仅表头、零字节文件都返回 `rowCount: 0`，零字节文件的 `columns` 为空数组，并给出“没有表头行”的限制说明。
- **缺失值**：单元格去空白后为空即计为缺失；`missing.total` 是各列缺失数之和。字段少于表头的行按空值补齐并给出限制说明；字段多于表头的行只取表头覆盖的列。
- **列名**：表头去空白；空表头命名 `column_<序号>`；重名列改为 `name#2`、`name#3`，并在 `limitations` 中说明。
- **数值列**：只有 `[+-]?数字[.数字]` 形式的单元格算数字；`"1,200.00"`、`¥300`、`12%`、`(100)`、`1e3` 都不算，因此不会被静默改写成金额。
- **精度**：sum/mean/min/max 用 BigInt 定点运算，不经过二进制浮点，`0.1 + 0.2` 得到 `0.3`。`sum`/`min`/`max` 按该列最大小数位输出（如 `1200.50`）；`mean` 在列小数位之外最多保留 6 位并四舍五入，末尾 0 去掉但不少于列小数位。`mean` 在 `count` 为 0 时为 `null`。
- **分隔符**：在表头行探测 `,`、`;`、Tab，取出现次数最多者（默认 `,`）。带引号字段、字段内逗号和换行、`""` 转义按 RFC 4180 解析。
- 统计结果只是数据画像，不判断数据是否合规，也不构成审计结论。

## 失败响应

| 情形 | 错误类型 | 说明 |
|---|---|---|
| 路径为空或非字符串 | `CsvInputError` | `path must be a non-empty string …` |
| 路径解析到工作区外（含 `..` 逃逸、其他盘符） | `PathAuthorizationError` | `path outside authorized workspace: … (authorized root: …)` |
| 文件不存在 | `CsvInputError` | `file not found: …` |
| 不是 `.csv` | `CsvInputError` | `unsupported file type ".json"` |
| 超过 64 MiB | `CsvInputError` | 提示先拆分 |
| 含 NUL 字节（非文本） | `CsvInputError` | 不按二进制猜测解析 |
| `amountColumn` 不在表头 | `CsvInputError` | 列出可选列名 |

路径先做 `realpath` 再判断是否位于工作区根目录内，因此符号链接/快捷方式不能把统计范围带出工作区。

## 测试

```sh
node --test test
```

覆盖（39 个用例，全部通过）：

- `test/stats.test.mjs`：引号内逗号/双引号/换行、CRLF、仅表头、零字节、逐列缺失、负数、`0.1+0.2`、大额小数、可整除均值、均值四舍五入、千分位/货币/百分号不当作数字、空数值列、空行排除、短行补齐、重名列、分号分隔、BOM、未知 `amountColumn`、定点格式化、路径越界判断、限制说明。
- `test/check.test.mjs`：真实文件读取（`sha256`/`bytes` 与实际文件一致）、相对路径解析、仅表头、零字节、`amountColumn` 限定、工作区外绝对路径、`..` 逃逸、空路径、非 CSV 扩展名、文件不存在。
- `test/index.test.mjs`：`apply` 注册（假 `ctx.tools.register`）、schema 不越界、执行返回 JSON 文本、`amountColumn` 透传、越界路径报错、`render` 输出。
- `test/fixtures/`：`basic.csv`、`header-only.csv`、`zero-bytes.csv`、`upper.CSV`。

## 验证与安装

```sh
# 静态检查：manifest、bundle patch、entry 语法与 Node 测试
# 会话内调用 kongchain_plugin_check(dir: 'extensions/kongchain-plugins/csv-statistics')

# 安装到 kongchain-demo（官方 dsh plugin 路径，链接依赖，失败自动恢复备份）
# 会话内调用 kongchain_plugin_install(dir: '...', profile: 'kongchain-demo')
```

安装后需要新进程（重启 profile）才会注册 `csv_statistics` 工具；本次会话内可用 `node --test` 与直接导入 `analyzeCsv` 验证行为。

当前版本：0.1.0。
