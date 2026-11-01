/**
 * KongChain core host plugin.
 *
 * Registers the read-only `kongchain_runtime_info` tool and exposes the
 * identity of this checkout to the agent. It uses only Node built-ins, so the
 * plugin has no runtime dependency on upstream workspace packages and can be
 * mounted by path or by profile package name.
 *
 * @module @kongchain/core
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export const name = 'kongchain-core'
export const inject = ['tools']

/** Absolute `extensions/` directory of this checkout. */
const EXTENSIONS_ROOT = resolve(import.meta.dirname, '..', '..')
/** Absolute checkout root (`F:\KongChain` in this workspace). */
const REPO_ROOT = resolve(EXTENSIONS_ROOT, '..')

const TEXT = (path) => {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return undefined
  }
}

const JSON_TEXT = (path) => {
  const text = TEXT(path)
  if (text === undefined) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/**
 * Read the current commit without invoking Git: `.git/HEAD` points either at an
 * object id or at a ref whose file contains it.
 * @returns {string} Full commit id, or `unknown` when the checkout has no Git metadata.
 */
function readCommit() {
  const head = TEXT(resolve(REPO_ROOT, '.git', 'HEAD'))?.trim()
  if (head === undefined || head === '') return 'unknown'
  if (!head.startsWith('ref: ')) return head
  const ref = head.slice('ref: '.length).trim()
  return TEXT(resolve(REPO_ROOT, '.git', ref))?.trim() || head
}

/**
 * Resolve the active profile from the launcher arguments, falling back to the
 * environment the Harness provides to shell calls. The environment can be
 * inherited from a parent Harness, so argv is the stronger signal when present.
 * @returns {string} Profile name, or `unknown` when neither source exists.
 */
function activeProfile() {
  const index = process.argv.indexOf('--profile')
  const fromArgv = index === -1 ? undefined : process.argv[index + 1]
  return fromArgv || process.env.DSH_PROFILE || 'unknown'
}

/**
 * Read every `extensions/kongchain-*` package manifest.
 * @returns {Array<{dir: string, name: string, version: string, description: string}>}
 */
function readExtensions() {
  return readdirSync(EXTENSIONS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('kongchain-'))
    .map((entry) => {
      const manifest = JSON_TEXT(resolve(EXTENSIONS_ROOT, entry.name, 'package.json'))
      return {
        dir: entry.name,
        name: typeof manifest?.name === 'string' ? manifest.name : entry.name,
        version: typeof manifest?.version === 'string' ? manifest.version : '0.0.0',
        description: typeof manifest?.description === 'string' ? manifest.description : '',
      }
    })
    .sort((left, right) => left.dir.localeCompare(right.dir))
}

const RUNTIME_INFO_OUTPUT = {
  type: 'object',
  properties: {
    product: { type: 'string' },
    productVersion: { type: 'string' },
    upstreamCommit: { type: 'string' },
    workspaceRoot: { type: 'string' },
    extensionsRoot: { type: 'string' },
    profile: { type: 'string' },
    extensions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dir: { type: 'string' },
          name: { type: 'string' },
          version: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['dir', 'name', 'version', 'description'],
        additionalProperties: false,
      },
    },
  },
  required: ['product', 'productVersion', 'upstreamCommit', 'workspaceRoot', 'extensionsRoot', 'profile', 'extensions'],
  additionalProperties: false,
}

/**
 * Mount the KongChain core plugin.
 * @param {import('@deepseek-ai/cordis').Context} ctx Host context.
 */
export function apply(ctx) {
  const manifest = JSON_TEXT(resolve(EXTENSIONS_ROOT, 'kongchain-core', 'package.json'))
  const version = typeof manifest?.version === 'string' ? manifest.version : '0.0.0'

  ctx.tools.register({
    name: 'kongchain_runtime_info',
    description:
      'Return the KongChain extension runtime identity: product and version, upstream commit, workspace root, active DSH profile, and KongChain extension packages. Read-only; call it before extension work to ground paths and versions.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    output: {
      schema: RUNTIME_INFO_OUTPUT,
      render(_args, value) {
        return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
      },
    },
    async execute() {
      return {
        product: 'KongChain',
        productVersion: version,
        upstreamCommit: readCommit(),
        workspaceRoot: REPO_ROOT,
        extensionsRoot: EXTENSIONS_ROOT,
        profile: activeProfile(),
        extensions: readExtensions(),
      }
    },
  })

  console.log(`[kongchain-core] loaded version=${version} profile=${activeProfile()} repo=${REPO_ROOT}`)
  console.log('[kongchain-core] registered tool kongchain_runtime_info')
}
