import { textStats, topWords } from './check.js'

export const name = 'text-toolkit'
export const inject = ['tools']

export function apply(ctx) {
  ctx.tools.register({
    name: 'text_stats',
    description:
      'Count characters, non-whitespace characters, words, and lines in one piece of text, ' +
      'and list the most frequent words. ' +
      'chars counts Unicode code points (one emoji = 1). words counts maximal runs of letters or digits, ' +
      'so punctuation separates words, symbols are not words, and a run of CJK characters counts as 1 word. ' +
      'lines counts "\\n" breaks plus a final unterminated line, so "" is 0 lines and "a\\n" is 1 line. ' +
      'topWords returns up to topN (default 3) {word, count} pairs using the same word runs, folded to lower ' +
      'case so matching is case-insensitive, ordered by descending count then first appearance; ' +
      'text without words returns []. ' +
      'Pure function: it does not read files, access the network, or modify anything.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to measure. Empty string is allowed and yields all zeros and an empty topWords.',
        },
        topN: {
          type: 'integer',
          minimum: 1,
          default: 3,
          description: 'How many top words to return. Defaults to 3; must be an integer >= 1.',
        },
      },
      required: ['text'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          chars: { type: 'number' },
          nonWhitespaceChars: { type: 'number' },
          words: { type: 'number' },
          lines: { type: 'number' },
          topWords: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                word: { type: 'string' },
                count: { type: 'number' },
              },
              required: ['word', 'count'],
              additionalProperties: false,
            },
          },
        },
        required: ['chars', 'nonWhitespaceChars', 'words', 'lines', 'topWords'],
        additionalProperties: false,
      },
      render(_args, value) {
        const ranking =
          value.topWords.length === 0
            ? '（无单词）'
            : value.topWords.map((entry) => `${entry.word}×${entry.count}`).join('、')
        return [
          {
            type: 'text',
            text:
              `字符数: ${value.chars}\n` +
              `非空白字符数: ${value.nonWhitespaceChars}\n` +
              `单词数: ${value.words}\n` +
              `行数: ${value.lines}\n` +
              `高频词: ${ranking}\n` +
              '(单词数按字母/数字连续片段计，标点与符号不计为单词，连续中文按 1 个单词计；' +
              '高频词不区分大小写，按出现次数降序，同频按首次出现排序。)',
          },
        ]
      },
    },
    execute(args) {
      return {
        ...textStats(args.text),
        topWords: topWords(args.text, args.topN ?? 3),
      }
    },
  })
}
