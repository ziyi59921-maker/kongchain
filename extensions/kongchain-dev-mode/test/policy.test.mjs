import test from 'node:test'
import assert from 'node:assert/strict'
import { developerPathAllowed } from '../src/index.js'

test('scope A extensions is writable without core authorization', () => {
  assert.equal(developerPathAllowed('F:/KongChain/extensions/kongchain-core/src/index.js', { coreAuthorized: false }), true)
})

test('scope B docs is writable', () => {
  assert.equal(developerPathAllowed('F:/KongChain/docs/kongchain/PRODUCT_SPEC.md', { coreAuthorized: false }), true)
})

test('scope C core is denied until explicitly authorized', () => {
  assert.equal(developerPathAllowed('F:/KongChain/packages/core/tools/src/index.ts', { coreAuthorized: false }), false)
  assert.equal(developerPathAllowed('F:/KongChain/packages/core/tools/src/index.ts', { coreAuthorized: true }), true)
})

test('scope D outside paths are denied', () => {
  assert.equal(developerPathAllowed('C:/Windows/System32/drivers/etc/hosts', { coreAuthorized: true }), false)
  assert.equal(developerPathAllowed('F:/KongChain-logs/dev-snapshots/patch.diff', { coreAuthorized: true }), false)
})
