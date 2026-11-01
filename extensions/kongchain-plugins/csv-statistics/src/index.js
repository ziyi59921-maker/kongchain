/**
 * csv_statistics: deterministic statistics for one authorized workspace CSV.
 *
 * Registration only; path authorization, hashing, and parsing live in
 * `check.js` and `stats.js`.
 *
 * @module @kongchain-plugin/csv-statistics
 */
import { readFileSync } from 'node:fs'
import { analyzeCsv } from './check.js'

export const name = 'csv-statistics'
export const inject = ['tools']

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version

/**
 * Register the csv_statistics tool.
 * @param {import('@deepseek-ai/cordis').Context} ctx Host context.
 */
export function apply(ctx) {
  ctx.tools.register({
    name: 'csv_statistics',
    description:
      'Compute statistics for one .csv file inside the authorized workspace: SHA-256, byte size, row count (blank rows excluded), column names, missing-value counts per column, and count/sum/mean/min/max for numeric columns using fixed-point decimal arithmetic. amountColumn optionally restricts the numeric statistics to one named column and reports values that are not plain decimals. Read-only; files outside the workspace are rejected.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'CSV path, absolute or relative to the workspace root. Paths resolving outside the workspace are rejected.',
        },
        amountColumn: {
          type: 'string',
          description:
            'Optional exact column name. When omitted, every all-numeric column is summarized; when given, only that column is summarized and its non-decimal cells are reported.',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
    output: {
      // A JSON string keeps the result schema-free: numeric column names are
      // dynamic and the Harness JSON Schema subset forbids value schemas behind
      // dynamic keys.
      schema: { type: 'string' },
      render(_args, value) {
        return [{ type: 'text', text: String(value) }]
      },
    },
    async execute(args = {}) {
      return analyzeCsv(args)
    },
  })

  console.log(`[csv-statistics] registered tool csv_statistics (${VERSION})`)
}
