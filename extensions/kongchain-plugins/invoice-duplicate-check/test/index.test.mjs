import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../src/index.js'

/** Keywords accepted by the Harness JSON Schema subset. */
const SUPPORTED_KEYWORDS = new Set([
  'type',
  'oneOf',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
  'const',
  'description',
  'title',
  'default',
  'examples',
])

/**
 * Walk one tool schema and assert it stays inside the Harness subset that the
 * headless profile enforces at registration; object `additionalProperties`
 * must be boolean, which is the violation this plugin shipped with.
 * @param {Record<string, unknown>} node Schema node.
 * @param {string} path Path for failure messages.
 */
function assertSupportedSchema(node, path = 'schema') {
  assert.equal(typeof node, 'object', `${path} must be an object`)
  assert.notEqual(node, null, `${path} must not be null`)

  for (const keyword of Object.keys(node)) {
    assert.ok(SUPPORTED_KEYWORDS.has(keyword), `${path}.${keyword} is not in the supported subset`)
  }
  if (Object.hasOwn(node, 'additionalProperties')) {
    assert.equal(typeof node.additionalProperties, 'boolean', `${path}.additionalProperties must be a boolean`)
  }
  if (node.type === 'array') {
    assert.ok(Object.hasOwn(node, 'items'), `${path} is an array without items`)
  }
  for (const [key, child] of Object.entries(node.properties ?? {})) {
    assert.equal(typeof child, 'object', `${path}.properties.${key} must be a schema object`)
    assertSupportedSchema(child, `${path}.properties.${key}`)
  }
  if (node.items !== undefined) assertSupportedSchema(node.items, `${path}.items`)
  for (const required of node.required ?? []) {
    assert.ok(Object.hasOwn(node.properties ?? {}, required), `${path}.required names undeclared property "${required}"`)
  }
}

/**
 * Capture the definition registered by `apply` without a live registry.
 * @returns {{ definitions: Array<Record<string, unknown>>, ctx: { tools: { register: Function } } }}
 */
function captureRegistration() {
  const definitions = []
  const ctx = {
    tools: {
      register(definition) {
        definitions.push(definition)
        return () => {}
      },
    },
  }
  return { definitions, ctx }
}

test('apply registers the tool without throwing and stays inside the JSON Schema subset', () => {
  const { definitions, ctx } = captureRegistration()

  assert.doesNotThrow(() => apply(ctx))
  assert.equal(definitions.length, 1)

  const [tool] = definitions
  assert.equal(tool.name, 'invoice_duplicate_check')
  assert.equal(typeof tool.description, 'string')
  assert.deepEqual(tool.parameters.required, ['rows'])
  assert.equal(tool.parameters.additionalProperties, false)

  assertSupportedSchema(tool.parameters, 'parameters')
  assertSupportedSchema(tool.output.schema, 'output.schema')

  const key = tool.output.schema.properties.duplicates.items.properties.key
  assert.equal(key.additionalProperties, false)
  assert.deepEqual(Object.keys(key.properties), ['supplier', 'invoiceNo', 'amount'])
})

test('the registered tool defaults to matching supplier, invoice number, and amount', async () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  const rows = [
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: 1000 },
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: 1000 },
  ]
  const result = await tool.execute({ rows })

  assert.deepEqual(result.match, ['supplier', 'invoiceNo', 'amount'])
  assert.equal(result.checked, 2)
  assert.equal(result.duplicates.length, 1)
  assert.deepEqual(result.duplicates[0].key, { supplier: '甲公司', invoiceNo: 'INV-001', amount: '1000' })
})

test('the registered tool accepts a custom match subset', async () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  const result = await tool.execute({
    rows: [
      { supplier: '甲公司', invoiceNo: 'INV-001', amount: 1000 },
      { supplier: '甲公司', invoiceNo: 'INV-001', amount: 2000 },
    ],
    match: ['supplier', 'invoiceNo'],
  })

  assert.deepEqual(result.match, ['supplier', 'invoiceNo'])
  assert.equal(result.duplicates.length, 1)
  assert.deepEqual(result.duplicates[0].key, { supplier: '甲公司', invoiceNo: 'INV-001' })
})

test('the registered tool fails with an actionable message for an empty match', async () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  await assert.rejects(tool.execute({ rows: [], match: [] }), {
    name: 'MatchConfigError',
    message: /match must not be empty; pass at least one of supplier, invoiceNo, amount/,
  })
})

test('the registered tool fails with an actionable message for an unknown match field', async () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  await assert.rejects(tool.execute({ rows: [], match: ['supplier', 'vendor'] }), {
    name: 'MatchConfigError',
    message: /match contains unsupported field "vendor"; allowed fields are supplier, invoiceNo, amount\./,
  })
})

test('the registered tool ignores rows missing a matched field instead of failing', async () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  const result = await tool.execute({
    rows: [
      { supplier: '甲公司', amount: 1000 },
      { supplier: '甲公司', invoiceNo: 'INV-001', amount: 1000 },
    ],
  })

  assert.equal(result.checked, 2)
  assert.deepEqual(result.duplicates, [])
})

test('exposes caseSensitive as an optional boolean that defaults to true', () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  const caseSensitive = tool.parameters.properties.caseSensitive
  assert.equal(caseSensitive?.type, 'boolean')
  assert.equal(caseSensitive.default, true)
  assert.equal(tool.parameters.properties.match.default, undefined)
})

test('the registered tool ignores letter case in invoice numbers when caseSensitive is false', async () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  const rows = [
    { supplier: '甲公司', invoiceNo: 'INV-001', amount: 1000 },
    { supplier: '甲公司', invoiceNo: 'inv-001', amount: 1000 },
  ]

  const sensitive = await tool.execute({ rows })
  assert.deepEqual(sensitive.duplicates, [])

  const insensitive = await tool.execute({ rows, caseSensitive: false })
  assert.equal(insensitive.duplicates.length, 1)
  assert.equal(insensitive.duplicates[0].count, 2)
})

test('the registered tool renders the result as formatted JSON text', () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  const value = { duplicates: [], checked: 0, match: ['supplier', 'invoiceNo', 'amount'] }
  const blocks = tool.output.render({}, value)

  assert.deepEqual(blocks, [{ type: 'text', text: JSON.stringify(value, null, 2) }])
})
