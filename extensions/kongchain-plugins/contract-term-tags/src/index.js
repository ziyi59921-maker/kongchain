import { DEFAULT_KEYWORDS, contractTermTags } from './check.js'

export const name = 'contract-term-tags'
export const inject = ['tools']

/**
 * Format one keyword result for the model-facing text block.
 *
 * @param {{ keyword: string, count: number, firstIndex: number, snippet: string }} entry One keyword result.
 * @returns {string} One line describing the hit count, first position, and snippet.
 */
function describeEntry(entry) {
  if (entry.count === 0) return `${entry.keyword}: 0 次（未命中）`
  return `${entry.keyword}: ${entry.count} 次（首次位置 ${entry.firstIndex}）… 片段: ${entry.snippet}`
}

export function apply(ctx) {
  ctx.tools.register({
    name: 'contract_term_tags',
    description:
      'Count how often each keyword occurs in one piece of contract or document text and show where it first ' +
      'appears. ' +
      'keywords defaults to ["验收", "付款", "违约", "税率"]. Matching is literal and case-insensitive ' +
      '("付款条件" finds "付款"; "PAYMENT" matches keyword "payment"), regex metacharacters in a keyword are ' +
      'escaped, and occurrences never overlap ("aa" occurs twice in "aaaa"). ' +
      'Each result entry reports count, firstIndex (0-based code-point offset of the first occurrence, -1 when ' +
      'absent) and snippet (the first occurrence with up to 12 code points before and 18 after, whitespace ' +
      'collapsed to single spaces, "…" marking a cut window, "" when absent). totalHits sums all keywords and ' +
      'textLength is the code-point length, so one emoji counts as one character. ' +
      'Empty text returns zero counts for every keyword. Keywords keep caller order and a repeated keyword is ' +
      'reported once per list entry. ' +
      'Pure function: it does not read files, access the network, or modify anything. A count is a lead for ' +
      'review, not evidence that a clause is present, complete, or compliant.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description:
            'The contract or document text to scan. Empty string is allowed and yields zero counts for every keyword.',
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          description:
            `Keywords to count, matched as literal case-insensitive substrings. Omit to use ${JSON.stringify(DEFAULT_KEYWORDS)}. ` +
            'Must contain at least one non-empty string; an empty array is rejected instead of silently using the defaults.',
        },
      },
      required: ['text'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          textLength: { type: 'number' },
          totalHits: { type: 'number' },
          keywords: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                keyword: { type: 'string' },
                count: { type: 'number' },
                firstIndex: { type: 'number' },
                snippet: { type: 'string' },
              },
              required: ['keyword', 'count', 'firstIndex', 'snippet'],
              additionalProperties: false,
            },
          },
        },
        required: ['textLength', 'totalHits', 'keywords'],
        additionalProperties: false,
      },
      render(_args, value) {
        const lines = value.keywords.map(describeEntry)
        const missing = value.keywords.filter((entry) => entry.count === 0).length
        const hint =
          missing === value.keywords.length
            ? '（所有关键词均未命中：文本可能不含这些条款，也可能用了别的措辞；未命中不等于条款不存在。）'
            : '（命中只说明出现该词，不说明条款完整、有效或已履行；请结合上下文判断。）'
        return [
          {
            type: 'text',
            text: [
              `文本长度: ${value.textLength} 字符`,
              `总命中: ${value.totalHits} 次`,
              ...lines,
              hint,
            ].join('\n'),
          },
        ]
      },
    },
    execute(args) {
      return contractTermTags(args.text, args.keywords)
    },
  })
}
