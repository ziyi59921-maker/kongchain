/**
 * Reproducible in-process verification for csv_distribution.
 *
 * Registers the real tool definition, invokes its execute handler for the
 * fixture cases, and writes the observed results to docs/kongchain. This is not
 * a substitute for a fresh Harness process loading the installed profile.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { apply } from '../src/index.js'

const definitions = []
apply({
  tools: {
    register(definition) {
      definitions.push(definition)
      return () => {}
    },
  },
})

const [tool] = definitions
if (tool === undefined) throw new Error('csv_distribution was not registered')

const fixture = (name) => fileURLToPath(new URL(`../test/fixtures/${name}`, import.meta.url))
const cases = {
  basic_bins_2: { path: fixture('basic.csv'), column: 'amount', bins: 2 },
  missing_bins_10: { path: fixture('missing.csv'), column: 'amount', bins: 10 },
  single_value: { path: fixture('single.csv'), column: 'amount' },
  duplicates: { path: fixture('duplicates.csv'), column: 'amount' },
  empty_column: { path: fixture('empty-column.csv'), column: 'amount' },
  histogram_bins_3: { path: fixture('histogram.csv'), column: 'value', bins: 3 },
}

const results = {}
for (const [name, args] of Object.entries(cases)) {
  results[name] = JSON.parse(await tool.execute(args))
}

const output = new URL('../../../../docs/kongchain/csv-distribution-result.json', import.meta.url)
writeFileSync(
  output,
  `${JSON.stringify(
    {
      tool: tool.name,
      version: '0.1.0',
      capture: 'fresh Node process, real apply() registration and registered tool.execute()',
      cases: results,
    },
    undefined,
    2,
  )}\n`,
)
console.log(output.pathname)
