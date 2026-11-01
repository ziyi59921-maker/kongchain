/**
 * Pure CSV parsing and fixed-point statistics for the csv_statistics tool.
 *
 * Parsing follows RFC 4180 for quoted fields; every numeric result is computed
 * with BigInt fixed-point arithmetic so totals and means never depend on binary
 * floating point. This module performs no filesystem access, so the same logic
 * is exercised by the tests without touching the authorized workspace.
 *
 * @module csv-statistics/stats
 */
import { isAbsolute, relative } from 'node:path'

/** Input that cannot be turned into CSV records. */
export class CsvInputError extends Error {
  /**
   * @param {string} message Actionable failure text shown to the caller.
   */
  constructor(message) {
    super(message)
    this.name = 'CsvInputError'
  }
}

/** A path that resolves outside the authorized workspace root. */
export class PathAuthorizationError extends Error {
  /**
   * @param {string} message Actionable failure text shown to the caller.
   */
  constructor(message) {
    super(message)
    this.name = 'PathAuthorizationError'
  }
}

/** Longest accepted decimal text; longer cells are treated as text rather than rounded. */
const MAX_DECIMAL_CHARS = 40
/** Highest accepted decimal places; more places are treated as text. */
const MAX_DECIMAL_PLACES = 18
/** Extra decimal places kept for a mean beyond the column scale. */
const MEAN_EXTRA_PLACES = 6
/** Decimal places reported for the mean, capped. */
const MAX_MEAN_PLACES = 18
/** Delimiters probed on the header line. */
const DELIMITER_CANDIDATES = [',', ';', '\t']

/**
 * Test whether a resolved path sits inside an authorized root.
 *
 * Windows compares case-insensitively because the same file is reachable under
 * different letter case. Both arguments must already be absolute.
 *
 * @param {string} candidate Absolute path to test.
 * @param {string} root Authorized absolute root.
 * @returns {boolean} True when `candidate` is `root` or below it.
 */
export function isInsideRoot(candidate, root) {
  const left = normalize(candidate)
  const right = normalize(root)
  const rel = relative(right, left)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/**
 * Compare two absolute paths after Windows case folding.
 * @param {string} path Absolute path.
 * @returns {string} Path usable for comparison.
 */
function normalize(path) {
  return process.platform === 'win32' ? path.toLowerCase() : path
}

/**
 * Parse one cell as a plain decimal number.
 *
 * Only optional sign + digits with an optional single decimal point qualify.
 * Currency symbols, thousands separators, percent signs, parentheses, and
 * exponent notation are rejected so an amount column is never silently
 * reinterpreted.
 *
 * @param {unknown} raw Raw cell text.
 * @returns {{ unscaled: bigint, scale: number } | null} Fixed-point value or null.
 */
export function parseDecimal(raw) {
  const text = String(raw ?? '').trim()
  if (text === '' || text.length > MAX_DECIMAL_CHARS) return null
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null

  const negative = text.startsWith('-')
  const unsigned = text.replace(/^[+-]/, '')
  const dot = unsigned.indexOf('.')
  const digits = dot === -1 ? unsigned : unsigned.slice(0, dot) + unsigned.slice(dot + 1)
  const scale = dot === -1 ? 0 : unsigned.length - dot - 1
  if (scale > MAX_DECIMAL_PLACES) return null

  const magnitude = BigInt(digits)
  return { unscaled: negative ? -magnitude : magnitude, scale }
}

/**
 * Render a fixed-point value as plain decimal text.
 * @param {bigint} unscaled Value multiplied by `10 ** scale`.
 * @param {number} scale Number of decimal places.
 * @param {{ trimTrailingZeros?: boolean, minScale?: number }} [options] Trim zeros while keeping at least `minScale` places.
 * @returns {string} Plain decimal text without exponent notation.
 */
export function formatDecimal(unscaled, scale, options = {}) {
  const { trimTrailingZeros = false, minScale = 0 } = options
  const negative = unscaled < 0n
  const digits = (negative ? -unscaled : unscaled).toString()
  const padded = scale === 0 ? digits : digits.padStart(scale + 1, '0')
  const integerPart = padded.slice(0, padded.length - scale)
  const fractionDigits = scale === 0 ? '' : padded.slice(padded.length - scale)
  let fraction = fractionDigits
  if (trimTrailingZeros && fraction !== '') {
    const trimmed = fraction.replace(/0+$/, '')
    fraction = trimmed.length >= minScale ? trimmed : fraction.slice(0, minScale)
  }
  const sign = negative ? '-' : ''
  return fraction === '' ? `${sign}${integerPart}` : `${sign}${integerPart}.${fraction}`
}

/**
 * Divide two BigInt values, rounding half away from zero.
 * @param {bigint} numerator Dividend.
 * @param {bigint} denominator Divisor; must not be zero.
 * @returns {bigint} Rounded quotient.
 */
function divideRounded(numerator, denominator) {
  const negative = numerator < 0n !== denominator < 0n
  const absNumerator = numerator < 0n ? -numerator : numerator
  const absDenominator = denominator < 0n ? -denominator : denominator
  const quotient = absNumerator / absDenominator
  const remainder = absNumerator % absDenominator
  const rounded = 2n * remainder >= absDenominator ? quotient + 1n : quotient
  return negative ? -rounded : rounded
}

/**
 * Pick the delimiter separating the header cells.
 * @param {string} text CSV body without a BOM.
 * @returns {string} `,`, `;`, or a tab.
 */
function detectDelimiter(text) {
  const line = text.split(/\r\n|\n|\r/).find((candidate) => candidate.trim() !== '')
  if (line === undefined) return ','
  const counts = DELIMITER_CANDIDATES.map((delimiter) => [delimiter, countOutsideQuotes(line, delimiter)])
  counts.sort((left, right) => right[1] - left[1])
  return counts[0][1] > 0 ? counts[0][0] : ','
}

/**
 * Count delimiter occurrences that are not inside a quoted field.
 * @param {string} line One physical line.
 * @param {string} delimiter Candidate delimiter.
 * @returns {number} Occurrence count.
 */
function countOutsideQuotes(line, delimiter) {
  let count = 0
  let inQuotes = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        index += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && char === delimiter) count += 1
  }
  return count
}

/**
 * Split a CSV body into records.
 * @param {string} text CSV body without a BOM.
 * @param {string} delimiter Field delimiter.
 * @returns {{ records: string[][], unterminatedQuote: boolean }} Records and quote state.
 */
function splitRecords(text, delimiter) {
  const records = []
  let record = []
  let field = ''
  let inQuotes = false
  let index = 0

  while (index < text.length) {
    const char = text[index]

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 2
          continue
        }
        inQuotes = false
        index += 1
        continue
      }
      field += char
      index += 1
      continue
    }

    if (char === '"') {
      if (field.trim() === '') {
        field = ''
        inQuotes = true
      } else {
        field += char
      }
      index += 1
      continue
    }

    if (char === delimiter) {
      record.push(field)
      field = ''
      index += 1
      continue
    }

    if (char === '\n' || char === '\r') {
      const step = char === '\r' && text[index + 1] === '\n' ? 2 : 1
      record.push(field)
      records.push(record)
      record = []
      field = ''
      index += step
      continue
    }

    field += char
    index += 1
  }

  if (field !== '' || record.length > 0) {
    record.push(field)
    records.push(record)
  }

  return { records, unterminatedQuote: inQuotes }
}

/**
 * Give each header cell a unique, non-empty name.
 * @param {string[]} cells Raw header cells.
 * @returns {{ columns: string[], issues: string[] }} Trimmed unique names and human-readable naming issues.
 */
function nameColumns(cells) {
  const columns = []
  const seen = new Map()
  const issues = []
  let unnamed = 0

  cells.forEach((cell, index) => {
    let name = String(cell ?? '').trim()
    if (name === '') {
      name = `column_${index + 1}`
      unnamed += 1
    }
    const occurrence = (seen.get(name) ?? 0) + 1
    seen.set(name, occurrence)
    if (occurrence > 1) {
      columns.push(`${name}#${occurrence}`)
      issues.push(`列名 "${name}" 重复出现 ${occurrence} 次，已重命名为 "${name}#${occurrence}"。`)
      return
    }
    columns.push(name)
  })

  if (unnamed > 0) issues.push(`${unnamed} 个表头单元格为空，已命名为 column_<序号>。`)
  return { columns, issues }
}

/**
 * Parse CSV text into a header and data rows.
 *
 * Blank records are counted and dropped so they never inflate the row count.
 * Short records are padded with empty cells; long records keep only the columns
 * named by the header and are reported as ragged.
 *
 * @param {string} text CSV text, with or without a UTF-8 BOM.
 * @returns {{
 *   header: string[],
 *   rows: string[][],
 *   delimiter: string,
 *   blankRows: number,
 *   raggedShort: number,
 *   raggedLong: number,
 *   issues: string[],
 *   bomStripped: boolean,
 * }} Parsed table and parse-level notes.
 */
export function parseCsv(text) {
  const source = String(text ?? '')
  const bomStripped = source.charCodeAt(0) === 0xfeff
  const body = bomStripped ? source.slice(1) : source
  const delimiter = detectDelimiter(body)
  const { records, unterminatedQuote } = splitRecords(body, delimiter)

  const isBlank = (record) => record.every((cell) => String(cell ?? '').trim() === '')

  let headerIndex = -1
  for (let index = 0; index < records.length; index += 1) {
    if (!isBlank(records[index])) {
      headerIndex = index
      break
    }
  }

  const issues = []
  if (unterminatedQuote) issues.push('文件以未闭合的双引号结尾，最后一条记录的字段可能被合并解析。')

  if (headerIndex === -1) {
    return {
      header: [],
      rows: [],
      delimiter,
      blankRows: records.length,
      raggedShort: 0,
      raggedLong: 0,
      issues: [...issues, '文件没有表头行：没有可统计的列，行数为 0。'],
      bomStripped,
    }
  }

  const { columns, issues: namingIssues } = nameColumns(records[headerIndex])
  issues.push(...namingIssues)

  const rows = []
  let blankRows = headerIndex
  let raggedShort = 0
  let raggedLong = 0

  for (const record of records.slice(headerIndex + 1)) {
    if (isBlank(record)) {
      blankRows += 1
      continue
    }
    if (record.length < columns.length) {
      raggedShort += 1
      rows.push(record.map((cell) => String(cell ?? '').trim()).concat(Array(columns.length - record.length).fill('')))
      continue
    }
    if (record.length > columns.length) raggedLong += 1
    rows.push(record.slice(0, columns.length).map((cell) => String(cell ?? '').trim()))
  }

  if (blankRows > 0) issues.push(`${blankRows} 行全为空单元格，已从行数统计中排除。`)
  if (raggedShort > 0) issues.push(`${raggedShort} 行字段少于表头，缺失的单元格按空值计入缺失统计。`)
  if (raggedLong > 0) issues.push(`${raggedLong} 行字段多于表头，超出的字段未参与统计。`)

  return { header: columns, rows, delimiter, blankRows, raggedShort, raggedLong, issues, bomStripped }
}

/**
 * Summarize one column's missing cells.
 * @param {string[]} columns Column names.
 * @param {string[][]} rows Data rows.
 * @returns {{ total: number, byColumn: Array<{ column: string, missing: number, filled: number, kind: string }> }} Missing counts per column.
 */
function summarizeMissing(columns, rows) {
  const byColumn = columns.map((column, index) => {
    let missing = 0
    for (const row of rows) {
      if ((row[index] ?? '') === '') missing += 1
    }
    return { column, missing, filled: rows.length - missing, kind: 'empty' }
  })
  const total = byColumn.reduce((sum, entry) => sum + entry.missing, 0)
  return { total, byColumn }
}

/**
 * Classify a column from its non-empty cells.
 * @param {number} index Column position.
 * @param {string[][]} rows Data rows.
 * @returns {'empty' | 'numeric' | 'text'} Column kind.
 */
function classifyColumn(index, rows) {
  let filled = 0
  let numeric = 0
  for (const row of rows) {
    const cell = row[index] ?? ''
    if (cell === '') continue
    filled += 1
    if (parseDecimal(cell) !== null) numeric += 1
  }
  if (filled === 0) return 'empty'
  return numeric === filled ? 'numeric' : 'text'
}

/*
 * Fixed-point boundaries: a cell counts as numeric only when its decimal text
 * is at most MAX_DECIMAL_CHARS long with at most MAX_DECIMAL_PLACES places;
 * longer or finer values are reported as non-numeric and excluded. Sums use
 * the widest column scale, means add at most MEAN_EXTRA_PLACES places and round
 * half away from zero, and magnitude is bounded only by BigInt memory, so no
 * step rounds through binary floating point.
 */
/**
 * Compute count/sum/mean/min/max for the numeric cells of one column.
 * @param {string[]} values Raw column cells in row order.
 * @returns {{
 *   count: number,
 *   sum: string,
 *   mean: string | null,
 *   min: string | null,
 *   max: string | null,
 *   decimalPlaces: number,
 *   nonNumericCount: number,
 *   nonNumericSamples: string[],
 * }} Decimal statistics.
 */
function numericStatistics(values) {
  const decimals = []
  const nonNumeric = []
  for (const value of values) {
    if (value === '') continue
    const parsed = parseDecimal(value)
    if (parsed === null) {
      if (nonNumeric.length < 5) nonNumeric.push(value)
      continue
    }
    decimals.push(parsed)
  }

  const scale = decimals.reduce((max, entry) => Math.max(max, entry.scale), 0)
  const scaled = decimals.map((entry) => entry.unscaled * 10n ** BigInt(scale - entry.scale))
  const total = scaled.reduce((sum, value) => sum + value, 0n)
  const count = decimals.length

  if (count === 0) {
    return {
      count: 0,
      sum: formatDecimal(0n, scale),
      mean: null,
      min: null,
      max: null,
      decimalPlaces: scale,
      nonNumericCount: values.filter((value) => value !== '').length,
      nonNumericSamples: nonNumeric,
    }
  }

  let min = scaled[0]
  let max = scaled[0]
  for (const value of scaled) {
    if (value < min) min = value
    if (value > max) max = value
  }

  const meanScale = Math.min(scale + MEAN_EXTRA_PLACES, MAX_MEAN_PLACES)
  const scaledMean = divideRounded(total * 10n ** BigInt(meanScale - scale), BigInt(count))

  return {
    count,
    sum: formatDecimal(total, scale),
    mean: formatDecimal(scaledMean, meanScale, { trimTrailingZeros: true, minScale: scale }),
    min: formatDecimal(min, scale),
    max: formatDecimal(max, scale),
    decimalPlaces: scale,
    nonNumericCount: values.filter((value) => value !== '').length - count,
    nonNumericSamples: nonNumeric,
  }
}

/**
 * Compute the full statistics result for one CSV text.
 *
 * @param {{
 *   text: string,
 *   path?: string | null,
 *   sha256?: string | null,
 *   bytes?: number | null,
 *   amountColumn?: string | null,
 * }} input CSV text plus optional source metadata and the requested numeric column.
 * @returns {Record<string, unknown>} Source metadata, missing counts, numeric statistics, limitations.
 * @throws {CsvInputError} When `amountColumn` is absent from the header.
 */
export function computeStatistics(input) {
  const { text, path = null, sha256 = null, bytes = null, amountColumn = null } = input ?? {}
  const table = parseCsv(text)
  const columns = table.header
  const rows = table.rows
  const missing = summarizeMissing(columns, rows)
  const limitations = [...table.issues]

  const kinds = columns.map((_, index) => classifyColumn(index, rows))
  missing.byColumn.forEach((entry, index) => {
    entry.kind = kinds[index]
  })

  let requestedColumn = null
  if (amountColumn !== null && amountColumn !== undefined) {
    if (typeof amountColumn !== 'string' || amountColumn.trim() === '') {
      throw new CsvInputError('amountColumn must be a non-empty string naming a column in the header')
    }
    const name = amountColumn.trim()
    const index = columns.indexOf(name)
    if (index === -1) {
      throw new CsvInputError(
        `amountColumn "${name}" is not a column in this file; available columns: ${columns.length === 0 ? '(none)' : columns.join(', ')}`,
      )
    }
    requestedColumn = name
  }

  const selected = columns
    .map((column, index) => ({ column, index }))
    .filter(({ column, index }) => (requestedColumn === null ? kinds[index] === 'numeric' : column === requestedColumn))

  const numericColumns = selected.map(({ column, index }) => {
    const values = rows.map((row) => row[index] ?? '')
    return { column, ...numericStatistics(values) }
  })

  for (const entry of numericColumns) {
    if (entry.nonNumericCount > 0) {
      limitations.push(
        `列 "${entry.column}" 有 ${entry.nonNumericCount} 个非空单元格不是纯十进制数字（如货币符号、千分位逗号、百分号），未计入 count/sum/mean/min/max。`,
      )
    }
  }

  if (requestedColumn !== null && numericColumns[0].count === 0) {
    limitations.push(`amountColumn "${requestedColumn}" 没有可解析的十进制数字，数值统计为空计数。`)
  }

  limitations.push('金额统计使用 BigInt 定点运算，不引入二进制浮点误差；mean 按四舍五入保留列小数位后最多 6 位。')
  limitations.push('按 UTF-8 解码；其他编码（如 GBK）可能产生替换字符。仅统计，不判断数据是否合规。')

  return {
    source: {
      path: path === null ? null : String(path),
      sha256: sha256 === null ? null : String(sha256),
      bytes: bytes === null ? null : Number(bytes),
      rowCount: rows.length,
      blankRows: table.blankRows,
      columnCount: columns.length,
      columns,
      delimiter: table.delimiter,
      encoding: 'utf-8',
      bomStripped: table.bomStripped,
    },
    missing,
    numeric: {
      requestedColumn,
      columnCount: numericColumns.length,
      columns: numericColumns,
    },
    limitations,
  }
}
