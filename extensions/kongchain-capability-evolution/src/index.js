/**
 * KongChain capability evolution.
 *
 * Discovery, capability records, event logs, installation verification, and
 * the update policy. Creation/testing/install still use the plugin workshop
 * and the official dsh plugin mechanism; this plugin does not replace them.
 *
 * @module @kongchain/capability-evolution
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const name = 'kongchain-capability-evolution'
export const inject = ['tools']

const EXTENSIONS_ROOT = resolve(import.meta.dirname, '..', '..')
const REPO_ROOT = resolve(EXTENSIONS_ROOT, '..')
const LOG_ROOT = 'F:/KongChain-logs/capabilities'
const REGISTRY = join(LOG_ROOT, 'registry.json')
const DSH_HOME = process.env.DSH_HOME ?? 'F:/KongChain-home'

const text = (path) => {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return undefined
  }
}

const json = (path) => {
  const value = text(path)
  if (value === undefined) return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function loadRegistry() {
  return json(REGISTRY) ?? { version: 1, capabilities: {} }
}

function saveRegistry(registry) {
  mkdirSync(LOG_ROOT, { recursive: true })
  writeFileSync(REGISTRY, `${JSON.stringify(registry, undefined, 2)}\n`)
}

function appendEvent(capability, event, data) {
  mkdirSync(LOG_ROOT, { recursive: true })
  const file = join(LOG_ROOT, `${String(capability).replace(/[^a-z0-9-]/gi, '') || 'unknown'}.jsonl`)
  appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), capability, event, data })}\n`)
  return file
}

function skillCatalog() {
  const root = join(EXTENSIONS_ROOT, 'kongchain-skills', 'skills')
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const body = text(join(root, entry.name, 'SKILL.md')) ?? ''
      const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(body)?.[1] ?? ''
      const field = (key) => new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(frontmatter)?.[1]?.trim() ?? ''
      return { name: field('name') || entry.name, description: field('description'), kind: 'skill', path: `extensions/kongchain-skills/skills/${entry.name}/SKILL.md` }
    })
}

function pluginCatalog() {
  const root = join(EXTENSIONS_ROOT, 'kongchain-plugins')
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => {
      const manifest = json(join(root, entry.name, 'package.json'))
      return { name: manifest?.name, version: manifest?.version, description: manifest?.description, kind: 'plugin', path: `extensions/kongchain-plugins/${entry.name}` }
    })
}

function tokens(query) {
  return String(query ?? '').toLowerCase().split(/[\s,，。;；]+/).filter((token) => token.length >= 2)
}

const stringOutput = { type: 'string' }

function tool(name, description, parameters, execute) {
  return {
    name,
    description,
    parameters,
    output: { schema: stringOutput, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(args) {
      return JSON.stringify(await execute(args ?? {}), undefined, 2)
    },
  }
}

export function apply(ctx) {
  ctx.tools.register(tool(
    'kongchain_capability_discover',
    'Search existing KongChain skills, generated plugins, and capability registry for a natural-language need. Returns matches and a gap verdict; call before creating anything to avoid duplicate plugins.',
    {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
      additionalProperties: false,
    },
    async (args) => {
      const words = tokens(args.query)
      const matches = [...skillCatalog(), ...pluginCatalog()].filter((item) => {
        const haystack = `${item.name} ${item.description ?? ''}`.toLowerCase()
        return words.some((word) => haystack.includes(word))
      })
      const registry = loadRegistry()
      const registered = Object.values(registry.capabilities ?? {}).filter((item) => words.some((word) => `${item.name} ${item.description ?? ''}`.toLowerCase().includes(word)))
      return {
        query: args.query,
        matches,
        registeredMatches: registered,
        gap: matches.length === 0 && registered.length === 0,
        recommendation: matches.length > 0 ? 'reuse-or-extend' : 'create-new',
        note: 'Matches are candidates only; read the skill/tool implementation before deciding. Prefer extending an existing capability over creating a duplicate.',
      }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_capability_register',
    'Create or update a capability record: name, version, kind, source, entry, dependencies, permissions, test result, enabled state, and installation profile. Records the previous version in history. Use after a real test/install, not for plans.',
    {
      type: 'object',
      properties: {
        capability: { type: 'object', additionalProperties: true },
        action: { type: 'string', enum: ['upsert', 'status', 'disable'] },
        name: { type: 'string' },
      },
      required: ['action'],
      additionalProperties: false,
    },
    async (args) => {
      const registry = loadRegistry()
      if (args.action === 'status') {
        return args.name === undefined ? registry : { capability: registry.capabilities?.[args.name] ?? null }
      }
      if (args.action === 'disable') {
        const item = registry.capabilities?.[args.name]
        if (item === undefined) throw new Error(`unknown capability: ${args.name}`)
        item.enabled = false
        item.updatedAt = new Date().toISOString()
        item.history = [...(item.history ?? []), { at: item.updatedAt, action: 'disable', version: item.version }]
        saveRegistry(registry)
        appendEvent(args.name, 'disabled', {})
        return { ok: true, capability: item }
      }
      const capability = args.capability ?? {}
      if (typeof capability.name !== 'string' || typeof capability.version !== 'string') throw new Error('capability.name and capability.version are required')
      const previous = registry.capabilities?.[capability.name]
      const now = new Date().toISOString()
      registry.capabilities = registry.capabilities ?? {}
      registry.capabilities[capability.name] = {
        ...capability,
        enabled: capability.enabled !== false,
        updatedAt: now,
        history: [...(previous?.history ?? []), { at: now, action: previous === undefined ? 'create' : 'update', version: capability.version, previousVersion: previous?.version }],
      }
      saveRegistry(registry)
      appendEvent(capability.name, previous === undefined ? 'registered' : 'updated', { version: capability.version, previousVersion: previous?.version })
      return { ok: true, capability: registry.capabilities[capability.name] }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_capability_log',
    'Append one capability lifecycle event to F:/KongChain-logs/capabilities/<name>.jsonl. Use for discovery, spec, creation, test pass/fail, install, verification call, update failure, rollback, and developer-mode changes.',
    {
      type: 'object',
      properties: {
        capability: { type: 'string' },
        event: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
      required: ['capability', 'event'],
      additionalProperties: false,
    },
    async (args) => {
      const file = appendEvent(args.capability, args.event, args.data ?? {})
      return { ok: true, file }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_capability_verify',
    'Verify that a capability package is actually installed in a profile: dependency recorded, bundle selected, and local package path. A new process/restart is still required before its tool is registered; this tool reports that honestly.',
    {
      type: 'object',
      properties: {
        profile: { type: 'string' },
        packageName: { type: 'string' },
      },
      required: ['profile', 'packageName'],
      additionalProperties: false,
    },
    async (args) => {
      const profileFile = join(DSH_HOME, 'profiles', String(args.profile), 'package.json')
      const manifest = json(profileFile)
      if (manifest === undefined) return { ok: false, installed: false, error: `profile not found: ${profileFile}` }
      const dependency = manifest.dependencies?.[args.packageName]
      const bundles = manifest.dsh?.profile?.bundles ?? []
      return {
        ok: true,
        installed: dependency !== undefined,
        dependency,
        bundleSelected: bundles.includes(args.packageName),
        bundles,
        registration: 'requires-new-process',
        note: 'The package is installed/selected, but a running process does not load it retroactively. Start a new session/profile before claiming the tool is callable.',
      }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_capability_policy',
    'Return the capability update policy: automatic updates are opt-in; local trusted plugins may auto-update only after explicit policy; permission expansion, third-party code, core runtime changes, and destructive operations require approval.',
    { type: 'object', properties: {}, additionalProperties: false },
    async () => ({
      autoUpdateDefault: false,
      eligibleForAutoUpdate: ['local-trusted plugin', 'same permissions', 'tests passed', 'backup present'],
      requiresApproval: ['permission expansion', 'third-party or unknown source', 'core runtime change', 'destructive command', 'production deployment'],
      rollback: 'restore previous passing version and re-run tests; verify the old tool is callable in a new process',
      manual: 'approvals unavailable in a session must be reported as blocked, not bypassed',
    }),
  ))

  console.log('[kongchain-capability-evolution] loaded')
  console.log('[kongchain-capability-evolution] registered discover/register/log/verify/policy tools')
}
