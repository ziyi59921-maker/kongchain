import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeDistribution,
  formatDecimal,
  isInsideRoot,
  normalizeBins,
  parseCsv,
  parseDecimal,
} from '../src/stats.js'

/**
 * Build a one-column or multi-column CSV from a header and row tuples.
 * @param {string[]} header Header cells.
 * @param {Array<Array<string>>} rows Data rows.
 * @returns {string} CSV text.
 */
function csv(header, rows) {
  return [header.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

test('parseCsv follows RFC 4180 quoting, embedded newlines, and CRLF', () => {
  const table = parseCsv('name,note\r\n"a,b","line1\nline2"\r\n"say ""hi""",ok\r\n')
  assert.deepEqual(table.header, ['name', 'note'])
  assert.deepEqual(table.rows, [
    ['a,b', 'line1\nline2'],
    ['say "hi"', 'ok'],
  ])
  assert.equal(table.delimiter, ',')
  assert.equal(table.bomStripped, false)
})

test('parseCsv detects semicolons and strips a BOM', () => {
  const table = parseCsv('\ufeffamount;label\n1.5;x\n')
  assert.deepEqual(table.header, ['amount', 'label'])
  assert.deepEqual(table.rows, [['1.5', 'x']])
  assert.equal(table.delimiter, ';')
  assert.equal(table.bomStripped, true)
})

test('parseDecimal accepts plain decimals and rejects formatted amounts', () => {
  assert.deepEqual(parseDecimal('-12.50'), { unscaled: -1250n, scale: 2 })
  assert.deepEqual(parseDecimal('.5'), { unscaled: 5n, scale: 1 })
  assert.equal(parseDecimal('1,200.00'), null)
  assert.equal(parseDecimal('¥300'), null)
  assert.equal(parseDecimal('12%'), null)
  assert.equal(parseDecimal('(100)'), null)
  assert.equal(parseDecimal('1e3'), null)
})

test('formatDecimal keeps fixed-point text without exponent notation', () => {
  assert.equal(formatDecimal(4250n, 2), '42.50')
  assert.equal(formatDecimal(-5n, 2), '-0.05')
  assert.equal(formatDecimal(1500000000n, 8, { trimTrailingZeros: true, minScale: 2 }), '15.00')
})

test('isInsideRoot accepts the root and rejects a sibling escape', () => {
  assert.equal(isInsideRoot('F:\\KongChain\\a.csv', 'F:\\KongChain'), true)
  assert.equal(isInsideRoot('F:\\KongChain-evil\\a.csv', 'F:\\KongChain'), false)
})

test('normalizeBins defaults to 10 and rejects out-of-range or fractional values', () => {
  assert.equal(normalizeBins(undefined), 10)
  assert.equal(normalizeBins(null), 10)
  assert.equal(normalizeBins(1), 1)
  assert.equal(normalizeBins(100), 100)
  assert.throws(() => normalizeBins(0), { name: 'CsvInputError' })
  assert.throws(() => normalizeBins(2.5), { name: 'CsvInputError' })
  assert.throws(() => normalizeBins(101), { name: 'CsvInputError' })
})

test('empty column yields null statistics and no histogram buckets', () => {
  const result = computeDistribution({
    text: csv(['id', 'amount'], [['1', ''], ['2', '']]),
    column: 'amount',
    bins: 5,
  })

  assert.equal(result.count, 0)
  assert.equal(result.missing.count, 2)
  assert.equal(result.missing.total, 2)
  assert.equal(result.min, null)
  assert.equal(result.max, null)
  assert.equal(result.mean, null)
  assert.equal(result.median, null)
  assert.deepEqual(result.percentiles, { p25: null, p50: null, p75: null, p90: null, p95: null })
  assert.equal(result.histogram.bins, 5)
  assert.equal(result.histogram.binsUsed, 0)
  assert.deepEqual(result.histogram.buckets, [])
  assert.ok(result.limitations.some((line) => line.includes('没有可解析的十进制数字')))
})

test('single value reports the same value for every statistic', () => {
  const result = computeDistribution({ text: csv(['amount'], [['42.50']]), column: 'amount' })

  assert.equal(result.count, 1)
  assert.equal(result.min, '42.50')
  assert.equal(result.max, '42.50')
  assert.equal(result.mean, '42.50')
  assert.equal(result.median, '42.50')
  assert.deepEqual(result.percentiles, {
    p25: '42.50',
    p50: '42.50',
    p75: '42.50',
    p90: '42.50',
    p95: '42.50',
  })
  assert.equal(result.histogram.degenerate, true)
  assert.equal(result.histogram.binsUsed, 1)
  assert.deepEqual(result.histogram.buckets, [
    { index: 0, lower: '42.50', upper: '42.50', count: 1 },
  ])
})

test('duplicate values keep percentiles exact and collapse the histogram', () => {
  const result = computeDistribution({
    text: csv(['amount'], [['5.00'], ['5.00'], ['5.00'], ['5.00']]),
    column: 'amount',
    bins: 4,
  })

  assert.equal(result.count, 4)
  assert.equal(result.median, '5.00')
  assert.equal(result.percentiles.p25, '5.00')
  assert.equal(result.percentiles.p95, '5.00')
  assert.equal(result.histogram.degenerate, true)
  assert.equal(result.histogram.binsUsed, 1)
  assert.equal(result.histogram.buckets[0].count, 4)
})

test('missing cells are counted but excluded from numeric statistics', () => {
  const result = computeDistribution({
    text: csv(['id', 'amount'], [['1', '1.50'], ['2', ''], ['3', '3.50'], ['4', ''], ['5', '2.00']]),
    column: 'amount',
    bins: 10,
  })

  assert.equal(result.count, 3)
  assert.equal(result.missing.count, 2)
  assert.equal(result.missing.total, 5)
  assert.equal(result.missing.nonNumericCount, 0)
  assert.equal(result.min, '1.50')
  assert.equal(result.max, '3.50')
  assert.equal(result.mean, '2.33333333')
  assert.equal(result.median, '2.00')
  assert.equal(result.percentiles.p25, '1.75')
  assert.equal(result.percentiles.p75, '2.75')
  assert.equal(result.histogram.buckets.reduce((sum, bucket) => sum + bucket.count, 0), 3)
})

test('percentiles interpolate at (n-1)*p positions', () => {
  const result = computeDistribution({
    text: csv(['amount'], [['0'], ['10'], ['20'], ['30']]),
    column: 'amount',
    bins: 2,
  })

  assert.equal(result.min, '0')
  assert.equal(result.max, '30')
  assert.equal(result.mean, '15')
  assert.equal(result.median, '15')
  assert.deepEqual(result.percentiles, {
    p25: '7.5',
    p50: '15',
    p75: '22.5',
    p90: '27',
    p95: '28.5',
  })
})

test('percentiles interpolate across negative values', () => {
  const result = computeDistribution({
    text: csv(['amount'], [['-10'], ['0'], ['10'], ['20']]),
    column: 'amount',
    bins: 2,
  })

  assert.equal(result.median, '5')
  assert.equal(result.percentiles.p25, '-2.5')
  assert.equal(result.percentiles.p75, '12.5')
})

test('equal-width histogram uses exact half-open boundary assignment', () => {
  const result = computeDistribution({
    text: csv(['value'], [['0'], ['1'], ['2'], ['3'], ['4']]),
    column: 'value',
    bins: 2,
  })

  assert.equal(result.histogram.method, 'equal-width')
  assert.equal(result.histogram.boundaryDecimalPlaces, 6)
  assert.deepEqual(result.histogram.buckets, [
    { index: 0, lower: '0', upper: '2', count: 2 },
    { index: 1, lower: '2', upper: '4', count: 3 },
  ])
})

test('a value on an interior boundary belongs to the bucket starting there', () => {
  const result = computeDistribution({
    text: csv(['value'], [['0'], ['2'], ['4']]),
    column: 'value',
    bins: 2,
  })

  assert.deepEqual(result.histogram.buckets, [
    { index: 0, lower: '0', upper: '2', count: 1 },
    { index: 1, lower: '2', upper: '4', count: 2 },
  ])
})

test('three-bin boundaries use rounded display text while counts stay exact', () => {
  const result = computeDistribution({
    text: csv(['value'], [['0'], ['5'], ['10']]),
    column: 'value',
    bins: 3,
  })

  assert.deepEqual(result.histogram.buckets, [
    { index: 0, lower: '0', upper: '3.333333', count: 1 },
    { index: 1, lower: '3.333333', upper: '6.666667', count: 1 },
    { index: 2, lower: '6.666667', upper: '10', count: 1 },
  ])
})

test('non-decimal cells are reported and excluded without silently rewriting them', () => {
  const result = computeDistribution({
    text: csv(['id', 'amount'], [['1', '"1,200.00"'], ['2', '300'], ['3', 'N/A']]),
    column: 'amount',
    bins: 4,
  })

  assert.equal(result.count, 1)
  assert.equal(result.missing.count, 0)
  assert.equal(result.missing.nonNumericCount, 2)
  assert.deepEqual(result.missing.nonNumericSamples, ['1,200.00', 'N/A'])
  assert.equal(result.min, '300')
  assert.equal(result.max, '300')
  assert.ok(result.limitations.some((line) => line.includes('不是纯十进制数字')))
})

test('unknown column fails with the available column list', () => {
  assert.throws(
    () => computeDistribution({ text: csv(['id', 'amount'], [['1', '2']]), column: 'total' }),
    (error) => error.name === 'CsvInputError' && /available columns: id, amount/.test(error.message),
  )
})

test('empty column name fails explicitly', () => {
  assert.throws(
    () => computeDistribution({ text: csv(['id'], [['1']]), column: '  ' }),
    { name: 'CsvInputError' },
  )
})

test('header-only CSV returns an empty distribution for the named column', () => {
  const result = computeDistribution({ text: 'amount\n', column: 'amount' })
  assert.equal(result.source.rowCount, 0)
  assert.equal(result.count, 0)
  assert.equal(result.missing.total, 0)
  assert.deepEqual(result.histogram.buckets, [])
})
