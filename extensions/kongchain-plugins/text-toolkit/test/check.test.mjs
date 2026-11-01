import test from 'node:test'
import assert from 'node:assert/strict'
import { textStats, topWords } from '../src/check.js'

test('empty text yields all zeros', () => {
  assert.deepEqual(textStats(''), { chars: 0, nonWhitespaceChars: 0, words: 0, lines: 0 })
})

test('whitespace only has no words and no non-whitespace characters', () => {
  assert.deepEqual(textStats('   \t\n  '), { chars: 7, nonWhitespaceChars: 0, words: 0, lines: 2 })
})

test('ideographic space and non-breaking space are whitespace', () => {
  assert.deepEqual(textStats('\u3000\u00a0'), { chars: 2, nonWhitespaceChars: 0, words: 0, lines: 1 })
})

test('single latin word', () => {
  assert.deepEqual(textStats('Hello'), { chars: 5, nonWhitespaceChars: 5, words: 1, lines: 1 })
})

test('punctuation separates words and digits count as words', () => {
  assert.deepEqual(textStats('Hello, world! 123'), {
    chars: 17,
    nonWhitespaceChars: 15,
    words: 3,
    lines: 1,
  })
})

test('multiple lines are counted from newline breaks', () => {
  assert.deepEqual(textStats('line1\nline2\nline3'), {
    chars: 17,
    nonWhitespaceChars: 15,
    words: 3,
    lines: 3,
  })
})

test('trailing newline does not add a line', () => {
  assert.deepEqual(textStats('a\n'), { chars: 2, nonWhitespaceChars: 1, words: 1, lines: 1 })
})

test('an interior blank line counts as its own line', () => {
  assert.deepEqual(textStats('a\n\n'), { chars: 3, nonWhitespaceChars: 1, words: 1, lines: 2 })
})

test('CRLF is one line break', () => {
  assert.deepEqual(textStats('a\r\nb'), { chars: 4, nonWhitespaceChars: 2, words: 2, lines: 2 })
})

test('CJK punctuation separates CJK runs into separate words', () => {
  assert.deepEqual(textStats('你好，世界'), { chars: 5, nonWhitespaceChars: 5, words: 2, lines: 1 })
})

test('mixed CJK, latin and emoji', () => {
  assert.deepEqual(textStats('中文 test 😀'), { chars: 9, nonWhitespaceChars: 7, words: 2, lines: 1 })
})

test('symbols are not words', () => {
  assert.deepEqual(textStats('!!!'), { chars: 3, nonWhitespaceChars: 3, words: 0, lines: 1 })
})

test('emoji counts as one character, not two UTF-16 units', () => {
  assert.deepEqual(textStats('😀😀'), { chars: 2, nonWhitespaceChars: 2, words: 0, lines: 1 })
})

test('words across lines are counted separately', () => {
  assert.deepEqual(textStats('one\ntwo three'), {
    chars: 13,
    nonWhitespaceChars: 11,
    words: 3,
    lines: 2,
  })
})

test('non-string input is rejected instead of coerced', () => {
  assert.throws(() => textStats(42), TypeError)
  assert.throws(() => textStats(null), TypeError)
  assert.throws(() => textStats(undefined), TypeError)
  assert.throws(() => textStats(['a']), TypeError)
})

test('top words of empty text and of text without words are empty arrays', () => {
  assert.deepEqual(topWords(''), [])
  assert.deepEqual(topWords('   \n\t '), [])
  assert.deepEqual(topWords('!!! ... 😀'), [])
})

test('top words default to three entries ordered by descending count', () => {
  assert.deepEqual(topWords('a b b c c c d d d d'), [
    { word: 'd', count: 4 },
    { word: 'c', count: 3 },
    { word: 'b', count: 2 },
  ])
})

test('top words match case-insensitively and store the lower-cased form', () => {
  assert.deepEqual(topWords('The the THE cat Cat dog'), [
    { word: 'the', count: 3 },
    { word: 'cat', count: 2 },
    { word: 'dog', count: 1 },
  ])
})

test('equal counts keep the order of first appearance', () => {
  assert.deepEqual(topWords('b a a b c'), [
    { word: 'b', count: 2 },
    { word: 'a', count: 2 },
    { word: 'c', count: 1 },
  ])
})

test('topN limits the number of returned entries', () => {
  assert.deepEqual(topWords('a b b c c c', 2), [
    { word: 'c', count: 3 },
    { word: 'b', count: 2 },
  ])
  assert.deepEqual(topWords('a b b c c c', 1), [{ word: 'c', count: 3 }])
})

test('topN larger than the distinct word count returns every word', () => {
  assert.deepEqual(topWords('a b b', 10), [
    { word: 'b', count: 2 },
    { word: 'a', count: 1 },
  ])
})

test('Unicode words are folded case-insensitively', () => {
  assert.deepEqual(topWords('Äpfel äpfel ÄPFEL'), [{ word: 'äpfel', count: 3 }])
})

test('CJK runs and digits are ranked like latin words', () => {
  assert.deepEqual(topWords('你好 世界 你好 2024 2024 2024'), [
    { word: '2024', count: 3 },
    { word: '你好', count: 2 },
    { word: '世界', count: 1 },
  ])
})

test('word frequencies sum to the words count', () => {
  const text = 'Alpha beta, beta! 你好，你好 😀 alpha'
  const all = topWords(text, 100)
  const total = all.reduce((sum, entry) => sum + entry.count, 0)
  assert.equal(total, textStats(text).words)
})

test('invalid topN is rejected instead of coerced', () => {
  assert.throws(() => topWords('a', 0), RangeError)
  assert.throws(() => topWords('a', -1), RangeError)
  assert.throws(() => topWords('a', 1.5), TypeError)
  assert.throws(() => topWords('a', '3'), TypeError)
  assert.throws(() => topWords('a', null), TypeError)
  assert.throws(() => topWords(42), TypeError)
})
