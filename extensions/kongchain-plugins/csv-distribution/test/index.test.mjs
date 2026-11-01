import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { apply } from '../src/index.js'

const BASIC = fileURLToPath(new URL('./fixtures/basic.csv', import.meta.url))
const HISTOGRAM = fileURLToPath(new URL('./fixtures/histogram.csv', import.meta.url))

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
 * Walk one tool schema and assert it stays inside the Harness subset enforced at
 * registration.
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
  if (node.type === 'array') assert.ok(Object.hasOwn(node, 'items'), `${path} is an array without items`)
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
 * @returns {{ definitions: Array<Record<string, unknown>>, ctx: { tools: { register: Function } } }} Captured registrations.
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

test('apply registers one csv_distribution tool inside the JSON Schema subset', () => {
  const { definitions, ctx } = captureRegistration()

  assert.doesNotThrow(() => apply(ctx))
  assert.equal(definitions.length, 1)

  const [tool] = definitions
  assert.equal(tool.name, 'csv_distribution')
  assert.equal(typeof tool.description, 'string')
  assert.match(tool.description, /histogram/)
  assert.match(tool.description, /read-only/)
  assert.deepEqual(tool.parameters.required, ['path', 'column'])
  assert.equal(tool.parameters.additionalProperties, false)
  assert.deepEqual(Object.keys(tool.parameters.properties), ['path', 'column', 'bins'])
  assert.equal(tool.parameters.properties.bins.type, 'integer')
  assert.equal(tool.parameters.properties.bins.default, 10)

  assertSupportedSchema(tool.parameters, 'parameters')
  assertSupportedSchema(tool.output.schema, 'output.schema')
})

test('the registered tool returns JSON text for an authorized fixture', async () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  const text = await tool.execute({ path: BASIC, column: 'amount', bins: 2 })
  assert.equal(typeof text, 'string')

  const result = JSON.parse(text)
  assert.equal(result.column, 'amount')
  assert.equal(result.count, 4)
  assert.equal(result.min, '0.00')
  assert.equal(result.max, '30.00')
  assert.equal(result.mean, '15.00')
  assert.equal(result.median, '15.00')
  assert.equal(result.percentiles.p25, '7.50')
  assert.equal(result.histogram.binsUsed, 2)
  assert.ok(Array.isArray(result.limitations))
})

test('the registered tool defaults to ten histogram bins', async () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  const result = JSON.parse(await tool.execute({ path: HISTOGRAM, column: 'value' }))
  assert.equal(result.histogram.bins, 10)
  assert.equal(result.histogram.binsUsed, 10)
  assert.equal(result.count, 5)
})

test('the registered tool rejects an unknown column', async () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  await assert.rejects(tool.execute({ path: BASIC, column: 'total' }), { name: 'CsvInputError' })
})

test('the registered tool rejects a path outside the workspace', async () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  await assert.rejects(tool.execute({ path: 'F:/outside-workspace.csv', column: 'amount' }), {
    name: 'PathAuthorizationError',
  })
})

test('the registered tool rejects a fractional bin count', async () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  await assert.rejects(tool.execute({ path: BASIC, column: 'amount', bins: 2.5 }), { name: 'CsvInputError' })
})

test('the registered tool renders its JSON string as one text block', () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  assert.equal(tool.output.schema.type, 'string')
  assert.deepEqual(tool.output.render({}, '{"ok":true}'), [{ type: 'text', text: '{"ok":true}' }])
})
