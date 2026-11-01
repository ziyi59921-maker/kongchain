/**
 * KongChain developer mode.
 *
 * State lives in `.kongchain/developer-mode.json`. A tool guard enforces the
 * state before any write/edit/shell tool runs; `/developer` is the UI entry.
 * Diff, snapshot, rollback, restore, test, and allowlisted command tools make
 * the workflow auditable. This plugin never widens OS permissions.
 *
 * @module @kongchain/dev-mode
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'

export const name = 'kongchain-dev-mode'
export const inject = ['tools']

const EXTENSIONS_ROOT = resolve(import.meta.dirname, '..', '..')
const REPO_ROOT = resolve(EXTENSIONS_ROOT, '..')
const STATE_DIR = join(REPO_ROOT, '.kongchain')
const STATE_FILE = join(STATE_DIR, 'developer-mode.json')
const SNAPSHOT_ROOT = 'F:/KongChain-logs/dev-snapshots'
const ALLOWED = {
  plugins: join(REPO_ROOT, 'extensions'),
  docs: join(REPO_ROOT, 'docs', 'kongchain'),
  core: [join(REPO_ROOT, 'packages'), join(REPO_ROOT, 'apps'), join(REPO_ROOT, 'native'), join(REPO_ROOT, 'python'), join(REPO_ROOT, 'scripts')],
}
const WRITE_TOOLS = new Set(['write', 'edit', 'apply_patch', 'multiedit'])
const SHELL_TOOLS = new Set(['pwsh', 'bash'])
const SOURCE_ROOTS = [join(REPO_ROOT, 'extensions'), join(REPO_ROOT, 'packages'), join(REPO_ROOT, 'apps'), join(REPO_ROOT, 'scripts'), join(REPO_ROOT, 'native'), join(REPO_ROOT, 'python')]
const SOURCE_PATH = /extensions[\\/]|packages[\\/]|apps[\\/]|scripts[\\/]|native[\\/]|python[\\/]/i
const DANGEROUS = /(Remove-Item|Remove-ItemProperty|\brm\b|\bdel\b|\brd\b|git\s+(reset\s+--hard|clean\s+-fd|checkout\s+--\s+\.|revert)|format-volume|Clear-Disk|reg\s+(add|delete)|Set-ExecutionPolicy|shutdown|Stop-Computer|Restart-Computer|Invoke-Expression)/i
const MUTATING = /(Set-Content|Out-File|Add-Content|New-Item|Remove-Item|Move-Item|Copy-Item|Rename-Item|git\s+(add|commit|checkout|reset|apply|clean|stash)|pnpm\s+(add|install|run)|npm\s+(install|run)|python\s+-c)/i

const defaultState = () => ({ enabled: false, workspace: REPO_ROOT, coreAuthorized: false, updatedAt: undefined, by: undefined })

function readState() {
  try {
    return { ...defaultState(), ...JSON.parse(readFileSync(STATE_FILE, 'utf8')) }
  } catch {
    return defaultState()
  }
}

function writeState(state) {
  mkdirSync(STATE_DIR, { recursive: true })
  writeFileSync(STATE_FILE, `${JSON.stringify(state, undefined, 2)}\n`)
}

function inside(path, root) {
  const rel = relative(root, path)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

function allowedWrite(path, state) {
  if (inside(path, ALLOWED.plugins) || inside(path, ALLOWED.docs)) return true
  if (state.coreAuthorized && ALLOWED.core.some((root) => inside(path, root))) return true
  return false
}

function resolveTarget(input) {
  if (typeof input !== 'string' || input.trim() === '') return undefined
  return isAbsolute(input) ? input : resolve(REPO_ROOT, input)
}

/**
 * Run one command and capture its output.
 *
 * `limit` keeps the last N characters for tool payloads that are shown to a
 * model. Artifacts written to disk (the snapshot patch) must pass `limit: 0`:
 * a truncated patch cannot be applied, which is how rollback and restore
 * broke on diffs longer than the limit.
 * @param {string} command Executable name.
 * @param {string[]} args Arguments.
 * @param {string} [cwd] Working directory.
 * @param {number} [limit] Trailing characters to keep; 0 keeps everything.
 * @returns {{ code: number, stdout: string, stderr: string }}
 */
function run(command, args, cwd = REPO_ROOT, limit = 8000) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: true, timeout: 180000, maxBuffer: 64 * 1024 * 1024 })
  const clamp = (text) => (limit > 0 ? text.slice(-limit) : text)
  return { code: result.status ?? 1, stdout: clamp(String(result.stdout ?? '')), stderr: clamp(String(result.stderr ?? result.error?.message ?? '')) }
}

function git(args, limit = 8000) {
  return run('git', args, REPO_ROOT, limit)
}

// Tool payloads are JSON text so a model reads the same structure a script would.
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

const modeTool = tool(
  'kongchain_dev_mode',
  'Inspect, enable, or disable KongChain developer mode. Enabling requires confirm: true and becomes the tool-layer state; disabling immediately blocks write/edit and mutating shell calls again.',
  {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['status', 'enable', 'disable'] },
      confirm: { type: 'boolean' },
      core: { type: 'boolean' },
    },
    required: ['action'],
    additionalProperties: false,
  },
  async (args) => {
    if (args.action === 'status') return readState()
    if (args.action === 'disable') {
      const state = { ...readState(), enabled: false, coreAuthorized: false, updatedAt: new Date().toISOString(), by: 'tool' }
      writeState(state)
      return { ok: true, ...state }
    }
    if (args.confirm !== true) return { ok: false, error: 'enable requires confirm: true' }
    const state = { ...readState(), enabled: true, coreAuthorized: args.core === true, updatedAt: new Date().toISOString(), by: 'tool' }
    writeState(state)
    return { ok: true, ...state }
  },
)

const policyTool = tool(
  'kongchain_dev_policy',
  'Return the KongChain developer-mode write scopes and enforcement rules: A plugin/skills workspace, B KongChain own docs, C upstream core only with explicit core authorization, D everything else denied.',
  { type: 'object', properties: {}, additionalProperties: false },
  async () => ({
    state: readState(),
    scopes: {
      A: { roots: ['extensions/'], purpose: 'plugin, skills, generated plugins', writable: true },
      B: { roots: ['docs/kongchain/'], purpose: 'product/architecture/verification docs', writable: true },
      C: { roots: ['packages/', 'apps/', 'native/', 'python/', 'scripts/'], purpose: 'upstream core patches', writable: 'only when coreAuthorized=true; build/regression required' },
      D: { roots: ['everything outside the repository and F:/KongChain-logs'], purpose: 'denied', writable: false },
    },
    enforcement: 'ctx.tools.guard denies write/edit and mutating shell calls when disabled; path checks run on every write/edit.',
  }),
)

const diffTool = tool(
  'kongchain_dev_diff',
  'Show current Git status and diff for the KongChain workspace. Read-only.',
  { type: 'object', properties: {}, additionalProperties: false },
  async () => ({ status: git(['status', '--short']).stdout, diff: git(['diff', '--stat']).stdout, detail: git(['diff']).stdout }),
)

const snapshotTool = tool(
  'kongchain_dev_snapshot',
  'Save the current tracked changes as a rollback patch under F:/KongChain-logs/dev-snapshots. Requires developer mode.',
  {
    type: 'object',
    properties: { label: { type: 'string' } },
    required: ['label'],
    additionalProperties: false,
  },
  async (args) => {
    const state = readState()
    if (!state.enabled) return { ok: false, error: 'developer mode is disabled' }
    const patch = git(['diff', '--binary', 'HEAD'], 0).stdout
    const status = git(['status', '--short']).stdout
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dir = join(SNAPSHOT_ROOT, `${stamp}-${String(args.label ?? 'snapshot').replace(/[^a-z0-9-]/gi, '')}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'patch.diff'), patch)
    writeFileSync(join(dir, 'status.txt'), status)
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ createdAt: new Date().toISOString(), label: args.label, head: git(['rev-parse', 'HEAD']).stdout.trim() }, undefined, 2))
    return { ok: true, dir, patchEmpty: patch.trim() === '', status }
  },
)

/**
 * Resolve the patch file for a snapshot identifier.
 *
 * `snapshot` may be the directory printed by `kongchain_dev_snapshot` or the
 * `patch.diff` path inside it.
 * @param {unknown} input Snapshot directory or patch path.
 * @returns {string | undefined} Existing patch path inside the snapshot root.
 */
function snapshotPatch(input) {
  const target = resolve(String(input))
  const patch = existsSync(join(target, 'patch.diff')) ? join(target, 'patch.diff') : target
  return inside(patch, resolve(SNAPSHOT_ROOT)) && existsSync(patch) ? patch : undefined
}

const rollbackTool = tool(
  'kongchain_dev_rollback',
  'Reverse-apply one saved snapshot patch, restoring the pre-change version. Pass the snapshot directory printed by kongchain_dev_snapshot or its patch.diff path. Requires developer mode.',
  {
    type: 'object',
    properties: { snapshot: { type: 'string' } },
    required: ['snapshot'],
    additionalProperties: false,
  },
  async (args) => {
    const state = readState()
    if (!state.enabled) return { ok: false, error: 'developer mode is disabled' }
    const patch = snapshotPatch(args.snapshot)
    if (patch === undefined) return { ok: false, error: 'snapshot patch not found; pass a snapshot directory from kongchain_dev_snapshot or its patch.diff path' }
    const result = git(['apply', '-R', patch])
    return { ok: result.code === 0, patch, result }
  },
)

const restoreTool = tool(
  'kongchain_dev_restore',
  'Re-apply one saved snapshot patch after a rollback. Pass the snapshot directory printed by kongchain_dev_snapshot or its patch.diff path. Requires developer mode.',
  {
    type: 'object',
    properties: { snapshot: { type: 'string' } },
    required: ['snapshot'],
    additionalProperties: false,
  },
  async (args) => {
    const state = readState()
    if (!state.enabled) return { ok: false, error: 'developer mode is disabled' }
    const patch = snapshotPatch(args.snapshot)
    if (patch === undefined) return { ok: false, error: 'snapshot patch not found; pass a snapshot directory from kongchain_dev_snapshot or its patch.diff path' }
    const result = git(['apply', patch])
    return { ok: result.code === 0, patch, result }
  },
)

const testTool = tool(
  'kongchain_dev_test',
  'Run syntax checks and Node tests for a directory (defaults to src/index.js and test/*.test.mjs). Requires developer mode.',
  {
    type: 'object',
    properties: { dir: { type: 'string' } },
    required: ['dir'],
    additionalProperties: false,
  },
  async (args) => {
    const state = readState()
    if (!state.enabled) return { ok: false, error: 'developer mode is disabled' }
    const dir = resolve(String(args.dir))
    if (!inside(dir, REPO_ROOT)) return { ok: false, error: 'tests must run inside the KongChain repository' }
    const entry = join(dir, 'src', 'index.js')
    const check = existsSync(entry) ? run(process.execPath, ['--check', entry], dir) : { code: 1, stdout: '', stderr: 'src/index.js missing' }
    const testDir = join(dir, 'test')
    const files = existsSync(testDir)
      ? readdirSync(testDir).filter((file) => file.endsWith('.test.mjs') || file.endsWith('.test.js')).map((file) => join('test', file))
      : []
    const tests = files.length > 0 ? run(process.execPath, ['--test', ...files], dir) : { code: 1, stdout: '', stderr: 'no test files' }
    return { ok: check.code === 0 && tests.code === 0, check, tests, files }
  },
)

const commandTool = tool(
  'kongchain_dev_command',
  'Run an allowlisted development command (node/pnpm/npm/git/python/npx/tsx) in the repository. Requires developer mode; destructive commands are rejected.',
  {
    type: 'object',
    properties: { command: { type: 'string' }, cwd: { type: 'string' } },
    required: ['command'],
    additionalProperties: false,
  },
  async (args) => {
    const state = readState()
    if (!state.enabled) return { ok: false, error: 'developer mode is disabled' }
    const command = String(args.command ?? '').trim()
    if (DANGEROUS.test(command)) return { ok: false, error: 'destructive command rejected; use a separate explicitly approved operation' }
    const head = command.split(/\s+/)[0]?.toLowerCase()
    if (!['node', 'pnpm', 'npm', 'git', 'python', 'npx', 'tsx'].includes(head)) return { ok: false, error: `command not allowlisted: ${head}` }
    const cwd = args.cwd === undefined ? REPO_ROOT : resolve(String(args.cwd))
    if (!inside(cwd, REPO_ROOT)) return { ok: false, error: 'cwd outside the KongChain workspace' }
    return { ok: true, ...run(command, [], cwd) }
  },
)

const reloadTool = (ctx) => tool(
  'kongchain_dev_reload',
  'Report the actual reload requirement for changed files. HMR can reload configuration; module source changes require restarting the profile.',
  { type: 'object', properties: {}, additionalProperties: false },
  async () => {
    const hmr = ctx.get('hmr')
    return {
      hmr: hmr !== undefined,
      action: 'restart-profile',
      reason: 'plugin module source changes are not hot-replaced by the current profile; configuration-only HMR does not apply them',
    }
  },
)

/**
 * Check whether a developer-mode write target falls inside the allowed roots.
 * Exported for the plugin's policy tests; it does not enable the mode itself.
 * @param {string} target Absolute or repository-relative path.
 * @param {{coreAuthorized?: boolean}} [state] Current developer-mode state.
 * @returns {boolean} Whether scope A/B (or authorized C) admits the path.
 */
export function developerPathAllowed(target, state = readState()) {
  const resolved = resolveTarget(target)
  return resolved !== undefined && allowedWrite(resolved, state)
}

export function apply(ctx) {
  ctx.tools.guard((exec) => {
    const state = readState()
    if (WRITE_TOOLS.has(exec.name)) {
      const args = exec.arguments
      const target = typeof args === 'object' && args !== null ? resolveTarget(args.file_path ?? args.path) : undefined
      if (target === undefined) return 'KongChain developer mode requires an explicit file path for write/edit.'
      const isSource = SOURCE_ROOTS.some((root) => inside(target, root))
      if (!isSource) return undefined
      if (!state.enabled) return 'KongChain developer mode is off. Source-code changes require /developer on; ordinary output files remain writable.'
      if (!allowedWrite(target, state)) return `KongChain developer mode denied ${target}: outside scopes A/B (or C without core authorization).`
      return undefined
    }
    if (SHELL_TOOLS.has(exec.name)) {
      const args = exec.arguments
      const command = typeof args === 'object' && args !== null && typeof args.command === 'string' ? args.command : ''
      if (!state.enabled) {
        if (MUTATING.test(command)) {
          if (SOURCE_PATH.test(command)) return 'KongChain developer mode is off. Run /developer on before modifying source files.'
          return undefined
        }
        return undefined
      }
      if (DANGEROUS.test(command)) return 'KongChain developer mode rejects destructive commands; perform the operation separately with explicit approval.'
    }
    return undefined
  })

  ctx.tools.register(modeTool)
  ctx.tools.register(policyTool)
  ctx.tools.register(diffTool)
  ctx.tools.register(snapshotTool)
  ctx.tools.register(rollbackTool)
  ctx.tools.register(restoreTool)
  ctx.tools.register(testTool)
  ctx.tools.register(commandTool)
  ctx.tools.register(reloadTool(ctx))

  const commands = ctx.get('commands')
  if (commands !== undefined) {
    commands.register({
      name: 'developer',
      description: '开启/关闭控链开发者模式，并查看当前工作区权限',
      input: { hint: 'on | off | status | core on | core off' },
      handler: ({ rawInput }) => {
        const action = String(rawInput ?? '').trim().toLowerCase()
        const state = readState()
        if (action === '' || action === 'status') return { kind: 'success', text: `开发者模式：${state.enabled ? '开启' : '关闭'}；核心授权：${state.coreAuthorized ? '是' : '否'}` }
        if (action === 'off') {
          writeState({ ...state, enabled: false, coreAuthorized: false, updatedAt: new Date().toISOString(), by: 'command' })
          return { kind: 'success', text: '控链开发者模式已关闭；写操作与修改型命令将被 guard 拦截。' }
        }
        if (action === 'on') {
          writeState({ ...state, enabled: true, coreAuthorized: false, updatedAt: new Date().toISOString(), by: 'command' })
          return { kind: 'success', text: '控链开发者模式已开启：仅允许 extensions/ 与 docs/kongchain/。核心源码需 /developer core on。' }
        }
        if (action === 'core on') {
          writeState({ ...state, enabled: true, coreAuthorized: true, updatedAt: new Date().toISOString(), by: 'command' })
          return { kind: 'success', text: '核心源码修改已授权；请记录补丁差异并运行构建与回归测试。' }
        }
        if (action === 'core off') {
          writeState({ ...state, coreAuthorized: false, updatedAt: new Date().toISOString(), by: 'command' })
          return { kind: 'success', text: '核心源码修改授权已撤销。' }
        }
        return { kind: 'error', text: '用法：/developer on | off | status | core on | core off' }
      },
    })
  }

  console.log('[kongchain-dev-mode] loaded; guard active')
}
