import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { analyzeCsv, resolveAuthorizedCsv, WORKSPACE_ROOT } from '../src/check.js'

const BASIC = fileURLToPath(new URL('./fixtures/basic.csv', import.meta.url))
const HEADER_ONLY = fileURLToPath(new URL('./fixtures/header-only.csv', import.meta.url))
const ZERO_BYTES = fileURLToPath(new URL('./fixtures/zero-bytes.csv', import.meta.url))
const UPPER = fileURLToPath(new URL('./fixtures/upper.CSV', import.meta.url))

/**
 * Analyze a fixture and return the parsed result.
 * @param {string} path Fixture path.
 * @param {string} [amountColumn] Optional requested column.
 * @returns {Record<string, unknown>} Parsed statistics.
 */
function analyze(path, amountColumn) {
  return JSON.parse(analyzeCsv(amountColumn === undefined ? { path } : { path, amountColumn }))
}

test('analyzes a fixture with quoted commas, a missing amount, and a negative value', () => {
  const result = analyze(BASIC)

  assert.equal(result.source.rowCount, 4)
  assert.equal(result.source.columnCount, 4)
  assert.deepEqual(result.source.columns, ['supplier', 'invoiceNo', 'amount', 'note'])
  assert.equal(result.source.delimiter, ',')
  assert.equal(result.source.encoding, 'utf-8')
  assert.equal(result.source.blankRows, 0)
  assert.equal(result.missing.total, 3)
  assert.deepEqual(
    result.missing.byColumn.map((entry) => [entry.column, entry.missing, entry.kind]),
    [
      ['supplier', 0, 'text'],
      ['invoiceNo', 0, 'text'],
      ['amount', 1, 'numeric'],
      ['note', 2, 'text'],
    ],
  )
  assert.deepEqual(result.numeric.columns.map((entry) => entry.column), ['amount'])
  const [amount] = result.numeric.columns
  assert.equal(amount.count, 3)
  assert.equal(amount.sum, '1455.25')
  assert.equal(amount.mean, '485.08333333')
  assert.equal(amount.min, '-45.25')
  assert.equal(amount.max, '1200.50')
})

test('reports the real path, byte size, and SHA-256 of the analyzed file', () => {
  const result = analyze(BASIC)
  const bytes = readFileSync(BASIC)

  assert.equal(result.source.path, BASIC)
  assert.equal(result.source.bytes, statSync(BASIC).size)
  assert.equal(result.source.sha256, createHash('sha256').update(bytes).digest('hex'))
})

test('accepts a relative path resolved against the workspace root', () => {
  const relative = UPPER.slice(WORKSPACE_ROOT.length + 1)

  const result = analyze(relative)
  assert.equal(result.source.columnCount, 1)
  assert.equal(result.numeric.columns[0].sum, '1')
})

test('analyzes a header-only fixture as zero rows', () => {
  const result = analyze(HEADER_ONLY)

  assert.equal(result.source.rowCount, 0)
  assert.deepEqual(result.source.columns, ['supplier', 'amount'])
  assert.deepEqual(result.numeric.columns, [])
})

test('analyzes a zero-byte fixture as no columns', () => {
  const result = analyze(ZERO_BYTES)

  assert.equal(result.source.rowCount, 0)
  assert.equal(result.source.columnCount, 0)
  assert.ok(result.limitations.some((line) => line.includes('没有表头行')))
})

test('restricts numeric statistics to amountColumn and reports non-decimal cells', () => {
  const result = analyze(BASIC, 'note')
  const [note] = result.numeric.columns

  assert.equal(result.numeric.requestedColumn, 'note')
  assert.equal(note.column, 'note')
  assert.equal(note.count, 0)
  assert.equal(note.nonNumericCount, 2)
  assert.deepEqual(note.nonNumericSamples, ['含税, 普票', '带"引号"字段'])
})

test('rejects a path outside the authorized workspace', () => {
  assert.throws(() => resolveAuthorizedCsv(resolve(WORKSPACE_ROOT, '..', 'outside.csv')), {
    name: 'PathAuthorizationError',
    message: /path outside authorized workspace/,
  })
})

test('rejects a relative path that climbs out of the workspace', () => {
  assert.throws(() => resolveAuthorizedCsv('../../../outside.csv'), {
    name: 'PathAuthorizationError',
    message: /path outside authorized workspace/,
  })
})

test('rejects an empty path before touching the filesystem', () => {
  assert.throws(() => resolveAuthorizedCsv('   '), { name: 'CsvInputError' })
  assert.throws(() => resolveAuthorizedCsv(42), { name: 'CsvInputError' })
})

test('rejects a non-CSV file inside the workspace', () => {
  assert.throws(() => resolveAuthorizedCsv('package.json'), {
    name: 'CsvInputError',
    message: /unsupported file type "\.json"/,
  })
})

test('reports a missing authorized file with its requested path', () => {
  assert.throws(() => resolveAuthorizedCsv('extensions/kongchain-plugins/csv-statistics/test/fixtures/missing.csv'), {
    name: 'CsvInputError',
    message: /file not found/,
  })
})
