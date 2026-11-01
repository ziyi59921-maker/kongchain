import { readFileSync } from 'node:fs'
import { checkRecords } from './check.js'

export const name = 'invoice-duplicate-check'
export const inject = ['tools']

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version

/** 输出中单个重复组 key 的字段说明。 */
const KEY_PROPERTIES = {
  supplier: { type: 'string', description: 'Trimmed supplier name used for matching.' },
  invoiceNo: { type: 'string', description: 'Trimmed invoice number used for matching.' },
  amount: { type: 'string', description: 'Canonical decimal amount text used for matching.' },
}

/**
 * Register the invoice duplicate inspection tool.
 * @param {import('@deepseek-ai/cordis').Context} ctx Host context.
 */
export function apply(ctx) {
  ctx.tools.register({
    name: 'invoice_duplicate_check',
    description:
      'Group purchase invoices and return groups sharing the matched fields. match accepts any non-empty subset of supplier, invoiceNo, and amount and defaults to all three; unknown fields or an empty match fail with a configuration error. caseSensitive (default true) controls whether invoiceNo letter case distinguishes invoices; set it to false to also group INV-001 with inv-001. Rows missing a matched field are not grouped.',
    parameters: {
      type: 'object',
      properties: {
        rows: {
          type: 'array',
          description: 'Purchase invoices. Each row may contain supplier, invoiceNo, and amount.',
          items: { type: 'object', additionalProperties: true },
        },
        match: {
          type: 'array',
          description:
            'Any non-empty subset of supplier, invoiceNo, and amount, in comparison order. Omit it to match all three.',
          items: { type: 'string' },
        },
        caseSensitive: {
          type: 'boolean',
          description:
            'Whether invoiceNo letter case distinguishes invoices. Defaults to true; false also groups numbers differing only in case, while supplier and amount comparison stay unchanged.',
          default: true,
        },
      },
      required: ['rows'],
      additionalProperties: false,
    },
    output: {
      // The Harness enforces a JSON Schema subset: object `additionalProperties`
      // is boolean only, so each duplicate key is described by explicit
      // `properties` instead of a value schema.
      schema: {
        type: 'object',
        properties: {
          duplicates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: {
                  type: 'object',
                  properties: KEY_PROPERTIES,
                  additionalProperties: false,
                },
                count: { type: 'number' },
                rows: { type: 'array', items: { type: 'object', additionalProperties: true } },
              },
              required: ['key', 'count', 'rows'],
              additionalProperties: false,
            },
          },
          checked: { type: 'number' },
          match: { type: 'array', items: { type: 'string' } },
        },
        required: ['duplicates', 'checked', 'match'],
        additionalProperties: false,
      },
      render(_args, value) {
        return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
      },
    },
    async execute(args = {}) {
      return checkRecords(args.rows, args.match, args.caseSensitive)
    },
  })

  console.log(`[invoice-duplicate-check] registered tool invoice_duplicate_check (${VERSION})`)
}
