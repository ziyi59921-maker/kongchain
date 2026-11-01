# CSV 分布统计

对授权工作区内的一个 `.csv` 文件的指定数值列做分布画像：count、min、max、mean、median、p25/p50/p75/p90/p95、缺失值，以及按指定桶数生成的等宽直方图。只读；不写、不移动、不删除文件；工作区外的路径直接拒绝。

本插件是 `@kongchain-plugin/csv-statistics` 的互补能力：现有 `csv_statistics` 已覆盖 count/sum/mean/min/max 和逐列缺失值，本插件只补充分位数、中位数与直方图，不重复其基础统计接口。

## 工具

`csv_distribution`

输入：

```json
{
  "path": "extensions/kongchain-plugins/csv-distribution/test/fixtures/basic.csv",
  "column": "amount",
  "bins": 2
}
```

- `path` 必填，绝对路径或相对工作区根目录（`F:\KongChain`）的相对路径；只接受 `.csv`。
- `column` 必填，必须与表头完全一致（去空白后比较）。
- `bins` 可省略，默认 10；必须是 1–100 的整数。

输出（`basic.csv`，`bins: 2` 的真实结果节选）：

```json
{
  "source": {
    "path": "F:\\KongChain\\extensions\\kongchain-plugins\\csv-distribution\\test\\fixtures\\basic.csv",
    "sha256": "4169c23cae0667279f24ca937fead9fb79030b23f49b81240c830d588c8e768f",
    "bytes": 58,
    "rowCount": 4,
    "blankRows": 0,
    "columnCount": 3,
    "columns": ["supplier", "amount", "note"],
    "delimiter": ",",
    "encoding": "utf-8",
    "bomStripped": false
  },
  "column": "amount",
  "count": 4,
  "missing": {
    "count": 0,
    "total": 4,
    "nonNumericCount": 0,
    "nonNumericSamples": []
  },
  "min": "0.00",
  "max": "30.00",
  "mean": "15.00",
  "median": "15.00",
  "percentiles": {
    "p25": "7.50",
    "p50": "15.00",
    "p75": "22.50",
    "p90": "27.00",
    "p95": "28.50"
  },
  "histogram": {
    "bins": 2,
    "binsUsed": 2,
    "method": "equal-width",
    "degenerate": false,
    "boundaryDecimalPlaces": 8,
    "buckets": [
      { "index": 0, "lower": "0", "upper": "15", "count": 2 },
      { "index": 1, "lower": "15", "upper": "30", "count": 2 }
    ]
  },
  "limitations": ["…"]
}
```

## 统计口径

- **数值识别**：只有 `[+-]?数字[.数字]` 形式的单元格算数字；`"1,200.00"`、`¥300`、`12%`、`(100)`、`1e3` 都不算，不会被静默改写。非空、非数字的单元格计入 `missing.nonNumericCount`，并最多给出 5 个 `nonNumericSamples`。
- **空值**：去空白后为空的单元格计入 `missing.count`，不参与任何数值统计。
- **精度**：所有数值先转为 BigInt 定点整数；min/max 保留列的小数位，mean/median/percentiles 在列小数位之外最多保留 6 位并四舍五入，不经过二进制浮点。
- **分位数**：位置为 `(n - 1) * p`，在相邻两个观测值之间线性插值；`median` 等于 `p50`。列只有一个值时所有分位数都等于该值；列为空时全部为 `null`。
- **直方图**：等宽区间，区间数为 `bins`；除最后一个区间外左闭右开，恰好落在内部边界的值归入以该边界为下界的区间，最后一个区间包含最大值。计数按精确有理数分配；边界展示最多保留 6 位额外小数。
- **退化直方图**：所有数值相同（包括单值或全部重复）时，等宽区间没有定义，返回 1 个桶并在 `degenerate` 标为 `true`；空列返回 0 个桶。
- **CSV 解析**：在表头行探测 `,`、`;`、Tab；支持 RFC 4180 引号字段、字段内逗号和换行、`""` 转义、BOM、CRLF。空记录排除；短行补空值；长行只取表头覆盖的列，并在 `limitations` 说明。
- 结果只是数据画像，不判断数据是否合规、异常或存在舞弊。

## 依赖、权限与安全

- **运行时依赖**：仅 Node 内置模块 `node:fs`、`node:path`、`node:crypto`；无第三方运行时依赖，无 `npm install` 步骤。
- **权限**：只读授权工作区根目录内的单个 `.csv`；不写文件、不访问网络、不启动子进程、不执行外部命令。
- **路径授权**：先 `realpath` 再检查是否位于 `F:\KongChain` 内，`..` 逃逸、其他盘符、符号链接/快捷方式指向工作区外都会被拒绝。
- **资源限制**：文件最大 64 MiB；含 NUL 字节的文件按非文本拒绝；不做 OCR、不解压、不解析 Excel。
- **许可证**：MIT；仓库内自有代码，无第三方代码复制。
- **主要风险**：CSV 解析是本地确定性文本解析，不使用 `eval` 或动态代码；输出 JSON 字符串，不拼接 HTML。误差边界已在上文和 `limitations` 中说明。

## 失败响应

| 情形 | 错误类型 | 说明 |
|---|---|---|
| `path` 为空或非字符串 | `CsvInputError` | `path must be a non-empty string …` |
| 路径解析到工作区外 | `PathAuthorizationError` | `path outside authorized workspace: …` |
| 文件不存在 / 不是普通文件 | `CsvInputError` | `file not found` / `not a regular file` |
| 不是 `.csv` | `CsvInputError` | `unsupported file type …` |
| 超过 64 MiB | `CsvInputError` | 提示先拆分 |
| 含 NUL 字节 | `CsvInputError` | 不按二进制猜测解析 |
| `column` 为空或不在表头 | `CsvInputError` | 列出可选列名 |
| `bins` 不是 1–100 的整数 | `CsvInputError` | 明确报出收到的值 |

## 测试

```sh
node --test
```

当前 38 个用例全部通过，覆盖：空列、单值、全部重复、缺失值、负值、分位数线性插值、直方图内部边界、非整除桶宽、非数字单元格、未知列、非法 `bins`、空路径、工作区外绝对路径、`..` 逃逸、非 CSV 扩展名、NUL 字节、相对路径、真实文件 SHA-256/字节数、工具注册 schema 与 `render`。

## 验证与安装

```sh
# 会话内静态检查：manifest、bundle patch、entry 语法与 Node 测试
# kongchain_plugin_check(dir: 'extensions/kongchain-plugins/csv-distribution')

# 安装到 kongchain-demo（官方 dsh plugin 路径，失败自动恢复备份）
# kongchain_plugin_install(dir: '...', profile: 'kongchain-demo')
```

安装后需要新进程（重启 profile）才会在 Harness 中注册 `csv_distribution` 工具；安装前的同进程验证通过直接调用 `analyzeCsv` 与 `node --test` 完成，不能声称当前会话已热加载。

当前版本：0.1.0。
