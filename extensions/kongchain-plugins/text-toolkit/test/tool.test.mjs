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
  assert.equal(name, 'text-toolkit')
  assert.deepEqual(inject, ['tools'])
})

test('registers a text_stats tool requiring one text string', () => {
  const tool = registerTool()
  assert.equal(tool.name, 'text_stats')
  assert.deepEqual(tool.parameters.required, ['text'])
  assert.equal(tool.parameters.properties.text.type, 'string')
  assert.equal(tool.parameters.additionalProperties, false)
  assert.deepEqual(tool.output.schema.required, [
    'chars',
    'nonWhitespaceChars',
    'words',
    'lines',
    'topWords',
  ])
})

test('declares an optional integer topN parameter defaulting to 3', () => {
  const tool = registerTool()
  const topN = tool.parameters.properties.topN
  assert.equal(topN.type, 'integer')
  assert.equal(topN.minimum, 1)
  assert.equal(topN.default, 3)
  assert.equal(tool.parameters.required.includes('topN'), false)
  assert.equal(tool.output.schema.properties.topWords.type, 'array')
  assert.deepEqual(tool.output.schema.properties.topWords.items.required, ['word', 'count'])
})

test('execute returns statistics for the supplied text', () => {
  const tool = registerTool()
  assert.deepEqual(tool.execute({ text: 'Hello world' }), {
    chars: 11,
    nonWhitespaceChars: 10,
    words: 2,
    lines: 1,
    topWords: [
      { word: 'hello', count: 1 },
      { word: 'world', count: 1 },
    ],
  })
  assert.deepEqual(tool.execute({ text: '' }), {
    chars: 0,
    nonWhitespaceChars: 0,
    words: 0,
    lines: 0,
    topWords: [],
  })
})

test('execute defaults topN to 3 and honours an explicit topN', () => {
  const tool = registerTool()
  const text = 'a b b c c c d d d d'
  assert.deepEqual(
    tool.execute({ text }).topWords.map((entry) => entry.word),
    ['d', 'c', 'b'],
  )
  assert.deepEqual(tool.execute({ text, topN: 2 }).topWords, [
    { word: 'd', count: 4 },
    { word: 'c', count: 3 },
  ])
})

test('execute rejects a non-string argument', () => {
  const tool = registerTool()
  assert.throws(() => tool.execute({ text: 1 }), TypeError)
})

test('execute rejects an out-of-range topN', () => {
  const tool = registerTool()
  assert.throws(() => tool.execute({ text: 'a', topN: 0 }), RangeError)
})

test('render produces a readable text block', () => {
  const tool = registerTool()
  const blocks = tool.output.render({ text: 'a b' }, tool.execute({ text: 'a b' }))
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].type, 'text')
  assert.match(blocks[0].text, /字符数: 3/)
  assert.match(blocks[0].text, /单词数: 2/)
  assert.match(blocks[0].text, /高频词: a×1、b×1/)
})

test('render states that an empty text has no top words', () => {
  const tool = registerTool()
  const blocks = tool.output.render({ text: '' }, tool.execute({ text: '' }))
  assert.match(blocks[0].text, /高频词: （无单词）/)
})
