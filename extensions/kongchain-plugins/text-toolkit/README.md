# 文本统计工具

统计一段文本的字符数、非空白字符数、单词数、行数，并给出词频前 N 的单词；纯函数实现，无第三方依赖，不读写文件、不访问网络。

- 包名：`@kongchain-plugin/text-toolkit`
- 插件名：`text-toolkit`，工具名：`text_stats`
- 入口：`src/index.js`，纯逻辑：`src/check.js`
- 版本：`0.2.0`

## 工具

`text_stats({ text: string, topN?: integer })` 返回：

| 字段 | 含义 |
| --- | --- |
| `chars` | Unicode 码点个数（一个 emoji 计 1，不按 UTF-16 代理对计 2） |
| `nonWhitespaceChars` | 非空白码点个数（空白按 ECMAScript `\s` 判断，含制表、换行、全角空格、不换行空格） |
| `words` | 字母/数字连续片段个数；标点与符号分隔但不计为单词，连续中文按 1 个单词计 |
| `lines` | `\n` 换行个数，非空且不以 `\n` 结尾时再加 1；`""` 为 0 行，`"a\n"` 为 1 行，`"a\n\n"` 为 2 行 |
| `topWords` | 词频前 N 的单词数组，元素为 `{ word, count }`；空文本或无单词文本返回 `[]` |

### 参数 `topN`

- 可选，整数，最小 1，默认 `3`。
- 返回条目数上限；去重后的单词数少于 `topN` 时返回全部单词。
- `topN` 小于 1 抛 `RangeError`，非整数（含 `null`、字符串）抛 `TypeError`。

### `topWords` 统计口径

- 单词切分与 `words` 相同（Unicode 字母/数字连续片段），因此全部单词的 `count` 之和恒等于 `words`。
- 大小写不敏感：按 `String#toLowerCase` 折叠后合并，返回小写形式；`The`、`the`、`THE` 合并为 `the`。
- 排序：`count` 降序；`count` 相同的按该单词首次出现的位置先后排序。
- 空文本 `""`、纯空白、纯符号/emoji 文本均返回空数组 `[]`。

已知限制：单独的回车符 `\r`（旧式 Mac 换行）不计为换行；CJK 按字符片段而非分词计数；大小写折叠仅用 `toLowerCase`，不实现完整 Unicode case folding（如 `Straße` 与 `STRASSE` 不合并）；不做词形还原（`run` 与 `running` 是两个词）；`text` 非字符串时抛 `TypeError`，不做隐式转换。

## 权限与副作用

无文件读写、无网络、无子进程、无系统权限；只接收字符串与可选整数并返回统计结果。

## 测试

```sh
node --test test
```

覆盖：空文本、纯空白（含全角空格/不换行空格）、单/多单词、标点与数字、多行、结尾换行、空行、CRLF、中文与中文标点、中英混排、emoji 代理对、纯符号、跨行单词、非字符串输入，以及 `topWords` 的空结果、默认/显式 `topN`、大小写折叠、同频首次出现排序、Unicode（`Äpfel`）与 CJK/数字、频次合计等于 `words`、非法 `topN`，以及工具注册、参数与渲染。
