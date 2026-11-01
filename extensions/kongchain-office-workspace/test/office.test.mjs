import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { name, inject, apply } from '../src/index.js'

/** Minimal host stand-in: captures tool registrations and deferred injections. */
function fakeContext() {
  const tools = new Map()
  const injections = []
  return {
    tools,
    injections,
    ctx: {
      tools: {
        register(definition) {
          tools.set(definition.name, definition)
          return () => tools.delete(definition.name)
        },
      },
      inject(deps, callback) {
        injections.push({ deps, callback })
      },
    },
  }
}

test('office workspace plugin identity is stable', () => {
  assert.equal(name, 'kongchain-office-workspace')
  assert.deepEqual(inject, ['tools'])
})

test('module loads without browser-only dependencies', async () => {
  const module = await import('../src/index.js')
  assert.equal(typeof module.apply, 'function')
})

test('headless host gets every office tool and no mandatory web server', () => {
  const { ctx, tools, injections } = fakeContext()
  apply(ctx)
  assert.deepEqual([...tools.keys()].sort(), [
    'office_csv_save_version',
    'office_file_export',
    'office_file_list',
    'office_file_read',
    'office_file_register',
  ])
  assert.deepEqual(injections.map((entry) => entry.deps), [['webServer']])
})

test('office tools reject paths outside the authorized roots', async () => {
  const { ctx, tools } = fakeContext()
  apply(ctx)
  await assert.rejects(
    tools.get('office_file_register').execute({ path: join(process.cwd(), '..', 'outside.csv') }, {}),
    /path outside authorized office workspace/,
  )
})

test('office tools reject a sibling path that only shares the root prefix', async () => {
  const { ctx, tools } = fakeContext()
  apply(ctx)
  await assert.rejects(
    tools.get('office_file_register').execute({ path: join(`${process.cwd()}-evil`, 'x.csv') }, {}),
    /path outside authorized office workspace/,
  )
})

test('office tools accept the session workspace and report a missing file instead', async () => {
  const { ctx, tools } = fakeContext()
  apply(ctx)
  await assert.rejects(
    tools.get('office_file_register').execute({ path: join(process.cwd(), 'missing-office-file.csv') }, {}),
    /file not found/,
  )
})
