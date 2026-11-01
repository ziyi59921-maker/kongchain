const MATCH_FIELDS = ['supplier', 'invoiceNo', 'amount']

/** 默认匹配字段：三项全部参与比较。 */
export const DEFAULT_MATCH = Object.freeze([...MATCH_FIELDS])

/** 默认区分大小写：发票号码按原始文本比较。 */
export const DEFAULT_CASE_SENSITIVE = true

/**
 * 无法使用的 match 配置：非数组、空数组、空字段名或未知字段。
 */
export class MatchConfigError extends Error {
  /**
   * @param {string} message 面向调用方的可理解说明，包含允许的字段名。
   */
  constructor(message) {
    super(message)
    this.name = 'MatchConfigError'
    this.code = 'INVALID_MATCH'
  }
}

/**
 * 无法使用的 caseSensitive 配置：既不是 true 也不是 false。
 */
export class CaseSensitivityConfigError extends Error {
  /**
   * @param {string} message 面向调用方的可理解说明。
   */
  constructor(message) {
    super(message)
    this.name = 'CaseSensitivityConfigError'
    this.code = 'INVALID_CASE_SENSITIVE'
  }
}

/**
 * Canonicalize a currency amount so numerically equal strings and numbers
 * (for example `"1,000.00"` and `1000`) share one comparison key.
 *
 * The function works on the decimal text instead of converting through
 * binary floating point, which keeps long invoice amounts exact.
 * @param {unknown} value
 * @returns {string | null} Canonical decimal text, or null when the value is absent or invalid.
 */
function normalizeAmount(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
  } else if (typeof value === 'string') {
    value = value.trim().replaceAll(',', '')
    if (value === '') return null
  } else {
    return null
  }

  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(String(value))
  if (!match) return null

  const [, sign, integerPart, fractionPart = '', exponentPart] = match
  if (integerPart === '' && fractionPart === '') return null

  const exponent = exponentPart === undefined ? 0 : Number(exponentPart)
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1000) return null

  const digits = `${integerPart}${fractionPart}`
  const point = integerPart.length + exponent
  let whole
  let fraction

  if (point <= 0) {
    whole = '0'
    fraction = `${'0'.repeat(-point)}${digits}`
  } else if (point >= digits.length) {
    whole = `${digits}${'0'.repeat(point - digits.length)}`
    fraction = ''
  } else {
    whole = digits.slice(0, point)
    fraction = digits.slice(point)
  }

  whole = whole.replace(/^0+(?=\d)/, '')
  fraction = fraction.replace(/0+$/, '')
  if (whole === '0' && fraction === '') return '0'

  return `${sign === '-' ? '-' : ''}${whole}${fraction === '' ? '' : `.${fraction}`}`
}

/**
 * Normalize a non-amount match field to trimmed text.
 * @param {unknown} value
 * @returns {string | null} Text value, or null when absent.
 */
function normalizeText(value) {
  if (typeof value === 'string') {
    const text = value.trim()
    return text === '' ? null : text
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

/**
 * @param {unknown} value
 * @returns {string} 用于错误说明的取值类型描述。
 */
function describeValue(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'an array'
  return `a ${typeof value}`
}

/**
 * Resolve the configured match fields.
 *
 * `undefined` means "not supplied" and selects the three-field default. A
 * supplied `match` must be a non-empty array drawn from
 * `supplier`/`invoiceNo`/`amount`; anything else throws {@link MatchConfigError}
 * instead of silently falling back to the default, so a typo cannot be mistaken
 * for the requested scope. Repeated fields are deduplicated.
 * @param {unknown} match
 * @returns {string[]} Match field names in caller order.
 * @throws {MatchConfigError} 非数组、空数组、空字段名或未知字段。
 */
function resolveMatch(match) {
  if (match === undefined) return [...DEFAULT_MATCH]

  const allowed = MATCH_FIELDS.join(', ')
  if (!Array.isArray(match)) {
    throw new MatchConfigError(`match must be an array of field names (${allowed}); received ${describeValue(match)}.`)
  }
  if (match.length === 0) {
    throw new MatchConfigError(`match must not be empty; pass at least one of ${allowed}, or omit match to match all three.`)
  }

  const fields = []
  match.forEach((field, index) => {
    if (typeof field !== 'string') {
      throw new MatchConfigError(`match entry ${index + 1} must be a field name string; received ${describeValue(field)}.`)
    }
    const name = field.trim()
    if (name === '') {
      throw new MatchConfigError(`match entry ${index + 1} is empty; allowed fields are ${allowed}.`)
    }
    if (!MATCH_FIELDS.includes(name)) {
      throw new MatchConfigError(`match contains unsupported field "${name}"; allowed fields are ${allowed}.`)
    }
    if (!fields.includes(name)) fields.push(name)
  })
  return fields
}

/**
 * Resolve the configured case sensitivity.
 *
 * `undefined` means "not supplied" and keeps the default `true`. Any other
 * non-boolean value throws {@link CaseSensitivityConfigError} instead of being
 * coerced, so `"false"` (a string) cannot silently enable case-insensitive
 * matching.
 * @param {unknown} caseSensitive
 * @returns {boolean} Whether invoice numbers are compared case-sensitively.
 * @throws {CaseSensitivityConfigError} 取值不是布尔值。
 */
function resolveCaseSensitive(caseSensitive) {
  if (caseSensitive === undefined) return DEFAULT_CASE_SENSITIVE
  if (typeof caseSensitive !== 'boolean') {
    throw new CaseSensitivityConfigError(`caseSensitive must be a boolean; received ${describeValue(caseSensitive)}.`)
  }
  return caseSensitive
}

/**
 * Build the normalized comparison key for one invoice.
 * Rows with a missing or invalid match field are excluded from grouping so
 * absent data does not create false duplicate findings.
 * @param {unknown} row
 * @param {string[]} match
 * @returns {Record<string, string> | null} Normalized key, or null when incomplete.
 */
function normalizeRow(row, match) {
  if (row === null || typeof row !== 'object' || Array.isArray(row)) return null

  const key = {}
  for (const field of match) {
    const value = field === 'amount' ? normalizeAmount(row[field]) : normalizeText(row[field])
    if (value === null) return null
    key[field] = value
  }
  return key
}

/**
 * Build the grouping key for a normalized invoice key.
 *
 * The reported `key` keeps the first row's original text; only the grouping
 * key folds case, and only for `invoiceNo` — supplier names stay exact so two
 * differently written legal names are still separate suppliers.
 * @param {Record<string, string>} key Normalized key from {@link normalizeRow}.
 * @param {string[]} fields Match fields in comparison order.
 * @param {boolean} caseSensitive Whether invoice numbers keep their letter case.
 * @returns {string} Grouping key.
 */
function groupKeyOf(key, fields, caseSensitive) {
  return JSON.stringify(
    fields.map((field) => (caseSensitive || field !== 'invoiceNo' ? key[field] : key[field].toLowerCase())),
  )
}

/**
 * Group purchase invoices by the configured field combination and report
 * groups that contain more than one invoice.
 *
 * `checked` is the number of input rows. Rows that lack any configured match
 * field are not grouped; this avoids treating two incomplete records as
 * duplicates. Amount values are compared by canonical decimal value, so
 * `"100.00"` and `100` match. With `caseSensitive: false`, `invoiceNo` values
 * that differ only in letter case join one group, while the reported `key`
 * keeps the first row's original text.
 * @param {unknown} rows Invoice array; malformed input yields an empty result.
 * @param {unknown} [match] 任意非空子集；省略时使用三项默认匹配。
 * @param {unknown} [caseSensitive] 是否区分发票号码大小写；省略时为 true。
 * @returns {{ duplicates: Array<{ key: Record<string, string>, count: number, rows: unknown[] }>, checked: number, match: string[] }}
 * @throws {MatchConfigError} match 非数组、空数组、含空字段名或未知字段。
 * @throws {CaseSensitivityConfigError} caseSensitive 不是布尔值。
 */
export function checkRecords(rows, match = DEFAULT_MATCH, caseSensitive) {
  const fields = resolveMatch(match)
  const sensitive = resolveCaseSensitive(caseSensitive)
  if (!Array.isArray(rows)) return { duplicates: [], checked: 0, match: fields }

  const groups = new Map()
  for (const row of rows) {
    const key = normalizeRow(row, fields)
    if (key === null) continue

    const groupKey = groupKeyOf(key, fields, sensitive)
    const existing = groups.get(groupKey)
    if (existing === undefined) {
      groups.set(groupKey, { key, rows: [row] })
    } else {
      existing.rows.push(row)
    }
  }

  const duplicates = []
  for (const group of groups.values()) {
    if (group.rows.length > 1) {
      duplicates.push({ key: group.key, count: group.rows.length, rows: group.rows })
    }
  }

  return { duplicates, checked: rows.length, match: fields }
}
