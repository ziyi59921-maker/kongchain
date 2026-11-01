/**
 * KongChain developer-mode plugin.
 *
 * Adds two read-only tools: one returns the developer-mode write boundary, the
 * other statically validates the extension workspace. It never edits files and
 * never runs a subprocess; the actual filesystem boundary remains the Harness
 * sandbox and permission policy, not this plugin.
 *
 * @module @kongchain/developer
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export const name = 'kongchain-developer'
export const inject = ['tools']

const EXTENSIONS_ROOT = resolve(import.meta.dirname, '..', '..')
const REPO_ROOT = resolve(EXTENSIONS_ROOT, '..')
const SKILLS_ROOT = resolve(EXTENSIONS_ROOT, 'kongchain-skills', 'skills')
const PRODUCT_SPEC = resolve(REPO_ROOT, 'docs', 'kongchain', 'PRODUCT_SPEC.md')
const BUNDLE_PATCH = resolve(EXTENSIONS_ROOT, 'kongchain-bundle', 'cordis.patch.yml')

const WRITABLE_ROOTS = ['extensions/', 'docs/kongchain/']
const FORBIDDEN_ROOTS = [
  'packages/',
  'apps/',
  'vendor/',
  'native/',
  'python/',
  'scripts/',
  'benchmarks/',
  'website/',
  'pnpm-lock.yaml',
  'package.json',
  'pnpm-workspace.yaml',
]
const VERIFICATION_COMMANDS = [
  'pnpm dsh --profile kongchain --dump-config',
  'pnpm dsh --profile kongchain web --no-open --port 3082',
  'pnpm dsh --profile headless --patch F:/KongChain/extensions/kongchain-bundle/verify.patch.yml --json "call kongchain_runtime_info"',
  'pnpm run build   # 仅当修改了上游 workspace 包时需要；本轮不修改上游',
]

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

function skillChecks(issues) {
  if (!existsSync(SKILLS_ROOT)) {
    issues.push({ code: 'skills-root-missing', detail: 'extensions/kongchain-skills/skills is missing' })
    return 0
  }
  let count = 0
  for (const entry of readdirSync(SKILLS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    count += 1
    const file = resolve(SKILLS_ROOT, entry.name, 'SKILL.md')
    const body = text(file)
    if (body === undefined) {
      issues.push({ code: 'skill-missing', detail: `skills/${entry.name}/SKILL.md is missing` })
      continue
    }
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(body)?.[1] ?? ''
    const field = (key) => new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(frontmatter)?.[1]?.trim() ?? ''
    if (field('name') === '') issues.push({ code: 'skill-name-missing', detail: `skills/${entry.name}/SKILL.md has no name` })
    if (field('description') === '') issues.push({ code: 'skill-description-missing', detail: `skills/${entry.name}/SKILL.md has no description` })
  }
  return count
}

function validate() {
  const issues = []
  const checks = []

  const spec = text(PRODUCT_SPEC)
  checks.push({
    id: 'product-spec',
    ok: spec !== undefined && spec.includes('可扩展 AI Agent 工作台') && spec.includes('采购付款'),
    detail: 'docs/kongchain/PRODUCT_SPEC.md exists and names the product and procurement boundary',
  })
  if (spec === undefined) issues.push({ code: 'product-spec-missing', detail: 'docs/kongchain/PRODUCT_SPEC.md is missing' })
  else if (!spec.includes('可扩展 AI Agent 工作台') || !spec.includes('采购付款')) {
    issues.push({ code: 'product-spec-incomplete', detail: 'PRODUCT_SPEC.md lacks the product definition or procurement statement' })
  }

  const bundleText = text(BUNDLE_PATCH)
  checks.push({
    id: 'bundle-patch',
    ok: bundleText !== undefined
      && bundleText.includes('@kongchain/core')
      && bundleText.includes('@kongchain/tools')
      && bundleText.includes('@kongchain/professional')
      && bundleText.includes('@kongchain/brand'),
    detail: 'extensions/kongchain-bundle/cordis.patch.yml mounts core, tools, professional, and brand rows',
  })
  if (bundleText === undefined) issues.push({ code: 'bundle-patch-missing', detail: 'extensions/kongchain-bundle/cordis.patch.yml is missing' })

  let extensionCount = 0
  for (const entry of readdirSync(EXTENSIONS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('kongchain-')) continue
    extensionCount += 1
    const manifest = json(resolve(EXTENSIONS_ROOT, entry.name, 'package.json'))
    const manifestOk = typeof manifest?.name === 'string'
      && manifest.name.startsWith('@kongchain/')
      && typeof manifest.version === 'string'
      && typeof manifest.description === 'string'
      && typeof manifest.license === 'string'
    checks.push({
      id: `package:${entry.name}`,
      ok: manifestOk,
      detail: `extensions/${entry.name}/package.json declares name, version, description, and license`,
    })
    if (!manifestOk) issues.push({ code: 'package-manifest-invalid', detail: `extensions/${entry.name}/package.json is incomplete` })
    if (text(resolve(EXTENSIONS_ROOT, entry.name, 'README.md')) === undefined) {
      issues.push({ code: 'package-readme-missing', detail: `extensions/${entry.name}/README.md is missing` })
    }
  }

  const skillCount = skillChecks(issues)
  checks.push({ id: 'skills', ok: issues.every((issue) => !issue.code.startsWith('skill')), detail: `${skillCount} skill(s) checked` })

  return { ok: issues.length === 0, issues, checks, extensionCount, skillCount }
}

const POLICY_OUTPUT = {
  type: 'object',
  properties: {
    mode: { type: 'string' },
    writableRoots: { type: 'array', items: { type: 'string' } },
    forbiddenRoots: { type: 'array', items: { type: 'string' } },
    verificationCommands: { type: 'array', items: { type: 'string' } },
    note: { type: 'string' },
  },
  required: ['mode', 'writableRoots', 'forbiddenRoots', 'verificationCommands', 'note'],
  additionalProperties: false,
}

const VALIDATE_OUTPUT = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    extensionCount: { type: 'number' },
    skillCount: { type: 'number' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: { code: { type: 'string' }, detail: { type: 'string' } },
        required: ['code', 'detail'],
        additionalProperties: false,
      },
    },
    checks: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, ok: { type: 'boolean' }, detail: { type: 'string' } },
        required: ['id', 'ok', 'detail'],
        additionalProperties: false,
      },
    },
  },
  required: ['ok', 'extensionCount', 'skillCount', 'issues', 'checks'],
  additionalProperties: false,
}

/**
 * Mount the KongChain developer-mode tools.
 * @param {import('@deepseek-ai/cordis').Context} ctx Host context.
 */
export function apply(ctx) {
  ctx.tools.register({
    name: 'kongchain_developer_policy',
    description:
      'Return the KongChain developer-mode write boundary: writable extension/docs roots, protected upstream roots, and the commands used to verify an extension change. Read-only.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: {
      schema: POLICY_OUTPUT,
      render(_args, value) {
        return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
      },
    },
    async execute() {
      return {
        mode: 'kongchain-extension-development',
        writableRoots: WRITABLE_ROOTS,
        forbiddenRoots: FORBIDDEN_ROOTS,
        verificationCommands: VERIFICATION_COMMANDS,
        note: 'This tool reports policy only. The Harness sandbox and permission preset enforce the real filesystem boundary; never treat this output as a grant.',
      }
    },
  })

  ctx.tools.register({
    name: 'kongchain_validate_extensions',
    description:
      'Statically validate the KongChain extension workspace: PRODUCT_SPEC.md, the bundle patch rows, every extension package manifest/README, and every skill frontmatter. Read-only; returns ok plus per-check details.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: {
      schema: VALIDATE_OUTPUT,
      render(_args, value) {
        return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
      },
    },
    async execute() {
      return validate()
    },
  })

  console.log('[kongchain-developer] loaded')
  console.log('[kongchain-developer] registered tools kongchain_developer_policy, kongchain_validate_extensions')
}
