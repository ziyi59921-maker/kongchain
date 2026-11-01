import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeCsv, PLUGIN_ROOT, resolveAuthorizedCsv, WORKSPACE_ROOT } from '../src/check.js'

const BASIC = fileURLToPath(new URL('./fixtures/basic.csv', import.meta.url))
const MISSING = fileURLToPath(new URL('./fixtures/missing.csv', import.meta.url))
const EMPTY = fileURLToPath(new URL('./fixtures/empty-column.csv', import.meta.url))

test('analyzeCsv reads a real authorized fixture and hashes its bytes', () => {
  const result = JSON.parse(analyzeCsv({ path: BASIC, column: 'amount', bins: 2 }))
  const bytes = readFileSync(BASIC)

  assert.equal(result.source.path, BASIC)
  assert.equal(result.source.bytes, bytes.length)
  assert.equal(result.source.sha256, createHash('sha256').update(bytes).digest('hex'))
  assert.equal(result.source.rowCount, 4)
  assert.equal(result.column, 'amount')
  assert.equal(result.count, 4)
  assert.equal(result.median, '15.00')
  assert.equal(result.histogram.binsUsed, 2)
})

test('a relative path resolves against the workspace root', () => {
  const relative = 'extensions/kongchain-plugins/csv-distribution/test/fixtures/basic.csv'
  const result = JSON.parse(analyzeCsv({ path: relative, column: 'amount' }))
  assert.equal(result.source.path, BASIC)
  assert.equal(result.source.path.startsWith(WORKSPACE_ROOT), true)
})

test('missing cells are visible through the file layer', () => {
  const result = JSON.parse(analyzeCsv({ path: MISSING, column: 'amount' }))
  assert.equal(result.count, 3)
  assert.equal(result.missing.count, 2)
  assert.equal(result.median, '2.00')
})

test('an all-missing column stays empty through the file layer', () => {
  const result = JSON.parse(analyzeCsv({ path: EMPTY, column: 'amount' }))
  assert.equal(result.count, 0)
  assert.equal(result.missing.count, 2)
  assert.equal(result.min, null)
})

test('resolveAuthorizedCsv rejects an absolute path outside the workspace', () => {
  assert.throws(() => resolveAuthorizedCsv('F:/outside-workspace.csv'), { name: 'PathAuthorizationError' })
})

test('resolveAuthorizedCsv rejects a parent-directory escape', () => {
  assert.throws(() => resolveAuthorizedCsv('../outside-workspace.csv'), { name: 'PathAuthorizationError' })
})

test('resolveAuthorizedCsv rejects an empty path', () => {
  assert.throws(() => resolveAuthorizedCsv('  '), { name: 'CsvInputError' })
})

test('resolveAuthorizedCsv reports a missing file', () => {
  assert.throws(
    () => resolveAuthorizedCsv('extensions/kongchain-plugins/csv-distribution/test/fixtures/absent.csv'),
    { name: 'CsvInputError', message: /file not found/ },
  )
})

test('resolveAuthorizedCsv rejects a non-CSV extension', () => {
  assert.throws(
    () => resolveAuthorizedCsv('extensions/kongchain-plugins/csv-distribution/package.json'),
    { name: 'CsvInputError', message: /unsupported file type/ },
  )
})

test('analyzeCsv rejects an unknown column', () => {
  assert.throws(
    () => analyzeCsv({ path: BASIC, column: 'total' }),
    { name: 'CsvInputError', message: /available columns/ },
  )
})

test('analyzeCsv rejects invalid bins before reading statistics', () => {
  assert.throws(
    () => analyzeCsv({ path: BASIC, column: 'amount', bins: 0 }),
    { name: 'CsvInputError', message: /bins must be an integer/ },
  )
})

test('analyzeCsv rejects NUL bytes as non-text', () => {
  const path = join(PLUGIN_ROOT, 'test', 'fixtures', `nul-${process.pid}.csv`)
  writeFileSync(path, Buffer.from([0x61, 0x2c, 0x62, 0x0a, 0x31, 0x2c, 0x00]))
  try {
    assert.throws(() => analyzeCsv({ path, column: 'a' }), {
      name: 'CsvInputError',
      message: /NUL bytes/,
    })
  } finally {
    rmSync(path, { force: true })
  }
})
