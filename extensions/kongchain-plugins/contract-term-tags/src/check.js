/**
 * Pure keyword tagging for the contract_term_tags tool.
 *
 * Matching conventions (deliberately explicit, because they decide the counts):
 * - Matching is literal substring matching, case-insensitive for ASCII and for
 *   characters that Unicode case folding equates (`Payment` matches `payment`
 *   and `PAYMENT`). Regex metacharacters in a keyword are escaped, so `A+B`
 *   matches the literal text `A+B`, not `AAB`.
 * - Occurrences never overlap: `aa` appears 2 times in `aaaa`, and `aaa` once.
 * - Indices are 0-based Unicode code-point offsets, so one emoji counts as one
 *   character (`付款` in `😀付款` starts at index 1).
 * - A snippet is the first occurrence plus at most 12 code points before it and
 *   18 after it, with whitespace runs collapsed to one space and `…` marking a
 *   window cut off by the text boundary.
 */

/** Keywords used when a caller omits `keywords`. */
export const DEFAULT_KEYWORDS = Object.freeze(['验收', '付款', '违约', '税率'])

/** Code points of leading context kept in a snippet. */
const SNIPPET_LEAD = 12
/** Code points of trailing context kept in a snippet. */
const SNIPPET_TRAIL = 18
const REGEX_METACHARACTERS = /[.*+?^${}()|[\]\\]/g
const WHITESPACE_RUNS = /\s+/gu

/**
 * Replace regex metacharacters so a keyword is matched literally.
 *
 * @param {string} value Literal text to escape.
 * @returns {string} The same text with regex metacharacters backslash-escaped.
 */
function escapeRegExp(value) {
  return value.replace(REGEX_METACHARACTERS, '\\$&')
}

/**
 * Index of the code point that starts at one UTF-16 offset.
 *
 * @param {number[]} utf16Starts Sorted UTF-16 start offsets of every code point.
 * @param {number} utf16Index Offset reported by a regex match; always a code-point start.
 * @returns {number} 0-based code-point index, or -1 when `utf16Index` starts no code point.
 */
function codePointIndex(utf16Starts, utf16Index) {
  let low = 0
  let high = utf16Starts.length - 1
  while (low <= high) {
    const mid = (low + high) >> 1
    const start = utf16Starts[mid]
    if (start === utf16Index) return mid
    if (start < utf16Index) low = mid + 1
    else high = mid - 1
  }
  return -1
}

/**
 * Build the single-line excerpt around one match.
 *
 * @param {string[]} codePoints Code points of the whole text.
 * @param {number} startIndex 0-based code-point index of the match start.
 * @param {number} endIndex 0-based code-point index just past the match end.
 * @returns {string} Excerpt with `…` where the window was cut, without leading or trailing space.
 */
function buildSnippet(codePoints, startIndex, endIndex) {
  const windowStart = Math.max(0, startIndex - SNIPPET_LEAD)
  const windowEnd = Math.min(codePoints.length, endIndex + SNIPPET_TRAIL)
  const body = codePoints.slice(windowStart, windowEnd).join('').replace(WHITESPACE_RUNS, ' ').trim()
  const prefix = windowStart > 0 ? '…' : ''
  const suffix = windowEnd < codePoints.length ? '…' : ''
  return `${prefix}${body}${suffix}`
}

/**
 * Count non-overlapping occurrences of one keyword and capture its first match.
 *
 * @param {string} text Text to scan.
 * @param {string} keyword Non-empty literal keyword, matched case-insensitively.
 * @returns {{ count: number, firstStart: number, firstEnd: number }} Occurrence count and the
 *   UTF-16 bounds of the first match, or `-1` bounds when the keyword is absent.
 */
function scanKeyword(text, keyword) {
  const pattern = new RegExp(escapeRegExp(keyword), 'giu')
  let count = 0
  let firstStart = -1
  let firstEnd = -1
  for (const match of text.matchAll(pattern)) {
    count += 1
    if (firstStart === -1) {
      firstStart = match.index
      firstEnd = match.index + match[0].length
    }
  }
  return { count, firstStart, firstEnd }
}

/**
 * Validate and normalise the keyword list.
 *
 * @param {string[] | undefined} keywords Caller keywords; `undefined` selects {@link DEFAULT_KEYWORDS}.
 * @returns {string[]} A fresh array of non-empty keywords in caller order.
 * @throws {TypeError} When `keywords` is not an array or contains a non-string or empty entry.
 * @throws {RangeError} When `keywords` is an empty array.
 */
export function resolveKeywords(keywords) {
  if (keywords === undefined) return [...DEFAULT_KEYWORDS]
  if (!Array.isArray(keywords)) {
    throw new TypeError(`contract_term_tags expects keywords to be an array, received ${typeof keywords}`)
  }
  if (keywords.length === 0) {
    throw new RangeError('contract_term_tags expects at least one keyword; omit keywords to use the defaults')
  }
  for (const [position, keyword] of keywords.entries()) {
    if (typeof keyword !== 'string') {
      throw new TypeError(`keywords[${position}] must be a string, received ${typeof keyword}`)
    }
    if (keyword === '') {
      throw new RangeError(`keywords[${position}] must not be empty`)
    }
  }
  return [...keywords]
}

/**
 * Count keyword occurrences in one text and locate the first occurrence of each.
 *
 * Every keyword is reported once, in the order supplied, even when a keyword is
 * repeated in the list. `firstIndex` is `-1` and `snippet` is `""` when a
 * keyword does not occur, which keeps the result free of nullable fields.
 *
 * @param {string} text Text to scan. Non-strings are rejected instead of coerced.
 * @param {string[]} [keywords] Keywords to count; defaults to {@link DEFAULT_KEYWORDS}.
 * @returns {{ textLength: number, totalHits: number, keywords: Array<{ keyword: string, count: number, firstIndex: number, snippet: string }> }}
 *   Code-point length of the text, total hits across keywords, and one entry per keyword.
 * @throws {TypeError} When `text` is not a string or a keyword is not a string.
 * @throws {RangeError} When the keyword list is empty or contains an empty keyword.
 */
export function contractTermTags(text, keywords) {
  if (typeof text !== 'string') {
    throw new TypeError(`contract_term_tags expects text to be a string, received ${text === null ? 'null' : typeof text}`)
  }
  const resolved = resolveKeywords(keywords)

  const codePoints = Array.from(text)
  const utf16Starts = new Array(codePoints.length)
  let offset = 0
  for (let index = 0; index < codePoints.length; index += 1) {
    utf16Starts[index] = offset
    offset += codePoints[index].length
  }

  let totalHits = 0
  const entries = resolved.map((keyword) => {
    const { count, firstStart, firstEnd } = scanKeyword(text, keyword)
    totalHits += count
    if (count === 0) return { keyword, count, firstIndex: -1, snippet: '' }
    const startIndex = codePointIndex(utf16Starts, firstStart)
    const endIndex = firstEnd === text.length ? codePoints.length : codePointIndex(utf16Starts, firstEnd)
    return { keyword, count, firstIndex: startIndex, snippet: buildSnippet(codePoints, startIndex, endIndex) }
  })

  return { textLength: codePoints.length, totalHits, keywords: entries }
}
