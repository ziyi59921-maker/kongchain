import test from 'node:test'
import assert from 'node:assert/strict'
import { join, resolve } from 'node:path'
import {
  computeStatistics,
  formatDecimal,
  isInsideRoot,
  parseCsv,
  parseDecimal,
} from '../src/stats.js'

/**
 * Build statistics from CSV text without touching the filesystem.
 * @param {string} text CSV text.
 * @param {string | null} [amountColumn] Optional requested column.
 * @returns {Record<string, unknown>} Statistics result.
 */
function statsOf(text, amountColumn = null) {
  return computeStatistics({ text, amountColumn })
}

/**
 * Read the single numeric column entry for a named column.
 * @param {Record<string, unknown>} result Statistics result.
 * @param {string} column Column name.
 * @returns {Record<string, unknown>} Numeric entry.
 */
function numericOf(result, column) {
  const entry = result.numeric.columns.find((candidate) => candidate.column === column)
  assert.ok(entry, `expected numeric entry for ${column}`)
  return entry
}

test('parses quoted fields containing commas, doubled quotes, and CRLF line endings', () => {
  const table = parseCsv('a,b\r\n"x, y","he said ""hi"""\r\n')

  assert.deepEqual(table.header, ['a', 'b'])
  assert.deepEqual(table.rows, [['x, y', 'he said "hi"']])
})

test('keeps a quoted newline inside one field', () => {
  const table = parseCsv('note,amount\n"line one\nline two",10\n')

  assert.equal(table.rows.length, 1)
  assert.equal(table.rows[0][0], 'line one\nline two')
  assert.equal(table.rows[0][1], '10')
})

test('reports an empty header-only table as zero rows', () => {
  const result = statsOf('supplier,amount\n')

  assert.equal(result.source.rowCount, 0)
  assert.deepEqual(result.source.columns, ['supplier', 'amount'])
  assert.equal(result.source.columnCount, 2)
  assert.equal(result.missing.total, 0)
  assert.deepEqual(result.numeric.columns, [])
  assert.deepEqual(
    result.missing.byColumn.map((entry) => [entry.column, entry.kind, entry.missing]),
    [
      ['supplier', 'empty', 0],
      ['amount', 'empty', 0],
    ],
  )
})

test('reports a zero-byte file without inventing columns', () => {
  const result = statsOf('')

  assert.equal(result.source.rowCount, 0)
  assert.equal(result.source.columnCount, 0)
  assert.deepEqual(result.source.columns, [])
  assert.equal(result.missing.total, 0)
  assert.deepEqual(result.numeric.columns, [])
  assert.ok(result.limitations.some((line) => line.includes('没有表头行')))
})

test('counts missing values per column and keeps them out of the numeric count', () => {
  const result = statsOf('name,amount\nA,10\nB,\nC,30\n')

  assert.equal(result.source.rowCount, 3)
  assert.equal(result.missing.total, 1)
  assert.deepEqual(
    result.missing.byColumn.map((entry) => [entry.column, entry.missing, entry.filled, entry.kind]),
    [
      ['name', 0, 3, 'text'],
      ['amount', 1, 2, 'numeric'],
    ],
  )
  assert.equal(numericOf(result, 'amount').count, 2)
  assert.equal(numericOf(result, 'amount').sum, '40')
  assert.equal(numericOf(result, 'amount').mean, '20')
})

test('sums, means, minimums, and maximums with negative values', () => {
  const result = statsOf('amount\n-10.50\n20\n-3.25\n')
  const amount = numericOf(result, 'amount')

  assert.equal(amount.count, 3)
  assert.equal(amount.sum, '6.25')
  assert.equal(amount.mean, '2.08333333')
  assert.equal(amount.min, '-10.50')
  assert.equal(amount.max, '20.00')
  assert.equal(amount.decimalPlaces, 2)
})

test('adds decimals without binary floating-point error', () => {
  const result = statsOf('amount\n0.1\n0.2\n')
  const amount = numericOf(result, 'amount')

  assert.equal(amount.sum, '0.3')
  assert.equal(amount.mean, '0.15')
})

test('keeps precision for large decimal sums', () => {
  const result = statsOf('amount\n12345678901234.56\n0.44\n')
  const amount = numericOf(result, 'amount')

  assert.equal(amount.sum, '12345678901235.00')
  assert.equal(amount.mean, '6172839450617.50')
})

test('formats a mean exactly when the division terminates', () => {
  const result = statsOf('amount\n4.50\n4.50\n')

  assert.equal(numericOf(result, 'amount').mean, '4.50')
})

test('rounds a mean half away from zero at the reported scale', () => {
  const result = statsOf('amount\n0.01\n0.02\n0.02\n')

  assert.equal(numericOf(result, 'amount').mean, '0.01666667')
})

test('treats thousands separators, currency symbols, and percent signs as non-numeric', () => {
  const result = statsOf('amount\n"1,200.00"\n¥300\n12%\n40\n', 'amount')
  const amount = numericOf(result, 'amount')

  assert.equal(amount.count, 1)
  assert.equal(amount.sum, '40')
  assert.equal(amount.nonNumericCount, 3)
  assert.deepEqual(amount.nonNumericSamples, ['1,200.00', '¥300', '12%'])
  assert.ok(result.limitations.some((line) => line.includes('非空单元格不是纯十进制数字')))
})

test('reports a requested amount column with no numbers as an empty count', () => {
  const result = statsOf('amount\n\n\n', 'amount')
  const amount = numericOf(result, 'amount')

  assert.equal(amount.count, 0)
  assert.equal(amount.sum, '0')
  assert.equal(amount.mean, null)
  assert.equal(amount.min, null)
  assert.equal(amount.max, null)
  assert.ok(result.limitations.some((line) => line.includes('没有可解析的十进制数字')))
})

test('excludes blank rows from the row count and reports how many were skipped', () => {
  const result = statsOf('a,b\n1,2\n,\n  ,  \n3,4\n')

  assert.equal(result.source.rowCount, 2)
  assert.equal(result.source.blankRows, 2)
  assert.ok(result.limitations.some((line) => line.includes('2 行全为空单元格')))
})

test('pads short rows with missing cells and flags them', () => {
  const result = statsOf('a,b,c\n1,2\n3,4,5\n')

  assert.equal(result.source.rowCount, 2)
  assert.equal(result.missing.total, 1)
  assert.deepEqual(result.missing.byColumn.map((entry) => entry.missing), [0, 0, 1])
  assert.ok(result.limitations.some((line) => line.includes('字段少于表头')))
})

test('renames duplicate header cells and reports the rename', () => {
  const result = statsOf('amount,amount\n1,2\n')

  assert.deepEqual(result.source.columns, ['amount', 'amount#2'])
  assert.ok(result.limitations.some((line) => line.includes('重复出现')))
})

test('detects a semicolon delimiter', () => {
  const result = statsOf('name;amount\nA;10\nB;20\n')

  assert.equal(result.source.delimiter, ';')
  assert.deepEqual(result.source.columns, ['name', 'amount'])
  assert.equal(numericOf(result, 'amount').sum, '30')
})

test('strips a UTF-8 BOM before reading the header', () => {
  const result = statsOf('\uFEFFamount\n1\n')

  assert.equal(result.source.bomStripped, true)
  assert.deepEqual(result.source.columns, ['amount'])
})

test('fails with the available columns when amountColumn is unknown', () => {
  assert.throws(() => statsOf('amount,note\n1,x\n', 'total'), {
    name: 'CsvInputError',
    message: /amountColumn "total" is not a column in this file; available columns: amount, note/,
  })
})

test('summarizes only the requested column when amountColumn is given', () => {
  const result = statsOf('qty,price\n2,10.50\n3,20.00\n', 'price')

  assert.equal(result.numeric.requestedColumn, 'price')
  assert.deepEqual(result.numeric.columns.map((entry) => entry.column), ['price'])
  assert.equal(numericOf(result, 'price').sum, '30.50')
})

test('parses only plain decimals as numbers', () => {
  assert.deepEqual(parseDecimal('  12.50 '), { unscaled: 1250n, scale: 2 })
  assert.deepEqual(parseDecimal('-.5'), { unscaled: -5n, scale: 1 })
  assert.equal(parseDecimal('1e3'), null)
  assert.equal(parseDecimal('1 000'), null)
  assert.equal(parseDecimal(''), null)
  assert.equal(parseDecimal('12,50'), null)
})

test('formats fixed-point values without exponent notation', () => {
  assert.equal(formatDecimal(0n, 2), '0.00')
  assert.equal(formatDecimal(-5n, 2), '-0.05')
  assert.equal(formatDecimal(150n, 0), '150')
  assert.equal(formatDecimal(1500000n, 8, { trimTrailingZeros: true, minScale: 2 }), '0.015')
})

test('rejects paths that escape the authorized root', () => {
  const root = resolve(process.cwd(), 'workspace-root')

  assert.equal(isInsideRoot(join(root, 'extensions', 'a.csv'), root), true)
  assert.equal(isInsideRoot(root, root), true)
  assert.equal(isInsideRoot(join(root, '..', 'outside.csv'), root), false)
  assert.equal(isInsideRoot(resolve(root, '..', 'sibling', 'a.csv'), root), false)
  assert.equal(isInsideRoot(root + '-logs', root), false)
})

test('always states the arithmetic, encoding, and non-compliance limits', () => {
  const result = statsOf('amount\n1\n')

  assert.ok(result.limitations.some((line) => line.includes('BigInt 定点运算')))
  assert.ok(result.limitations.some((line) => line.includes('UTF-8')))
  assert.ok(result.limitations.some((line) => line.includes('不判断数据是否合规')))
})
