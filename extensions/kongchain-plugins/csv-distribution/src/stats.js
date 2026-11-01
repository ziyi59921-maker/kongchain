/**
 * Pure CSV parsing and distribution statistics for the csv_distribution tool.
 *
 * Values are parsed as fixed-point integers so percentiles, means, and
 * histogram boundaries never pass through binary floating point. The module
 * performs no filesystem access; `check.js` owns path authorization and reads.
 *
 * @module csv-distribution/stats
 */
import { isAbsolute, relative } from 'node:path'

/** Input that cannot be turned into distribution statistics. */
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

/** Longest accepted decimal text; longer cells are treated as text, never as numbers. */
const MAX_DECIMAL_CHARS = 40
/** Highest accepted decimal places; finer values are treated as text. */
const MAX_DECIMAL_PLACES = 18
/** Extra decimal places kept for a derived mean or percentile. */
const DERIVED_EXTRA_PLACES = 6
/** Default number of equal-width histogram buckets. */
export const DEFAULT_BINS = 10
/** Largest accepted histogram bucket count. */
export const MAX_BINS = 100
/** Delimiters probed on the header line. */
const DELIMITER_CANDIDATES = [',', ';', '\t']
/** Reported percentile labels and their basis-point positions. */
const PERCENTILE_POINTS = {
  p25: 2500,
  p50: 5000,
  p75: 7500,
  p90: 9000,
  p95: 9500,
}

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
 * @returns {{ columns: string[], issues: string[] }} Trimmed unique names and naming issues.
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
 * Blank records are counted and dropped. Short records are padded with empty
 * cells; long records keep only the columns named by the header.
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
 * Validate the requested bucket count.
 * @param {unknown} value Caller-supplied `bins`.
 * @returns {number} Integer between 1 and `MAX_BINS`.
 * @throws {CsvInputError} When the value is not an integer in range.
 */
export function normalizeBins(value) {
  if (value === undefined || value === null) return DEFAULT_BINS
  if (!Number.isInteger(value) || value < 1 || value > MAX_BINS) {
    throw new CsvInputError(`bins must be an integer between 1 and ${MAX_BINS}; received ${String(value)}`)
  }
  return value
}

/**
 * Format one rational histogram boundary.
 *
 * `min` and `range` are fixed-point integers at `scale`; boundary `index` is
 * `min + range * index / bins`, rendered at `targetScale` with half-away-from-zero
 * rounding.
 *
 * @param {bigint} min Smallest value at `scale`.
 * @param {bigint} range `max - min` at `scale`.
 * @param {number} index Boundary index from 0 through `bins`.
 * @param {number} bins Bucket count.
 * @param {number} scale Source decimal places.
 * @param {number} targetScale Output decimal places.
 * @returns {string} Boundary text.
 */
function formatBoundary(min, range, index, bins, scale, targetScale) {
  const numerator = range * BigInt(index)
  const denominator = BigInt(bins)
  const base = min + numerator / denominator
  const remainder = numerator % denominator
  const factor = 10n ** BigInt(targetScale - scale)
  const scaled = base * factor + divideRounded(remainder * factor, denominator)
  return formatDecimal(scaled, targetScale, { trimTrailingZeros: true, minScale: 0 })
}

/**
 * Build equal-width histogram buckets with half-open intervals.
 *
 * A value equal to an interior boundary belongs to the bucket starting there;
 * the final bucket includes the maximum. When every numeric value is identical
 * the requested width is undefined, so one bucket holds the whole column.
 *
 * @param {bigint[]} sorted Ascending values at `scale`.
 * @param {number} scale Source decimal places.
 * @param {number} bins Requested bucket count.
 * @returns {{
 *   bins: number,
 *   binsUsed: number,
 *   method: string,
 *   degenerate: boolean,
 *   boundaryDecimalPlaces: number,
 *   buckets: Array<{ index: number, lower: string, upper: string, count: number }>,
 * }} Histogram result.
 */
function buildHistogram(sorted, scale, bins) {
  const count = sorted.length
  if (count === 0) {
    return {
      bins,
      binsUsed: 0,
      method: 'equal-width',
      degenerate: false,
      boundaryDecimalPlaces: 0,
      buckets: [],
    }
  }

  const min = sorted[0]
  const max = sorted[count - 1]
  if (min === max) {
    return {
      bins,
      binsUsed: 1,
      method: 'equal-width',
      degenerate: true,
      boundaryDecimalPlaces: scale,
      buckets: [
        {
          index: 0,
          lower: formatDecimal(min, scale),
          upper: formatDecimal(max, scale),
          count,
        },
      ],
    }
  }

  const range = max - min
  const targetScale = Math.min(scale + DERIVED_EXTRA_PLACES, MAX_DECIMAL_PLACES)
  const counts = Array.from({ length: bins }, () => 0)
  for (const value of sorted) {
    const scaledIndex = Number(((value - min) * BigInt(bins)) / range)
    const index = scaledIndex >= bins ? bins - 1 : scaledIndex
    counts[index] += 1
  }

  const boundaries = Array.from({ length: bins + 1 }, (_, index) =>
    formatBoundary(min, range, index, bins, scale, targetScale),
  )
  const buckets = counts.map((bucketCount, index) => ({
    index,
    lower: boundaries[index],
    upper: boundaries[index + 1],
    count: bucketCount,
  }))

  return {
    bins,
    binsUsed: bins,
    method: 'equal-width',
    degenerate: false,
    boundaryDecimalPlaces: targetScale,
    buckets,
  }
}

/**
 * Compute the linearly interpolated percentile at one basis-point position.
 *
 * The position is `(n - 1) * q / 10000` on the zero-based sorted array, and the
 * value is interpolated between the two neighbouring observations.
 *
 * @param {bigint[]} sorted Ascending values at `scale`.
 * @param {number} scale Source decimal places.
 * @param {number} basisPoints Percentile in basis points, 0 through 10000.
 * @returns {string | null} Percentile text, or null for an empty column.
 */
function percentile(sorted, scale, basisPoints) {
  const count = sorted.length
  if (count === 0) return null

  const position = BigInt(basisPoints) * BigInt(count - 1)
  const lowerIndex = Number(position / 10000n)
  const remainder = Number(position % 10000n)
  const upperIndex = Math.min(lowerIndex + 1, count - 1)
  const targetScale = Math.min(scale + DERIVED_EXTRA_PLACES, MAX_DECIMAL_PLACES)
  const factor = 10n ** BigInt(targetScale - scale)
  const scaled =
    sorted[lowerIndex] * factor
    + divideRounded((sorted[upperIndex] - sorted[lowerIndex]) * BigInt(remainder) * factor, 10000n)

  return formatDecimal(scaled, targetScale, { trimTrailingZeros: true, minScale: scale })
}

/**
 * Compute count/min/max/mean/median/percentiles/histogram for one column.
 *
 * @param {string[]} values Raw column cells in row order.
 * @param {number} bins Validated histogram bucket count.
 * @returns {{
 *   count: number,
 *   min: string | null,
 *   max: string | null,
 *   mean: string | null,
 *   median: string | null,
 *   percentiles: Record<string, string | null>,
 *   histogram: ReturnType<typeof buildHistogram>,
 *   nonNumericCount: number,
 *   nonNumericSamples: string[],
 * }} Distribution result.
 */
function distribution(values, bins) {
  const decimals = []
  const nonNumeric = []
  let missing = 0

  for (const value of values) {
    if (value === '') {
      missing += 1
      continue
    }
    const parsed = parseDecimal(value)
    if (parsed === null) {
      if (nonNumeric.length < 5) nonNumeric.push(value)
      continue
    }
    decimals.push(parsed)
  }

  const scale = decimals.reduce((max, entry) => Math.max(max, entry.scale), 0)
  const sorted = decimals
    .map((entry) => entry.unscaled * 10n ** BigInt(scale - entry.scale))
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
  const count = sorted.length
  const emptyPercentiles = Object.fromEntries(Object.keys(PERCENTILE_POINTS).map((key) => [key, null]))

  if (count === 0) {
    return {
      count: 0,
      missing,
      min: null,
      max: null,
      mean: null,
      median: null,
      percentiles: emptyPercentiles,
      histogram: buildHistogram([], scale, bins),
      nonNumericCount: values.length - missing,
      nonNumericSamples: nonNumeric,
    }
  }

  const total = sorted.reduce((sum, value) => sum + value, 0n)
  const meanScale = Math.min(scale + DERIVED_EXTRA_PLACES, MAX_DECIMAL_PLACES)
  const scaledMean = divideRounded(total * 10n ** BigInt(meanScale - scale), BigInt(count))
  const valuesByPercentile = Object.fromEntries(
    Object.entries(PERCENTILE_POINTS).map(([key, points]) => [key, percentile(sorted, scale, points)]),
  )

  return {
    count,
    missing,
    min: formatDecimal(sorted[0], scale),
    max: formatDecimal(sorted[count - 1], scale),
    mean: formatDecimal(scaledMean, meanScale, { trimTrailingZeros: true, minScale: scale }),
    median: percentile(sorted, scale, 5000),
    percentiles: valuesByPercentile,
    histogram: buildHistogram(sorted, scale, bins),
    nonNumericCount: values.length - missing - count,
    nonNumericSamples: nonNumeric,
  }
}

/**
 * Compute the distribution result for one CSV text.
 *
 * @param {{
 *   text: string,
 *   path?: string | null,
 *   sha256?: string | null,
 *   bytes?: number | null,
 *   column: string,
 *   bins?: number | null,
 * }} input CSV text, source metadata, column name, and optional bucket count.
 * @returns {Record<string, unknown>} Source metadata, distribution statistics, and limitations.
 * @throws {CsvInputError} When the column is empty or absent, or `bins` is invalid.
 */
export function computeDistribution(input) {
  const { text, path = null, sha256 = null, bytes = null, column, bins = DEFAULT_BINS } = input ?? {}
  const table = parseCsv(text)
  const columns = table.header
  const rows = table.rows

  if (typeof column !== 'string' || column.trim() === '') {
    throw new CsvInputError('column must be a non-empty string naming a column in the header')
  }
  const columnName = column.trim()
  const columnIndex = columns.indexOf(columnName)
  if (columnIndex === -1) {
    throw new CsvInputError(
      `column "${columnName}" is not a column in this file; available columns: ${columns.length === 0 ? '(none)' : columns.join(', ')}`,
    )
  }

  const bucketCount = normalizeBins(bins)
  const values = rows.map((row) => row[columnIndex] ?? '')
  const result = distribution(values, bucketCount)
  const limitations = [...table.issues]

  if (result.nonNumericCount > 0) {
    limitations.push(
      `列 "${columnName}" 有 ${result.nonNumericCount} 个非空单元格不是纯十进制数字（如货币符号、千分位逗号、百分号），未计入分布统计。`,
    )
  }
  if (result.count === 0) {
    limitations.push(`列 "${columnName}" 没有可解析的十进制数字，count/min/max/mean/median/percentiles 为空，histogram 没有桶。`)
  }
  if (result.count > 0 && result.histogram.degenerate) {
    limitations.push('该列所有可解析数值相同，等宽直方图退化为 1 个桶。')
  }
  if (result.count > 0 && !result.histogram.degenerate) {
    limitations.push('直方图为等宽区间，除最后一个区间外左闭右开；边界最多保留 6 位额外小数，计数按精确有理数分配。')
  }
  limitations.push('分位数按 (n-1)*p 位置线性插值，median 等于 p50。')
  limitations.push('分布统计只做数据画像，不判断数据是否合规、异常或存在舞弊。')
  limitations.push('按 UTF-8 解码；其他编码（如 GBK）可能产生替换字符。')

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
    column: columnName,
    count: result.count,
    missing: {
      count: result.missing,
      total: values.length,
      nonNumericCount: result.nonNumericCount,
      nonNumericSamples: result.nonNumericSamples,
    },
    min: result.min,
    max: result.max,
    mean: result.mean,
    median: result.median,
    percentiles: result.percentiles,
    histogram: result.histogram,
    limitations,
  }
}
