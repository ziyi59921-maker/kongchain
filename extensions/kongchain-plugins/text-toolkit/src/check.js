/**
 * Pure text statistics for the text_stats tool.
 *
 * Counting conventions (deliberately explicit, because they differ from
 * naive implementations):
 * - chars: Unicode code points, so a surrogate pair (e.g. an emoji) counts as 1.
 * - nonWhitespaceChars: code points that are not ECMAScript `\s` whitespace.
 * - words: maximal runs of Unicode letters or digits (`\p{L}` / `\p{N}`).
 *   Punctuation and symbols separate runs and never count as words, and a run
 *   of CJK characters counts as one word because CJK has no word separator.
 * - lines: `\n` occurrences, plus one when the text is non-empty and does not
 *   end with `\n`. `""` has 0 lines; `"a\n"` has 1; `"a\n\n"` has 2.
 *   A lone `\r` (classic Mac line ending) is not treated as a line break.
 * - topWords: the `topN` most frequent words, folded with `String#toLowerCase`
 *   so matching is case-insensitive. Frequencies use the same word runs as
 *   `words`, so the frequencies of all distinct words always sum to `words`.
 */

const WORD_PATTERN = /[\p{L}\p{N}]+/gu
const WHITESPACE_PATTERN = /^\s$/u

/**
 * Measure one string under the documented counting conventions.
 *
 * @param {string} text Text to measure. Non-strings are rejected instead of coerced.
 * @returns {{ chars: number, nonWhitespaceChars: number, words: number, lines: number }}
 *   Code-point character count, non-whitespace count, word count, and line count.
 * @throws {TypeError} When `text` is not a string.
 */
export function textStats(text) {
  if (typeof text !== 'string') {
    throw new TypeError(`text_stats expects a string, received ${text === null ? 'null' : typeof text}`)
  }

  const codePoints = Array.from(text)
  let nonWhitespaceChars = 0
  for (const codePoint of codePoints) {
    if (!WHITESPACE_PATTERN.test(codePoint)) nonWhitespaceChars += 1
  }

  const newlines = text.split('\n').length - 1
  const lines = text === '' ? 0 : newlines + (text.endsWith('\n') ? 0 : 1)

  return {
    chars: codePoints.length,
    nonWhitespaceChars,
    words: text.match(WORD_PATTERN)?.length ?? 0,
    lines,
  }
}

/**
 * Rank the most frequent words in one string.
 *
 * Words are the same Unicode letter/digit runs that `textStats` counts, folded
 * to lower case, so `The` and `the` share one entry. Results are ordered by
 * descending frequency; entries with equal frequency keep the order in which
 * each word first appeared. Text without any word run, including `""`, yields
 * an empty array.
 *
 * Case folding uses `String#toLowerCase`, not full Unicode case folding, so
 * `"Straße"` and `"STRASSE"` stay distinct.
 *
 * @param {string} text Text to rank. Non-strings are rejected instead of coerced.
 * @param {number} [topN=3] Maximum number of entries to return; a positive integer.
 * @returns {Array<{ word: string, count: number }>} Lower-cased word and its occurrence count.
 * @throws {TypeError} When `text` is not a string or `topN` is not an integer.
 * @throws {RangeError} When `topN` is less than 1.
 */
export function topWords(text, topN = 3) {
  if (typeof text !== 'string') {
    throw new TypeError(`topWords expects a string, received ${text === null ? 'null' : typeof text}`)
  }
  if (!Number.isInteger(topN)) {
    throw new TypeError(`topN expects an integer, received ${topN === null ? 'null' : String(topN)}`)
  }
  if (topN < 1) {
    throw new RangeError(`topN expects an integer >= 1, received ${topN}`)
  }

  const counts = new Map()
  for (const run of text.match(WORD_PATTERN) ?? []) {
    const word = run.toLowerCase()
    const entry = counts.get(word)
    if (entry === undefined) counts.set(word, { word, count: 1 })
    else entry.count += 1
  }

  return [...counts.values()].sort((left, right) => right.count - left.count).slice(0, topN)
}
