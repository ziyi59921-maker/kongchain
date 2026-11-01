/**
 * csv_distribution: percentile, median, and histogram statistics for one
 * authorized workspace CSV column.
 *
 * Registration only; path authorization, hashing, and parsing live in
 * `check.js` and `stats.js`.
 *
 * @module @kongchain-plugin/csv-distribution
 */
import { readFileSync } from 'node:fs'
import { analyzeCsv } from './check.js'

export const name = 'csv-distribution'
export const inject = ['tools']

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version

/**
 * Register the csv_distribution tool.
 * @param {import('@deepseek-ai/cordis').Context} ctx Host context.
 */
export function apply(ctx) {
  ctx.tools.register({
    name: 'csv_distribution',
    description:
      'Compute distribution statistics for one named column of a .csv file inside the authorized workspace: count, min, max, mean, median, p25/p50/p75/p90/p95, missing cells, and an equal-width histogram with the requested number of bins. Uses fixed-point decimal arithmetic; read-only, and paths outside the workspace are rejected.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'CSV path, absolute or relative to the workspace root. Paths resolving outside the workspace are rejected.',
        },
        column: {
          type: 'string',
          description: 'Exact header name of the column to summarize.',
        },
        bins: {
          type: 'integer',
          description: 'Histogram bucket count from 1 through 100; defaults to 10.',
          default: 10,
        },
      },
      required: ['path', 'column'],
      additionalProperties: false,
    },
    output: {
      // A JSON string keeps the result schema-free: percentile labels and the
      // histogram bucket array are data, and the Harness schema subset forbids
      // value schemas behind dynamic keys.
      schema: { type: 'string' },
      render(_args, value) {
        return [{ type: 'text', text: String(value) }]
      },
    },
    async execute(args = {}) {
      return analyzeCsv(args)
    },
  })

  console.log(`[csv-distribution] registered tool csv_distribution (${VERSION})`)
}
