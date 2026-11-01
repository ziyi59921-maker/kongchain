# 采购发票重复检查

按可配置字段组合对采购发票分组，返回重复组。默认按供应商、发票号码、金额三项匹配。

## 工具

`invoice_duplicate_check`

输入：

```json
{
  "rows": [
    { "supplier": "甲公司", "invoiceNo": "INV-001", "amount": 1000 }
  ],
  "match": ["supplier", "invoiceNo", "amount"],
  "caseSensitive": true
}
```

- `rows` 必填，元素为对象；每行可含 `supplier`、`invoiceNo`、`amount`。
- `match` 可省略，默认 `["supplier", "invoiceNo", "amount"]`；显式给出的值必须是 `supplier`、`invoiceNo`、`amount` 的任意非空子集，顺序即比较顺序，重复字段自动去重。
- `caseSensitive` 可省略，默认 `true`：`invoiceNo` 按原始文本比较，`INV-001` 与 `inv-001` 视为不同发票；设为 `false` 时只忽略 `invoiceNo` 的大小写，两者归入同一重复组。`supplier` 始终按原文比较（供应商名称大小写不同不代表同一主体），`amount` 仍按数值归一化比较。非布尔值（如 `"false"` 字符串）不会被强制转换，按下一节返回工具错误。

输出：

```json
{
  "duplicates": [
    {
      "key": { "supplier": "甲公司", "invoiceNo": "INV-001", "amount": "1000" },
      "count": 2,
      "rows": []
    }
  ],
  "checked": 2,
  "match": ["supplier", "invoiceNo", "amount"]
}
```

- `duplicates` 只包含出现两次及以上的组，按首次出现顺序排列；`key` 只包含本次实际参与匹配的字段。
- `checked` 是输入发票总数；缺失匹配字段的记录不参与分组，避免把两条不完整记录误判为重复。
- 金额按十进制值归一化后比较，`"1,000.00"`、`"001000.0"` 与 `1000` 视为相同；其他匹配字段去除首尾空白后按文本比较。
- `caseSensitive: false` 只改变分组判重，`key` 仍保留该组首条发票的原始文本（例如先出现 `INV-001`、后出现 `inv-001` 时，`key.invoiceNo` 为 `INV-001`），因此引用该组时应对照组内 `rows` 的原文，不要把 `key` 当成标准写法。输出不回显 `caseSensitive`，判定口径需从本次调用参数或工作底稿记录中获取。
- 输入为空、字段缺失、金额格式不可识别或顶层结构异常时返回空结果，不抛出异常；`match` 或 `caseSensitive` 配置无效时按下一节返回工具错误。

### 无效配置的失败响应

`match` 与 `caseSensitive` 的配置错误不会被静默回退为默认值，而是以工具错误返回（`isError: true`，文本以 `Error:` 开头），便于调用方发现笔误：

| 输入 | 响应文本（节选） |
|---|---|
| `"match": []` | `Error: match must not be empty; pass at least one of supplier, invoiceNo, amount, or omit match to match all three.` |
| `"match": ["supplier", "vendor"]` | `Error: match contains unsupported field "vendor"; allowed fields are supplier, invoiceNo, amount.` |
| `"match": "supplier"` | `Error: match must be an array of field names (supplier, invoiceNo, amount); received a string.` |
| `"match": ["supplier", 42]` | `Error: match entry 2 must be a field name string; received a number.` |
| `"match": ["  "]` | `Error: match entry 1 is empty; allowed fields are supplier, invoiceNo, amount.` |
| `"caseSensitive": "false"` | `Error: caseSensitive must be a boolean; received a string.` |

省略 `match`、三项全给、任意子集（如 `["supplier", "invoiceNo"]`）以及空 `rows` 均保持原有行为；省略 `caseSensitive` 等价于 `true`，与 0.1.1 行为一致。`"false"` 这类字符串不会被当作布尔值，避免把笔误当成关闭区分大小写。

### 输出 schema

工具输出 schema 必须落在 Harness 支持的 JSON Schema 子集内：对象节点的 `additionalProperties` 只能是布尔值。因此重复组的 `key` 用明确 `properties`（`supplier`、`invoiceNo`、`amount` 均为可选字符串）描述，而不是给 `additionalProperties` 赋一个子 schema；否则 headless 加载时会抛 `JsonSchemaError: unsupported JSON schema: schema.properties.duplicates.items.properties.key.additionalProperties must be a boolean`。

重复组只是需要进一步核实的线索，不直接等同于违规、重复付款或舞弊。该工具不做供应商名称模糊匹配；`invoiceNo` 默认区分大小写，仅在显式 `caseSensitive: false` 时忽略大小写，而 `supplier` 始终按原文比较。

## 测试

```sh
node --test test
```

覆盖范围：

- `test/check.test.mjs`：默认匹配、子集匹配、单字段匹配、重复字段去重、空 match/未知字段/非数组/非字符串项报错、金额归一化、缺失字段、异常顶层输入、默认区分发票号码大小写、`caseSensitive: false` 的忽略大小写判重、`caseSensitive: false` 下供应商仍区分大小写、非布尔 `caseSensitive` 报错。
- `test/index.test.mjs`：`apply` 注册 smoke test（用假的 `ctx.tools.register` 捕获定义，确认 `apply` 不抛异常且 schema 未越界）、注册后工具的默认匹配、定制匹配、空数组与未知字段的失败响应、`caseSensitive` 参数声明（可选布尔、默认 `true`）与执行时透传。

## 验证与安装

```sh
# 静态检查：manifest、bundle patch、entry 语法与 Node 测试
# 会话内调用 kongchain_plugin_check(dir: 'extensions/kongchain-plugins/invoice-duplicate-check')

# 安装/更新到 kongchain-demo（同一目录、link 依赖）
# 会话内调用 kongchain_plugin_install(dir: '...', profile: 'kongchain-demo')
```

当前版本：0.1.2。
