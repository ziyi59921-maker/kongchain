/**
 * KongChain discovery tools.
 *
 * Gives the agent one read-only catalog of the extension packages, the bundle
 * patch, and the on-disk skills so new work starts from the real composition
 * instead of guessed paths. Uses only Node built-ins.
 *
 * @module @kongchain/tools
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export const name = 'kongchain-tools'
export const inject = ['tools']

const EXTENSIONS_ROOT = resolve(import.meta.dirname, '..', '..')
const SKILLS_ROOT = resolve(EXTENSIONS_ROOT, 'kongchain-skills', 'skills')

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

function extensionCatalog() {
  return readdirSync(EXTENSIONS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('kongchain-'))
    .map((entry) => {
      const manifest = json(resolve(EXTENSIONS_ROOT, entry.name, 'package.json'))
      return {
        dir: entry.name,
        name: typeof manifest?.name === 'string' ? manifest.name : entry.name,
        version: typeof manifest?.version === 'string' ? manifest.version : '0.0.0',
        description: typeof manifest?.description === 'string' ? manifest.description : '',
        declaresBundle: manifest?.dsh?.bundle !== undefined,
      }
    })
    .sort((left, right) => left.dir.localeCompare(right.dir))
}

function skillCatalog() {
  if (!existsSync(SKILLS_ROOT)) return []
  return readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const file = resolve(SKILLS_ROOT, entry.name, 'SKILL.md')
      const body = text(file)
      if (body === undefined) {
        return { name: entry.name, description: '', path: `extensions/kongchain-skills/skills/${entry.name}/SKILL.md`, valid: false }
      }
      const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(body)?.[1] ?? ''
      const field = (key) => {
        const match = new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(frontmatter)
        return match?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? ''
      }
      return {
        name: field('name') || entry.name,
        description: field('description'),
        path: `extensions/kongchain-skills/skills/${entry.name}/SKILL.md`,
        valid: field('name') !== '' && field('description') !== '',
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}

function bundleInfo() {
  const manifest = json(resolve(EXTENSIONS_ROOT, 'kongchain-bundle', 'package.json'))
  const patch = typeof manifest?.dsh?.bundle?.patch === 'string' ? manifest.dsh.bundle.patch : undefined
  return {
    name: typeof manifest?.name === 'string' ? manifest.name : '@kongchain/bundle',
    version: typeof manifest?.version === 'string' ? manifest.version : '0.0.0',
    patch: patch === undefined ? '' : `extensions/kongchain-bundle/${patch.replace(/^\.\//, '')}`,
    patchExists: patch !== undefined && existsSync(resolve(EXTENSIONS_ROOT, 'kongchain-bundle', patch.replace(/^\.\//, ''))),
  }
}

const CATALOG_OUTPUT = {
  type: 'object',
  properties: {
    workspaceRoot: { type: 'string' },
    extensions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dir: { type: 'string' },
          name: { type: 'string' },
          version: { type: 'string' },
          description: { type: 'string' },
          declaresBundle: { type: 'boolean' },
        },
        required: ['dir', 'name', 'version', 'description', 'declaresBundle'],
        additionalProperties: false,
      },
    },
    bundle: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        version: { type: 'string' },
        patch: { type: 'string' },
        patchExists: { type: 'boolean' },
      },
      required: ['name', 'version', 'patch', 'patchExists'],
      additionalProperties: false,
    },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          path: { type: 'string' },
          valid: { type: 'boolean' },
        },
        required: ['name', 'description', 'path', 'valid'],
        additionalProperties: false,
      },
    },
  },
  required: ['workspaceRoot', 'extensions', 'bundle', 'skills'],
  additionalProperties: false,
}

/**
 * Mount the KongChain discovery tools.
 * @param {import('@deepseek-ai/cordis').Context} ctx Host context.
 */
export function apply(ctx) {
  ctx.tools.register({
    name: 'kongchain_extension_catalog',
    description:
      'List the KongChain extension packages, the bundle patch, and the on-disk skills with names and versions. Read-only; call it before adding, changing, or installing an extension so paths and manifests come from the checkout.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    output: {
      schema: CATALOG_OUTPUT,
      render(_args, value) {
        return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
      },
    },
    async execute() {
      return {
        workspaceRoot: resolve(EXTENSIONS_ROOT, '..'),
        extensions: extensionCatalog(),
        bundle: bundleInfo(),
        skills: skillCatalog(),
      }
    },
  })

  console.log('[kongchain-tools] loaded')
  console.log('[kongchain-tools] registered tool kongchain_extension_catalog')
}
