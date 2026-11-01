import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../src/index.js'

function registeredTools() {
  const tools = []
  apply({ tools: { register: (definition) => tools.push(definition) } })
  return new Map(tools.map((definition) => [definition.name, definition]))
}

const tools = registeredTools()

test('lifecycle tools are registered', () => {
  for (const name of [
    'kongchain_plugin_inventory',
    'kongchain_plugin_version',
    'kongchain_plugin_policy',
    'kongchain_plugin_log',
    'kongchain_plugin_upgrade',
    'kongchain_plugin_set_enabled',
    'kongchain_plugin_uninstall',
    'kongchain_plugin_history',
  ]) {
    assert.equal(tools.has(name), true, `missing ${name}`)
  }
})

test('default maintenance policy keeps automatic updates off', async () => {
  const policy = JSON.parse(await tools.get('kongchain_plugin_policy').execute({ action: 'get' }))
  assert.equal(policy.autoUpdate, false)
  assert.equal(policy.requireTests, true)
})

test('inventory reports harness and plugin/skill collections without a profile', async () => {
  const result = JSON.parse(await tools.get('kongchain_plugin_inventory').execute({ profile: 'profile-that-does-not-exist' }))
  assert.equal(typeof result.harness, 'string')
  assert.equal(Array.isArray(result.plugins), true)
  assert.equal(Array.isArray(result.skills), true)
})

test('version lookup by short package name is supported', async () => {
  const result = JSON.parse(await tools.get('kongchain_plugin_version').execute({ packageName: 'text-toolkit' }))
  assert.equal(result.ok, true)
  assert.equal(result.plugin, '@kongchain-plugin/text-toolkit')
  assert.equal(typeof result.localVersion, 'string')
})
