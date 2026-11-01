import test from 'node:test'
import assert from 'node:assert/strict'
import { apply, inject, name } from '../src/index.js'

function registerTool() {
  const registered = []
  apply({ tools: { register: (tool) => registered.push(tool) } })
  assert.equal(registered.length, 1)
  return registered[0]
}

test('plugin declares the tools injection point', () => {
  assert.equal(name, 'contract-term-tags')
  assert.deepEqual(inject, ['tools'])
})

test('registers a contract_term_tags tool requiring one text string', () => {
  const tool = registerTool()
  assert.equal(tool.name, 'contract_term_tags')
  assert.deepEqual(tool.parameters.required, ['text'])
  assert.equal(tool.parameters.properties.text.type, 'string')
  assert.equal(tool.parameters.additionalProperties, false)
  assert.equal(tool.parameters.properties.keywords.type, 'array')
  assert.equal(tool.parameters.properties.keywords.minItems, 1)
  assert.deepEqual(tool.parameters.properties.keywords.items, { type: 'string' })
  assert.deepEqual(tool.output.schema.required, ['textLength', 'totalHits', 'keywords'])
  assert.deepEqual(tool.output.schema.properties.keywords.items.required, [
    'keyword',
    'count',
    'firstIndex',
    'snippet',
  ])
})

test('execute uses the default keywords when keywords is omitted', () => {
  const tool = registerTool()
  const result = tool.execute({ text: '验收合格后付款。' })
  assert.deepEqual(
    result.keywords.map((entry) => entry.keyword),
    ['验收', '付款', '违约', '税率'],
  )
  assert.deepEqual(
    result.keywords.map((entry) => entry.count),
    [1, 1, 0, 0],
  )
  assert.equal(result.totalHits, 2)
})

test('execute honours caller keywords', () => {
  const tool = registerTool()
  const result = tool.execute({ text: 'Delivery accepted. Payment due.', keywords: ['delivery', 'PAYMENT'] })
  assert.deepEqual(
    result.keywords.map((entry) => [entry.keyword, entry.count]),
    [
      ['delivery', 1],
      ['PAYMENT', 1],
    ],
  )
})

test('execute returns zeroed entries for empty text', () => {
  const tool = registerTool()
  const result = tool.execute({ text: '', keywords: ['验收'] })
  assert.deepEqual(result, {
    textLength: 0,
    totalHits: 0,
    keywords: [{ keyword: '验收', count: 0, firstIndex: -1, snippet: '' }],
  })
})

test('execute rejects a non-string text', () => {
  const tool = registerTool()
  assert.throws(() => tool.execute({ text: 1 }), TypeError)
})

test('execute rejects an empty keyword list', () => {
  const tool = registerTool()
  assert.throws(() => tool.execute({ text: '文本', keywords: [] }), RangeError)
})

test('render lists each keyword with its hit count and first position', () => {
  const tool = registerTool()
  const value = tool.execute({ text: '验收合格后付款，逾期付款视为违约。', keywords: ['付款', '验收', '税率'] })
  const blocks = tool.output.render({}, value)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].type, 'text')
  assert.match(blocks[0].text, /文本长度: 17 字符/)
  assert.match(blocks[0].text, /总命中: 3 次/)
  assert.match(blocks[0].text, /付款: 2 次（首次位置 5）/)
  assert.match(blocks[0].text, /验收: 1 次（首次位置 0）/)
  assert.match(blocks[0].text, /税率: 0 次（未命中）/)
  assert.match(blocks[0].text, /命中只说明出现该词/)
})

test('render warns when no keyword matched', () => {
  const tool = registerTool()
  const blocks = tool.output.render({}, tool.execute({ text: '本合同自签署之日起生效。', keywords: ['税率'] }))
  assert.match(blocks[0].text, /所有关键词均未命中/)
})
