import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_KEYWORDS, contractTermTags, resolveKeywords } from '../src/check.js'

test('defaults to the four contract keywords', () => {
  assert.deepEqual(DEFAULT_KEYWORDS, ['验收', '付款', '违约', '税率'])
  assert.deepEqual(resolveKeywords(undefined), ['验收', '付款', '违约', '税率'])
})

test('empty text yields zero counts and no positions for every default keyword', () => {
  assert.deepEqual(contractTermTags(''), {
    textLength: 0,
    totalHits: 0,
    keywords: [
      { keyword: '验收', count: 0, firstIndex: -1, snippet: '' },
      { keyword: '付款', count: 0, firstIndex: -1, snippet: '' },
      { keyword: '违约', count: 0, firstIndex: -1, snippet: '' },
      { keyword: '税率', count: 0, firstIndex: -1, snippet: '' },
    ],
  })
})

test('counts Chinese keywords and locates their first occurrence', () => {
  const text = '本合同验收合格后付款；逾期付款视为违约。'
  const result = contractTermTags(text)
  assert.equal(result.textLength, 20)
  assert.equal(result.totalHits, 4)
  assert.deepEqual(
    result.keywords.map((entry) => [entry.keyword, entry.count, entry.firstIndex]),
    [
      ['验收', 1, 3],
      ['付款', 2, 8],
      ['违约', 1, 17],
      ['税率', 0, -1],
    ],
  )
  assert.equal(result.keywords[0].snippet, text)
  assert.equal(result.keywords[1].snippet, text)
  assert.equal(result.keywords[3].snippet, '')
})

test('matching is case-insensitive for English keywords', () => {
  const text = 'Payment is due. PAYMENT received. payment confirmed.'
  const [entry] = contractTermTags(text, ['payment']).keywords
  assert.equal(entry.count, 3)
  assert.equal(entry.firstIndex, 0)
  assert.equal(entry.snippet, 'Payment is due. PAYMENT r…')
})

test('occurrences do not overlap', () => {
  const [entry] = contractTermTags('aaaa', ['aa']).keywords
  assert.deepEqual(entry, { keyword: 'aa', count: 2, firstIndex: 0, snippet: 'aaaa' })
})

test('regex metacharacters in a keyword match literally', () => {
  const [plus, dot] = contractTermTags('单价A+B合计；版本v1.0', ['A+B', '.']).keywords
  assert.equal(plus.count, 1)
  assert.equal(plus.firstIndex, 2)
  assert.equal(dot.count, 1)
  assert.equal(dot.firstIndex, 12)
})

test('firstIndex counts Unicode code points, so one emoji is one character', () => {
  const result = contractTermTags('😀付款期限30天。', ['付款'])
  assert.equal(result.textLength, 9)
  assert.equal(result.keywords[0].count, 1)
  assert.equal(result.keywords[0].firstIndex, 1)
})

test('snippet marks a window cut off by the text boundary', () => {
  const text = `${'甲'.repeat(30)}付款${'乙'.repeat(30)}`
  const [entry] = contractTermTags(text, ['付款']).keywords
  assert.equal(entry.firstIndex, 30)
  assert.equal(entry.snippet, `…${'甲'.repeat(12)}付款${'乙'.repeat(18)}…`)
})

test('snippet collapses whitespace runs to single spaces', () => {
  const [entry] = contractTermTags('甲乙\n\n付款    条件', ['付款']).keywords
  assert.equal(entry.snippet, '甲乙 付款 条件')
})

test('keeps caller order and reports every list entry, duplicates included', () => {
  const result = contractTermTags('付款后验收，验收合格再付款。', ['付款', '验收', '付款'])
  assert.deepEqual(
    result.keywords.map((entry) => [entry.keyword, entry.count, entry.firstIndex]),
    [
      ['付款', 2, 0],
      ['验收', 2, 3],
      ['付款', 2, 0],
    ],
  )
  assert.equal(result.totalHits, 6)
})

test('reports no hit for a keyword absent from non-empty text', () => {
  const [entry] = contractTermTags('本合同自签署之日起生效。', ['税率']).keywords
  assert.deepEqual(entry, { keyword: '税率', count: 0, firstIndex: -1, snippet: '' })
})

test('rejects a non-string text instead of coercing it', () => {
  assert.throws(() => contractTermTags(null), TypeError)
  assert.throws(() => contractTermTags(42), TypeError)
})

test('rejects a keyword list that is not an array', () => {
  assert.throws(() => contractTermTags('文本', '付款'), TypeError)
})

test('rejects an empty keyword list instead of falling back to defaults', () => {
  assert.throws(() => contractTermTags('文本', []), RangeError)
})

test('rejects non-string and empty keywords', () => {
  assert.throws(() => contractTermTags('文本', ['付款', 7]), TypeError)
  assert.throws(() => contractTermTags('文本', ['']), RangeError)
  assert.throws(() => resolveKeywords(['付款', null]), TypeError)
})
