import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { apply } from '../src/index.js'

const BASIC = fileURLToPath(new URL('./fixtures/basic.csv', import.meta.url))

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

test('apply registers one csv_statistics tool inside the JSON Schema subset', () => {
  const { definitions, ctx } = captureRegistration()

  assert.doesNotThrow(() => apply(ctx))
  assert.equal(definitions.length, 1)

  const [tool] = definitions
  assert.equal(tool.name, 'csv_statistics')
  assert.equal(typeof tool.description, 'string')
  assert.match(tool.description, /SHA-256/)
  assert.deepEqual(tool.parameters.required, ['path'])
  assert.equal(tool.parameters.additionalProperties, false)
  assert.deepEqual(Object.keys(tool.parameters.properties), ['path', 'amountColumn'])

  assertSupportedSchema(tool.parameters, 'parameters')
  assertSupportedSchema(tool.output.schema, 'output.schema')
})

test('the registered tool returns JSON text for an authorized fixture', async () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  const text = await tool.execute({ path: BASIC })
  assert.equal(typeof text, 'string')

  const result = JSON.parse(text)
  assert.equal(result.source.rowCount, 4)
  assert.equal(result.numeric.columns[0].sum, '1455.25')
  assert.ok(Array.isArray(result.limitations))
})

test('the registered tool forwards amountColumn', async () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  const result = JSON.parse(await tool.execute({ path: BASIC, amountColumn: 'amount' }))
  assert.equal(result.numeric.requestedColumn, 'amount')
  assert.deepEqual(result.numeric.columns.map((entry) => entry.column), ['amount'])
})

test('the registered tool rejects a path outside the workspace', async () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  await assert.rejects(tool.execute({ path: 'F:/outside-workspace.csv' }), { name: 'PathAuthorizationError' })
})

test('the registered tool renders its JSON string as one text block', () => {
  const { definitions, ctx } = captureRegistration()
  apply(ctx)
  const [tool] = definitions

  assert.equal(tool.output.schema.type, 'string')
  assert.deepEqual(tool.output.render({}, '{"ok":true}'), [{ type: 'text', text: '{"ok":true}' }])
})
