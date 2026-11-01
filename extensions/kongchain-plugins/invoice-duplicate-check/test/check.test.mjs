import test from 'node:test'
import assert from 'node:assert/strict'
import { checkRecords } from '../src/check.js'

test('reports invoices with the same supplier, invoice number, and amount as duplicates', () => {
  const rows = [
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: 1000 },
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: 1000 },
    { supplier: '乙公司', invoiceNo: 'INV-002', amount: 1000 },
  ]

  const result = checkRecords(rows)

  assert.equal(result.checked, 3)
  assert.deepEqual(result.match, ['supplier', 'invoiceNo', 'amount'])
  assert.equal(result.duplicates.length, 1)
  assert.deepEqual(result.duplicates[0], {
    key: { supplier: '甲公司', invoiceNo: 'INV-001', amount: '1000' },
    count: 2,
    rows: [rows[0], rows[1]],
  })
})

test('does not report invoices as duplicates when their amounts differ', () => {
  const result = checkRecords([
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: 1000 },
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: 1000.01 },
  ])

  assert.deepEqual(result.duplicates, [])
})

test('supports matching only supplier and invoice number', () => {
  const rows = [
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: 1000 },
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: 2000 },
  ]

  const result = checkRecords(rows, ['supplier', 'invoiceNo'])

  assert.deepEqual(result.match, ['supplier', 'invoiceNo'])
  assert.equal(result.duplicates.length, 1)
  assert.equal(result.duplicates[0].count, 2)
  assert.deepEqual(result.duplicates[0].key, { supplier: '甲公司', invoiceNo: 'INV-001' })
})

test('supports a single-field match', () => {
  const rows = [
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: 1000 },
    { supplier: '甲公司', invoiceNo: 'INV-002', amount: 2000 },
  ]

  const result = checkRecords(rows, ['supplier'])

  assert.deepEqual(result.match, ['supplier'])
  assert.deepEqual(result.duplicates[0].key, { supplier: '甲公司' })
})

test('deduplicates repeated match fields and trims their names', () => {
  const result = checkRecords([{ supplier: '甲公司' }], [' supplier', 'supplier'])

  assert.deepEqual(result.match, ['supplier'])
})

test('rejects an empty match array instead of silently using the default', () => {
  assert.throws(() => checkRecords([], []), { name: 'MatchConfigError', code: 'INVALID_MATCH' })
  assert.throws(() => checkRecords([], []), /match must not be empty/)
})

test('rejects unknown match fields with the offending name and the allowed set', () => {
  assert.throws(() => checkRecords([], ['supplier', 'vendor']), {
    name: 'MatchConfigError',
    code: 'INVALID_MATCH',
  })
  assert.throws(
    () => checkRecords([], ['vendor']),
    /match contains unsupported field "vendor"; allowed fields are supplier, invoiceNo, amount\./,
  )
})

test('rejects a match value that is not an array or contains non-string entries', () => {
  assert.throws(() => checkRecords([], 'supplier'), /match must be an array of field names/)
  assert.throws(() => checkRecords([], ['supplier', 42]), /match entry 2 must be a field name string/)
  assert.throws(() => checkRecords([], ['']), /match entry 1 is empty/)
})

test('returns an empty result for an empty invoice array', () => {
  const result = checkRecords([])

  assert.equal(result.checked, 0)
  assert.deepEqual(result.duplicates, [])
  assert.deepEqual(result.match, ['supplier', 'invoiceNo', 'amount'])
})

test('treats numeric and formatted string amounts with the same value as duplicates', () => {
  const result = checkRecords([
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: '1,000.00' },
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: 1000 },
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: '001000.0' },
  ])

  assert.equal(result.duplicates.length, 1)
  assert.equal(result.duplicates[0].count, 3)
})

test('handles missing fields without throwing and does not group incomplete invoices', () => {
  const result = checkRecords([
    { supplier: '甲公司', amount: 1000 },
    { supplier: '甲公司', invoiceNo: '', amount: 1000 },
    { supplier: '甲公司', invoiceNo: 'INV-001' },
    null,
  ])

  assert.equal(result.checked, 4)
  assert.deepEqual(result.duplicates, [])
})

test('distinguishes invoice numbers by letter case by default', () => {
  const result = checkRecords([
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: 1000 },
    { supplier: '甲公司', invoiceNo: 'inv-001', amount: 1000 },
  ])

  assert.deepEqual(result.duplicates, [])
})

test('treats invoice numbers differing only in letter case as duplicates when caseSensitive is false', () => {
  const rows = [
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: 1000 },
    { supplier: '甲公司', invoiceNo: 'inv-001', amount: 1000 },
  ]

  const result = checkRecords(rows, undefined, false)

  assert.equal(result.checked, 2)
  assert.equal(result.duplicates.length, 1)
  assert.equal(result.duplicates[0].count, 2)
  assert.deepEqual(result.duplicates[0].key, { supplier: '甲公司', invoiceNo: 'INV-001', amount: '1000' })
})

test('keeps supplier names case-sensitive when caseSensitive is false', () => {
  const result = checkRecords(
    [
      { supplier: 'Acme Ltd', invoiceNo: 'INV-001', amount: 1000 },
      { supplier: 'ACME LTD', invoiceNo: 'INV-001', amount: 1000 },
    ],
    undefined,
    false,
  )

  assert.deepEqual(result.duplicates, [])
})

test('rejects a caseSensitive value that is not a boolean', () => {
  assert.throws(() => checkRecords([], undefined, 'false'), {
    name: 'CaseSensitivityConfigError',
    code: 'INVALID_CASE_SENSITIVE',
  })
  assert.throws(() => checkRecords([], undefined, 'no'), /caseSensitive must be a boolean; received a string\./)
})

test('handles malformed rows without throwing', () => {
  const result = checkRecords(null)

  assert.equal(result.checked, 0)
  assert.deepEqual(result.duplicates, [])
  assert.deepEqual(result.match, ['supplier', 'invoiceNo', 'amount'])
})
