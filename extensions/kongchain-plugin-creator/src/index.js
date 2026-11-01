/**
 * KongChain plugin workshop.
 *
 * Reuses the official bundle/plugin mechanism: generated plugins are local
 * DSH bundles installed with `dsh plugin --profile ... add link:<dir>`. This
 * plugin only adds scaffolding, manifest/test checks, backup, install, and
 * rollback helpers for the agent; it does not replace Plugin Manager.
 *
 * @module @kongchain/plugin-creator
 */
import { spawnSync } from 'node:child_process'
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

export const name = 'kongchain-plugin-creator'
export const inject = ['tools']

const EXTENSIONS_ROOT = resolve(import.meta.dirname, '..', '..')
const REPO_ROOT = resolve(EXTENSIONS_ROOT, '..')
const PLUGINS_ROOT = join(EXTENSIONS_ROOT, 'kongchain-plugins')
const BACKUP_ROOT = join(PLUGINS_ROOT, '.backups')
const DSH_HOME = process.env.DSH_HOME ?? 'F:/KongChain-home'
const LIFECYCLE_ROOT = 'F:/KongChain-logs/plugins'
const POLICY_FILE = join(LIFECYCLE_ROOT, 'maintenance-policy.json')
const HARNESS_VERSION = (() => {
  try {
    return JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')).version ?? 'unknown'
  } catch {
    return 'unknown'
  }
})()

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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    encoding: 'utf8',
    shell: options.shell ?? false,
    timeout: options.timeout ?? 120000,
    env: { ...process.env, ...options.env },
  })
  return {
    code: result.status ?? 1,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? result.error?.message ?? ''),
  }
}

function pluginDirs() {
  if (!existsSync(PLUGINS_ROOT)) return []
  return readdirSync(PLUGINS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => join(PLUGINS_ROOT, entry.name))
}

function profileSummary() {
  const profilesRoot = join(DSH_HOME, 'profiles')
  if (!existsSync(profilesRoot)) return []
  return readdirSync(profilesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifest = json(join(profilesRoot, entry.name, 'package.json'))
      return {
        name: entry.name,
        dependencies: Object.keys(manifest?.dependencies ?? {}),
        bundles: manifest?.dsh?.profile?.bundles ?? [],
      }
    })
}

function checkPlugin(inputDir) {
  const dir = resolve(inputDir)
  const checks = []
  const manifest = json(join(dir, 'package.json'))
  const nameOk = typeof manifest?.name === 'string' && manifest.name.startsWith('@kongchain-plugin/')
  checks.push({ id: 'manifest', ok: nameOk && typeof manifest.version === 'string' && typeof manifest.description === 'string' && typeof manifest.license === 'string', detail: 'package.json name/version/description/license' })
  const patchRel = typeof manifest?.dsh?.bundle?.patch === 'string' ? manifest.dsh.bundle.patch : undefined
  const patchText = patchRel === undefined ? undefined : text(join(dir, patchRel))
  checks.push({
    id: 'bundle-patch',
    ok: patchRel !== undefined && patchText !== undefined && patchText.includes('insert:'),
    detail: patchRel === undefined ? 'dsh.bundle.patch missing' : join(dir, patchRel),
  })
  const entry = typeof manifest?.main === 'string' ? manifest.main : 'src/index.js'
  const entryPath = join(dir, entry)
  let nodeCheck = { code: 1, stdout: '', stderr: 'entry missing' }
  if (existsSync(entryPath)) nodeCheck = run(process.execPath, ['--check', entryPath], { cwd: dir })
  checks.push({ id: 'node-check', ok: nodeCheck.code === 0, detail: entryPath })

  const testDir = join(dir, 'test')
  let tests = { ok: true, code: 0, stdout: 'no tests', stderr: '', files: [] }
  if (existsSync(testDir)) {
    const files = readdirSync(testDir).filter((file) => file.endsWith('.test.mjs') || file.endsWith('.test.js')).map((file) => join('test', file))
    tests = { ...run(process.execPath, ['--test', ...files], { cwd: dir }), ok: false, files }
    tests.ok = tests.code === 0
    checks.push({ id: 'tests', ok: tests.ok, detail: `${files.length} test file(s)` })
  } else {
    checks.push({ id: 'tests', ok: false, detail: 'no test/ directory' })
  }

  return {
    ok: checks.every((check) => check.ok),
    dir,
    checks,
    nodeCheck: { code: nodeCheck.code, stdout: nodeCheck.stdout.slice(-2000), stderr: nodeCheck.stderr.slice(-2000) },
    tests: { ok: tests.ok, code: tests.code, stdout: String(tests.stdout ?? '').slice(-3000), stderr: String(tests.stderr ?? '').slice(-3000), files: tests.files },
  }
}

function backup(dir) {
  mkdirSync(BACKUP_ROOT, { recursive: true })
  const destination = join(BACKUP_ROOT, `${basename(dir)}-${Date.now()}`)
  cpSync(dir, destination, { recursive: true })
  return destination
}

function restore(dir, snapshot) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
  cpSync(snapshot, dir, { recursive: true })
}

function profileFile(profile, dshHome = DSH_HOME) {
  return join(String(dshHome), 'profiles', String(profile), 'package.json')
}

function readProfile(profile, dshHome = DSH_HOME) {
  return json(profileFile(profile, dshHome))
}

function writeProfile(profile, manifest) {
  writeFileSync(profileFile(profile), `${JSON.stringify(manifest, undefined, 2)}\n`)
}

function localPluginByName(packageName) {
  return pluginDirs().find((dir) => json(join(dir, 'package.json'))?.name === packageName)
}

function loadPolicy() {
  return json(POLICY_FILE) ?? {
    autoUpdate: false,
    allowedSources: ['local'],
    requireTests: true,
    requireSamePermissions: true,
    allowPermissionExpansion: false,
    note: 'Default: automatic updates off. External sources, permission/dependency/network expansion, and core runtime changes require explicit approval.',
  }
}

function appendMaintenance(packageName, event, data) {
  mkdirSync(LIFECYCLE_ROOT, { recursive: true })
  const file = join(LIFECYCLE_ROOT, `${String(packageName).replace(/^@/, '').replace(/[^a-z0-9-]/gi, '-')}.jsonl`)
  appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), packageName, event, data })}\n`)
  return file
}

function lastMaintenance(packageName) {
  const slug = String(packageName).replace(/^@/, '').replace(/[^a-z0-9-]/gi, '-')
  const file = join(LIFECYCLE_ROOT, `${slug}.jsonl`)
  const body = text(file)
  if (body === undefined) return undefined
  const lines = body.trim().split(/\r?\n/).filter(Boolean)
  try {
    return JSON.parse(lines.at(-1))
  } catch {
    return undefined
  }
}

function pluginTools(dir) {
  const source = text(join(dir, 'src', 'index.js')) ?? ''
  return [...source.matchAll(/name:\s*'([a-z][a-z0-9_]+)'/g)]
    .map((match) => match[1])
    .filter((tool, index, all) => !tool.startsWith('kongchain_plugin') && all.indexOf(tool) === index)
}

function skillInventory() {
  const root = join(EXTENSIONS_ROOT, 'kongchain-skills', 'skills')
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const body = text(join(root, entry.name, 'SKILL.md')) ?? ''
      const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(body)?.[1] ?? ''
      const field = (key) => new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(frontmatter)?.[1]?.trim() ?? ''
      return {
        name: field('name') || entry.name,
        version: field('version') || 'unversioned (add version to SKILL.md frontmatter)',
        description: field('description'),
        source: 'local',
        enabled: true,
        path: `extensions/kongchain-skills/skills/${entry.name}/SKILL.md`,
      }
    })
}

function pluginInventory(profile, runTests = false, dshHome = DSH_HOME) {
  const manifest = readProfile(profile, dshHome)
  const dependencies = manifest?.dependencies ?? {}
  const bundles = manifest?.dsh?.profile?.bundles ?? []
  const capabilities = json('F:/KongChain-logs/capabilities/registry.json')?.capabilities ?? {}
  return pluginDirs().map((dir) => {
    const pkg = json(join(dir, 'package.json')) ?? {}
    const capability = capabilities[pkg.name] ?? {}
    const checked = runTests ? checkPlugin(dir) : undefined
    const latest = lastMaintenance(pkg.name)
    return {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      source: capability.source ?? 'local',
      path: dir,
      dependencies: Object.keys(pkg.dependencies ?? {}),
      permissions: pkg.kongchain?.permissions ?? capability.permissions ?? 'not-declared',
      harness: pkg.kongchain?.harness ?? `not-declared; validated against ${HARNESS_VERSION}`,
      tools: pluginTools(dir),
      test: checked === undefined
        ? { status: latest?.event === 'tested' ? (latest.data?.ok === true ? 'pass' : 'fail') : (capability.test?.ok === true ? 'pass' : 'unknown'), lastEvent: latest?.event ?? null, detail: checked === undefined ? 'run inventory with runTests=true for live result' : undefined }
        : { status: checked.ok ? 'pass' : 'fail', ok: checked.ok, tests: checked.tests },
      installed: Object.prototype.hasOwnProperty.call(dependencies, pkg.name),
      dependency: dependencies[pkg.name],
      enabled: bundles.includes(pkg.name),
      profile,
      backupAvailable: existsSync(BACKUP_ROOT) && readdirSync(BACKUP_ROOT).some((entry) => entry.startsWith(`${basename(dir)}-`)),
    }
  })
}

const SCAFFOLD_CHECK = `/**
 * Pure business logic for __PLUGIN_ID__.
 * Replace this stub with the required behavior and keep it testable.
 * @param {Array<Record<string, unknown>>} rows
 * @param {string[]} match
 * @returns {{ duplicates: Array<Record<string, unknown>>, checked: number, match: string[] }}
 */
export function checkRecords(rows, match = ['supplier', 'invoiceNo', 'amount']) {
  return { duplicates: [], checked: Array.isArray(rows) ? rows.length : 0, match }
}
`

function scaffoldFiles(slug, title, description, toolName) {
  const id = slug
  const packageJson = {
    name: `@kongchain-plugin/${id}`,
    version: '0.1.0',
    private: true,
    type: 'module',
    description,
    license: 'MIT',
    main: 'src/index.js',
    files: ['src', 'cordis.patch.yml', 'README.md'],
    dsh: { bundle: { patch: './cordis.patch.yml' } },
  }
  const patch = `- insert:\n    - id: ${id}\n      name: './src/index.js'\n`
  const index = `import { checkRecords } from './check.js'\n\nexport const name = '${id}'\nexport const inject = ['tools']\n\nexport function apply(ctx) {\n  ctx.tools.register({\n    name: '${toolName}',\n    description: ${JSON.stringify(title)},\n    parameters: {\n      type: 'object',\n      properties: {\n        rows: { type: 'array', items: {} },\n        match: { type: 'array', items: { type: 'string' } },\n      },\n      required: ['rows'],\n      additionalProperties: false,\n    },\n    output: {\n      schema: {\n        type: 'object',\n        properties: {\n          duplicates: { type: 'array', items: {} },\n          checked: { type: 'number' },\n          match: { type: 'array', items: { type: 'string' } },\n        },\n        required: ['duplicates', 'checked', 'match'],\n        additionalProperties: false,\n      },\n      render(_args, value) { return [{ type: 'text', text: JSON.stringify(value, null, 2) }] },\n    },\n    async execute(args) { return checkRecords(args.rows, args.match) },\n  })\n}\n`
  const test = `import test from 'node:test'\nimport assert from 'node:assert/strict'\nimport { checkRecords } from '../src/check.js'\n\ntest('returns a result for empty rows', () => {\n  const result = checkRecords([])\n  assert.equal(result.checked, 0)\n  assert.deepEqual(result.duplicates, [])\n})\n\ntest('keeps the configured match fields', () => {\n  const result = checkRecords([], ['supplier', 'invoiceNo'])\n  assert.deepEqual(result.match, ['supplier', 'invoiceNo'])\n})\n`
  const readme = `# ${title}\n\n${description}\n\nGenerated by the KongChain plugin workshop. Manifest, entry, test, and bundle patch are required.\n\n## Test\n\n\`\`\`sh\nnode --test test\n\`\`\`\n`
  return {
    'package.json': `${JSON.stringify(packageJson, undefined, 2)}\n`,
    'cordis.patch.yml': patch,
    'src/check.js': SCAFFOLD_CHECK.replaceAll('__PLUGIN_ID__', id),
    'src/index.js': index,
    'test/check.test.mjs': test,
    'README.md': readme,
  }
}

const STATUS_OUTPUT = { type: 'string' }
const STRING_OUTPUT = { type: 'string' }

function textTool(name, description, parameters, execute) {
  return {
    name,
    description,
    parameters,
    output: { schema: STRING_OUTPUT, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(args) {
      return JSON.stringify(await execute(args ?? {}), undefined, 2)
    },
  }
}

export function apply(ctx) {
  ctx.tools.register({
    name: 'kongchain_plugin_status',
    description: 'List KongChain generated plugins, their versions, and the demo profile state. Reuses the official bundle/plugin model; read-only.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: { schema: STATUS_OUTPUT, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute() {
      return JSON.stringify({
        workspace: PLUGINS_ROOT,
        dshHome: DSH_HOME,
        plugins: pluginDirs().map((dir) => {
          const manifest = json(join(dir, 'package.json'))
          return { dir, name: manifest?.name, version: manifest?.version, hasTests: existsSync(join(dir, 'test')) }
        }),
        profiles: profileSummary(),
        officialCreator: 'Web Creator mode provides plugin_manager + cordis_inspect; this workshop uses the official dsh plugin install path.',
      }, undefined, 2)
    },
  })

  ctx.tools.register(textTool(
    'kongchain_plugin_scaffold',
    'Create a local KongChain plugin bundle scaffold (manifest, patch, plugin entry, pure-logic stub, test, README) under extensions/kongchain-plugins/<slug>. Does not overwrite an existing plugin.',
    {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        toolName: { type: 'string' },
      },
      required: ['slug', 'title', 'description', 'toolName'],
      additionalProperties: false,
    },
    async (args) => {
      const slug = String(args.slug ?? '').replace(/[^a-z0-9-]/g, '')
      if (slug === '') throw new Error('slug must contain a-z, 0-9, or hyphen')
      const dir = join(PLUGINS_ROOT, slug)
      if (existsSync(dir)) return { ok: false, error: `plugin already exists: ${dir}` }
      const files = scaffoldFiles(slug, String(args.title), String(args.description), String(args.toolName))
      for (const [relative, content] of Object.entries(files)) {
        const path = join(dir, relative)
        mkdirSync(resolve(path, '..'), { recursive: true })
        writeFileSync(path, content)
      }
      return { ok: true, dir, files: Object.keys(files) }
    },
  ))

  ctx.tools.register(textTool(
    'kongchain_plugin_check',
    'Validate one generated plugin: manifest, bundle patch, entry syntax, and Node tests. Returns the exact test output. Read-only apart from running the tests.',
    {
      type: 'object',
      properties: { dir: { type: 'string' } },
      required: ['dir'],
      additionalProperties: false,
    },
    async (args) => checkPlugin(String(args.dir)),
  ))

  ctx.tools.register(textTool(
    'kongchain_plugin_install',
    'Install or update a generated plugin bundle into a profile through the official dsh plugin path. Runs checks first, backs up the plugin, installs/links it, and restores the backup if the command fails. Use profile kongchain-demo for acceptance.',
    {
      type: 'object',
      properties: {
        dir: { type: 'string' },
        profile: { type: 'string' },
      },
      required: ['dir'],
      additionalProperties: false,
    },
    async (args) => {
      const dir = resolve(String(args.dir))
      const profile = String(args.profile ?? 'kongchain-demo')
      const checked = checkPlugin(dir)
      if (!checked.ok) return { ok: false, stage: 'check', checked }
      const manifest = json(join(dir, 'package.json'))
      const profileFile = join(DSH_HOME, 'profiles', profile, 'package.json')
      if (manifest === undefined || !existsSync(profileFile)) return { ok: false, stage: 'profile', error: `profile not initialized: ${profileFile}` }
      const snapshot = backup(dir)
      const before = json(profileFile)
      const already = Object.prototype.hasOwnProperty.call(before?.dependencies ?? {}, manifest.name)
      let install = { code: 0, stdout: 'already installed as a link; updated in place', stderr: '' }
      if (!already) {
        install = run('pnpm', ['dsh', 'plugin', '--profile', profile, 'add', `link:${dir}`], { cwd: REPO_ROOT, shell: true })
      }
      const after = json(profileFile)
      const installed = Object.keys(after?.dependencies ?? {}).includes(manifest.name)
      if (install.code !== 0 || !installed) {
        restore(dir, snapshot)
        return { ok: false, stage: 'install', install, restored: snapshot, checked }
      }
      return {
        ok: true,
        stage: 'installed',
        mode: already ? 'update-in-place' : 'install',
        plugin: manifest.name,
        version: manifest.version,
        profile,
        bundles: after?.dsh?.profile?.bundles ?? [],
        backup: snapshot,
        install,
        checked,
      }
    },
  ))

  ctx.tools.register(textTool(
    'kongchain_plugin_rollback',
    'Restore the most recent backup of a generated plugin directory. Use when an update fails after files changed.',
    {
      type: 'object',
      properties: { dir: { type: 'string' } },
      required: ['dir'],
      additionalProperties: false,
    },
    async (args) => {
      const dir = resolve(String(args.dir))
      if (!existsSync(BACKUP_ROOT)) return { ok: false, error: 'no backups' }
      const prefix = `${basename(dir)}-`
      const backups = readdirSync(BACKUP_ROOT)
        .filter((entry) => entry.startsWith(prefix))
        .map((entry) => join(BACKUP_ROOT, entry))
        .sort((left, right) => statSync(left).mtimeMs - statSync(right).mtimeMs)
      const latest = backups.at(-1)
      if (latest === undefined) return { ok: false, error: `no backup for ${basename(dir)}` }
      restore(dir, latest)
      return { ok: true, restoredFrom: latest }
    },
  ))

  ctx.tools.register(textTool(
    'kongchain_plugin_inventory',
    'List local plugins with version, source, dependencies, permissions, declared/inferred tools, recent test status, installed/enabled state, backup availability, and Harness compatibility; also lists skills. Use before creating anything to reuse existing capabilities.',
    {
      type: 'object',
      properties: {
        profile: { type: 'string' },
        runTests: { type: 'boolean' },
        dshHome: { type: 'string' },
      },
      additionalProperties: false,
    },
    async (args) => {
      const profile = String(args.profile ?? 'kongchain-demo')
      return {
        harness: HARNESS_VERSION,
        dshHome: args.dshHome ?? DSH_HOME,
        profile,
        plugins: pluginInventory(profile, args.runTests === true, args.dshHome ?? DSH_HOME),
        skills: skillInventory(),
        policy: loadPolicy(),
        notes: [
          'Skills currently have no version field in frontmatter; reported as unversioned rather than invented.',
          'test status without runTests comes from the latest maintenance event or capability registry; run inventory with runTests=true for live results.',
          'enabled means the plugin is selected in dsh.profile.bundles; a new process is still required to load it.',
        ],
      }
    },
  ))

  ctx.tools.register(textTool(
    'kongchain_plugin_version',
    'Report the local plugin version and the profile installation/enabled state for one plugin directory or package name.',
    {
      type: 'object',
      properties: {
        dir: { type: 'string' },
        packageName: { type: 'string' },
        profile: { type: 'string' },
        dshHome: { type: 'string' },
      },
      additionalProperties: false,
    },
    async (args) => {
      const profile = String(args.profile ?? 'kongchain-demo')
      const dshHome = args.dshHome ?? DSH_HOME
      const requested = args.dir === undefined ? String(args.packageName ?? '') : undefined
      const dir = requested === undefined
        ? resolve(String(args.dir))
        : pluginDirs().find((candidate) => {
            const pkg = json(join(candidate, 'package.json'))
            return pkg?.name === requested || basename(candidate) === requested || pkg?.name?.split('/').at(-1) === requested
          })
      if (dir === undefined || !existsSync(join(dir, 'package.json'))) return { ok: false, error: 'plugin not found' }
      const pkg = json(join(dir, 'package.json'))
      const manifest = readProfile(profile, dshHome)
      return {
        ok: true,
        plugin: pkg.name,
        localVersion: pkg.version,
        path: dir,
        profile,
        dshHome,
        dependency: manifest?.dependencies?.[pkg.name] ?? null,
        installed: Object.prototype.hasOwnProperty.call(manifest?.dependencies ?? {}, pkg.name),
        enabled: (manifest?.dsh?.profile?.bundles ?? []).includes(pkg.name),
        harness: HARNESS_VERSION,
        latestEvent: lastMaintenance(pkg.name) ?? null,
      }
    },
  ))

  ctx.tools.register(textTool(
    'kongchain_plugin_policy',
    'Read or set the local plugin maintenance policy. Automatic updates are off by default; setting policy requires confirm=true. Permission expansion or external sources remain approval-gated.',
    {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get', 'set'] },
        policy: { type: 'object', additionalProperties: true },
        confirm: { type: 'boolean' },
      },
      required: ['action'],
      additionalProperties: false,
    },
    async (args) => {
      if (args.action === 'get') return loadPolicy()
      if (args.confirm !== true) return { ok: false, error: 'setting maintenance policy requires confirm=true' }
      const policy = { ...loadPolicy(), ...(args.policy ?? {}), updatedAt: new Date().toISOString() }
      mkdirSync(LIFECYCLE_ROOT, { recursive: true })
      writeFileSync(POLICY_FILE, `${JSON.stringify(policy, undefined, 2)}\n`)
      appendMaintenance('policy', 'updated', policy)
      return { ok: true, policy }
    },
  ))

  ctx.tools.register(textTool(
    'kongchain_plugin_log',
    'Append a structured plugin maintenance event: source, old/new version, reason, files, dependencies, permissions, tests, activation, rollback.',
    {
      type: 'object',
      properties: {
        packageName: { type: 'string' },
        event: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
      required: ['packageName', 'event'],
      additionalProperties: false,
    },
    async (args) => ({ ok: true, file: appendMaintenance(args.packageName, args.event, args.data ?? {}) }),
  ))

  ctx.tools.register(textTool(
    'kongchain_plugin_upgrade',
    'Upgrade an installed local plugin from an isolated candidate copy: check candidate tests, compare permissions/dependencies, backup the live version, activate only on success, and restore the old version if activation fails. Requires approve=true or autoUpdate policy.',
    {
      type: 'object',
      properties: {
        dir: { type: 'string' },
        profile: { type: 'string' },
        approve: { type: 'boolean' },
        reason: { type: 'string' },
      },
      required: ['dir'],
      additionalProperties: false,
    },
    async (args) => {
      const candidateDir = resolve(String(args.dir))
      const profile = String(args.profile ?? 'kongchain-demo')
      const candidatePkg = json(join(candidateDir, 'package.json'))
      if (candidatePkg === undefined) return { ok: false, stage: 'candidate', error: 'candidate package.json missing' }
      const liveDir = localPluginByName(candidatePkg.name)
      if (liveDir === undefined) return { ok: false, stage: 'candidate', error: 'not installed; use kongchain_plugin_install for a new plugin' }
      const livePkg = json(join(liveDir, 'package.json'))
      const policy = loadPolicy()
      const permissionChanged = JSON.stringify(livePkg?.kongchain?.permissions ?? null) !== JSON.stringify(candidatePkg?.kongchain?.permissions ?? null)
      const depsBefore = Object.keys(livePkg?.dependencies ?? {})
      const depsAfter = Object.keys(candidatePkg?.dependencies ?? {})
      const dependencyChanged = JSON.stringify(depsBefore) !== JSON.stringify(depsAfter)
      if ((permissionChanged && policy.allowPermissionExpansion !== true) || (dependencyChanged && policy.requireSamePermissions !== false)) {
        appendMaintenance(candidatePkg.name, 'approval-required', { candidateDir, oldVersion: livePkg.version, newVersion: candidatePkg.version, permissionChanged, dependencyChanged })
        return { ok: false, stage: 'approval', approvalRequired: true, permissionChanged, dependencyChanged, reason: 'permission/dependency change requires explicit approval; policy does not allow it' }
      }
      if (policy.autoUpdate !== true && args.approve !== true) {
        return { ok: false, stage: 'approval', approvalRequired: true, reason: 'automatic update policy is off; pass approve=true after user authorization' }
      }
      const checked = checkPlugin(candidateDir)
      if (!checked.ok) {
        appendMaintenance(candidatePkg.name, 'update-failed', { candidateDir, oldVersion: livePkg.version, newVersion: candidatePkg.version, stage: 'check', tests: checked.tests, oldPreserved: true })
        return { ok: false, stage: 'check', checked, oldVersion: livePkg.version, oldPreserved: true }
      }
      const liveBackup = backup(liveDir)
      const profilePath = profileFile(profile)
      const profileSnapshot = readFileSync(profilePath, 'utf8')
      const install = (() => {
        rmSync(liveDir, { recursive: true, force: true })
        cpSync(candidateDir, liveDir, { recursive: true })
        return run('pnpm', ['dsh', 'plugin', '--profile', profile, 'add', `link:${liveDir}`], { cwd: REPO_ROOT, shell: true })
      })()
      const after = readProfile(profile)
      const installed = Object.prototype.hasOwnProperty.call(after?.dependencies ?? {}, candidatePkg.name)
      const enabled = (after?.dsh?.profile?.bundles ?? []).includes(candidatePkg.name)
      if (install.code !== 0 || !installed || !enabled) {
        restore(liveDir, liveBackup)
        writeFileSync(profilePath, profileSnapshot)
        const repair = run('pnpm', ['dsh', 'plugin', '--profile', profile, 'add', `link:${liveDir}`], { cwd: REPO_ROOT, shell: true })
        appendMaintenance(candidatePkg.name, 'rolled-back', { candidateDir, oldVersion: livePkg.version, newVersion: candidatePkg.version, stage: 'activation', install, repair, restoredFrom: liveBackup })
        return { ok: false, stage: 'activation', install, repaired: repair.code === 0, restoredFrom: liveBackup, oldVersion: livePkg.version }
      }
      appendMaintenance(candidatePkg.name, 'updated', {
        source: 'local',
        oldVersion: livePkg.version,
        newVersion: candidatePkg.version,
        reason: args.reason ?? 'local plugin upgrade',
        candidateDir,
        liveDir,
        dependencies: { before: depsBefore, after: depsAfter },
        permissions: { before: livePkg?.kongchain?.permissions ?? null, after: candidatePkg?.kongchain?.permissions ?? null },
        tests: { ok: checked.ok, files: checked.tests.files, stdout: checked.tests.stdout, stderr: checked.tests.stderr },
        activation: { installed, enabled, profile, requiresNewProcess: true },
        rollback: false,
      })
      return {
        ok: true,
        stage: 'activated',
        plugin: candidatePkg.name,
        oldVersion: livePkg.version,
        newVersion: candidatePkg.version,
        profile,
        installed,
        enabled,
        backup: liveBackup,
        tests: checked.tests,
        requiresNewProcess: true,
      }
    },
  ))

  ctx.tools.register(textTool(
    'kongchain_plugin_set_enabled',
    'Enable or disable a plugin in a profile by editing dsh.profile.bundles. Disabling keeps the dependency and source; activation changes require a new process.',
    {
      type: 'object',
      properties: {
        dir: { type: 'string' },
        profile: { type: 'string' },
        enabled: { type: 'boolean' },
      },
      required: ['dir', 'enabled'],
      additionalProperties: false,
    },
    async (args) => {
      const dir = resolve(String(args.dir))
      const profile = String(args.profile ?? 'kongchain-demo')
      const pkg = json(join(dir, 'package.json'))
      if (pkg === undefined) return { ok: false, error: 'plugin package.json missing' }
      const manifest = readProfile(profile)
      if (manifest === undefined) return { ok: false, error: `profile not found: ${profile}` }
      if (!Object.prototype.hasOwnProperty.call(manifest.dependencies ?? {}, pkg.name)) return { ok: false, error: 'plugin not installed in profile' }
      manifest.dsh = manifest.dsh ?? {}
      manifest.dsh.profile = manifest.dsh.profile ?? {}
      const bundles = new Set(manifest.dsh.profile.bundles ?? [])
      if (args.enabled) bundles.add(pkg.name)
      else bundles.delete(pkg.name)
      manifest.dsh.profile.bundles = [...bundles]
      writeProfile(profile, manifest)
      appendMaintenance(pkg.name, args.enabled ? 'enabled' : 'disabled', { profile, version: pkg.version, requiresNewProcess: true })
      return { ok: true, plugin: pkg.name, profile, enabled: args.enabled, bundles: manifest.dsh.profile.bundles, requiresNewProcess: true }
    },
  ))

  ctx.tools.register(textTool(
    'kongchain_plugin_uninstall',
    'Uninstall a plugin from a profile through the official dsh plugin remove path and remove its bundle entry. Source and backups are kept for audit/rollback.',
    {
      type: 'object',
      properties: { dir: { type: 'string' }, profile: { type: 'string' } },
      required: ['dir'],
      additionalProperties: false,
    },
    async (args) => {
      const dir = resolve(String(args.dir))
      const profile = String(args.profile ?? 'kongchain-demo')
      const pkg = json(join(dir, 'package.json'))
      const manifest = readProfile(profile)
      if (pkg === undefined || manifest === undefined) return { ok: false, error: 'plugin or profile missing' }
      const before = { dependency: manifest.dependencies?.[pkg.name], bundles: manifest.dsh?.profile?.bundles ?? [] }
      if (manifest.dsh?.profile?.bundles !== undefined) manifest.dsh.profile.bundles = manifest.dsh.profile.bundles.filter((name) => name !== pkg.name)
      writeProfile(profile, manifest)
      const removed = run('pnpm', ['dsh', 'plugin', '--profile', profile, 'remove', pkg.name], { cwd: REPO_ROOT, shell: true })
      const after = readProfile(profile)
      const still = Object.prototype.hasOwnProperty.call(after?.dependencies ?? {}, pkg.name)
      appendMaintenance(pkg.name, 'uninstalled', { profile, version: pkg.version, before, removed, stillInstalled: still, sourceKept: true })
      return { ok: removed.code === 0 && !still, profile, plugin: pkg.name, removed, stillInstalled: still, sourceKept: dir }
    },
  ))

  ctx.tools.register(textTool(
    'kongchain_plugin_history',
    'Show local backups and the structured maintenance log for one plugin.',
    {
      type: 'object',
      properties: { dir: { type: 'string' } },
      required: ['dir'],
      additionalProperties: false,
    },
    async (args) => {
      const dir = resolve(String(args.dir))
      const pkg = json(join(dir, 'package.json'))
      if (pkg === undefined) return { ok: false, error: 'plugin package.json missing' }
      const backups = existsSync(BACKUP_ROOT)
        ? readdirSync(BACKUP_ROOT).filter((entry) => entry.startsWith(`${basename(dir)}-`)).sort()
        : []
      const logFile = join(LIFECYCLE_ROOT, `${String(pkg.name).replace(/^@/, '').replace(/[^a-z0-9-]/gi, '-')}.jsonl`)
      return { ok: true, plugin: pkg.name, version: pkg.version, backups, logFile, log: text(logFile) ?? '' }
    },
  ))

  console.log('[kongchain-plugin-creator] loaded')
  console.log('[kongchain-plugin-creator] registered scaffold/check/install/rollback + inventory/version/policy/upgrade/enable/uninstall tools')
}
