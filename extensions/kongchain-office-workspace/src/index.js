/**
 * KongChain office workspace host plugin.
 * Reuses existing Harness file/upload/preview services and adds a stable local
 * file registry plus safe CSV version editing. No parallel Agent runtime.
 */
import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, statSync, readdirSync, createReadStream } from 'node:fs'
import { createHash } from 'node:crypto'
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'

export const name = 'kongchain-office-workspace'
// `webServer` is optional: headless profiles register the file tools without any HTTP surface.
export const inject = ['tools']

// Registry location is deployment state, not a build constant; the default matches the KongChain log tree.
const ROOT = resolve(process.env.KONGCHAIN_OFFICE_ROOT ?? 'F:/KongChain-logs/office')
const REGISTRY = join(ROOT, 'registry.json')
const FILES_ROOT = join(ROOT, 'files')
const stringOutput = { type: 'string' }

function tool(name, description, parameters, execute) {
  return {
    name,
    description,
    parameters,
    output: { schema: stringOutput, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(args, exec) {
      return JSON.stringify(await execute(args ?? {}, exec), undefined, 2)
    },
  }
}

function readRegistry() {
  try {
    return JSON.parse(readFileSync(REGISTRY, 'utf8'))
  } catch {
    return { files: [] }
  }
}

function writeRegistry(registry) {
  mkdirSync(ROOT, { recursive: true })
  writeFileSync(REGISTRY, `${JSON.stringify(registry, undefined, 2)}\n`)
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function classify(path) {
  const ext = extname(path).toLowerCase()
  if (['.xlsx', '.xls', '.csv'].includes(ext)) return '表格'
  if (['.docx', '.doc', '.md', '.txt'].includes(ext)) return '文档'
  if (ext === '.pdf') return 'PDF'
  return '附件'
}

function recordFile(path, source, taskId) {
  const stat = statSync(path)
  const registry = readRegistry()
  const existing = registry.files.find((file) => file.absolutePath === resolve(path))
  const base = {
    id: existing?.id ?? `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: basename(path),
    absolutePath: resolve(path),
    type: classify(path),
    ext: extname(path).toLowerCase(),
    size: stat.size,
    modified: new Date(stat.mtimeMs).toISOString(),
    sha256: sha256(path),
    source,
    taskIds: [...new Set([...(existing?.taskIds ?? []), ...(taskId ? [taskId] : [])])],
    versions: existing?.versions ?? [],
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (existing) Object.assign(existing, base)
  else registry.files.push(base)
  writeRegistry(registry)
  return base
}

function isWithin(parent, candidate) {
  const rel = relative(resolve(parent), resolve(candidate))
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

/** Office workspace plus the directory this host process was launched in (the session workspace). */
function authorizedRoots() {
  return [FILES_ROOT, ROOT, process.cwd()]
}

function safeRoot(path) {
  const absolute = resolve(path)
  if (authorizedRoots().some((root) => isWithin(root, absolute))) return absolute
  throw new Error(`path outside authorized office workspace: ${absolute}`)
}

export function apply(ctx) {
  ctx.tools.register(tool(
    'office_file_register',
    'Register one authorized local file in the stable office file registry with type, source, size, modification time and SHA-256. Original files are never modified.',
    {
      type: 'object',
      properties: { path: { type: 'string' }, source: { type: 'string' }, taskId: { type: 'string' } },
      required: ['path'],
      additionalProperties: false,
    },
    async (args) => {
      const path = safeRoot(args.path)
      if (!existsSync(path)) throw new Error(`file not found: ${path}`)
      return { ok: true, file: recordFile(path, args.source ?? 'local', args.taskId) }
    },
  ))

  ctx.tools.register(tool(
    'office_file_list',
    'List registered office files by category and metadata. Uses real registry entries, not a fake file list.',
    {
      type: 'object',
      properties: { category: { type: 'string' }, taskId: { type: 'string' } },
      additionalProperties: false,
    },
    async (args) => {
      const registry = readRegistry()
      const files = registry.files.filter((file) =>
        (args.category === undefined || file.type === args.category) &&
        (args.taskId === undefined || (file.taskIds ?? []).includes(args.taskId)))
      return { ok: true, count: files.length, files }
    },
  ))

  ctx.tools.register(tool(
    'office_file_read',
    'Read CSV/XLSX/DOCX/PDF metadata and text/table content through the existing Python document helpers. PDF is text-layer only; unsupported formats return explicit limitations.',
    {
      type: 'object',
      properties: { path: { type: 'string' }, maxChars: { type: 'number' } },
      required: ['path'],
      additionalProperties: false,
    },
    async (args) => {
      const path = safeRoot(args.path)
      const helper = resolve(import.meta.dirname, '..', '..', 'kongchain-internal-control-tools', 'python', 'tools.py')
      if (!existsSync(helper)) throw new Error(`office reader helper not found: ${helper}`)
      const result = spawnSync('python', [helper, 'extract'], {
        input: JSON.stringify({ path, maxChars: args.maxChars ?? 20000 }),
        encoding: 'utf8',
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
        timeout: 120000,
      })
      if (result.error !== undefined) throw new Error(`office reader could not start python: ${result.error.message}`)
      if ((result.stdout ?? '').trim() === '') {
        throw new Error(`office reader failed (exit ${result.status}): ${(result.stderr ?? '').trim()}`)
      }
      return JSON.parse(result.stdout)
    },
  ))

  ctx.tools.register(tool(
    'office_csv_save_version',
    'Save a CSV as a new version beside the registered file. The original is preserved; version files are named with timestamp and linked in the registry.',
    {
      type: 'object',
      properties: { fileId: { type: 'string' }, csvText: { type: 'string' }, reason: { type: 'string' } },
      required: ['fileId', 'csvText'],
      additionalProperties: false,
    },
    async (args) => {
      const registry = readRegistry()
      const file = registry.files.find((item) => item.id === args.fileId)
      if (file === undefined) throw new Error(`unknown file id: ${args.fileId}`)
      if (file.ext !== '.csv') throw new Error('office_csv_save_version only writes CSV; other formats keep read-only preview')
      mkdirSync(FILES_ROOT, { recursive: true })
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const versionPath = join(FILES_ROOT, `${file.name.replace(/\.csv$/i, '')}-${stamp}.csv`)
      writeFileSync(versionPath, args.csvText, 'utf8')
      const version = { path: versionPath, sha256: sha256(versionPath), createdAt: new Date().toISOString(), reason: args.reason ?? 'AI/user edit', original: file.absolutePath }
      file.versions.push(version)
      file.updatedAt = version.createdAt
      writeRegistry(registry)
      return { ok: true, file, version }
    },
  ))

  ctx.tools.register(tool(
    'office_file_export',
    'Export one registered file or version to an authorized office output directory without overwriting the source.',
    {
      type: 'object',
      properties: { fileId: { type: 'string' }, versionIndex: { type: 'number' }, outputDir: { type: 'string' } },
      required: ['fileId', 'outputDir'],
      additionalProperties: false,
    },
    async (args) => {
      const registry = readRegistry()
      const file = registry.files.find((item) => item.id === args.fileId)
      if (file === undefined) throw new Error(`unknown file id: ${args.fileId}`)
      const source = args.versionIndex === undefined ? file.absolutePath : file.versions[args.versionIndex]?.path
      if (source === undefined) throw new Error('source version not found')
      const outputDir = safeRoot(args.outputDir)
      mkdirSync(outputDir, { recursive: true })
      const target = join(outputDir, basename(source))
      if (existsSync(target)) throw new Error(`refusing to overwrite export target: ${target}`)
      copyFileSync(source, target)
      return { ok: true, source, target, sha256: sha256(target) }
    },
  ))

  /** Local preview/registry HTTP surface; only meaningful when the host runs a web server. */
  const httpRoutes = () => [
    {
      kind: 'exact',
      path: '/api/kongchain-office/files',
      handler: (request, response) => {
        if (request.method !== 'GET') {
          response.statusCode = 405
          response.end(JSON.stringify({ error: 'method not allowed' }))
          return
        }
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify(readRegistry()))
      },
    },
    {
      kind: 'prefix',
      path: '/api/kongchain-office/file',
      resource: (request) => {
        const url = new URL(request.url, 'http://127.0.0.1')
        const path = safeRoot(url.searchParams.get('path') ?? '')
        if (!existsSync(path)) return undefined
        return { stream: createReadStream(path), mimeType: 'application/octet-stream' }
      },
    },
    {
      kind: 'exact',
      path: '/api/kongchain-office/csv',
      handler: (request, response) => {
        if (request.method !== 'POST') {
          response.statusCode = 405
          response.end(JSON.stringify({ error: 'method not allowed' }))
          return
        }
        let body = ''
        request.on('data', (chunk) => { body += chunk })
        request.on('end', () => {
          try {
            const payload = JSON.parse(body)
            const registry = readRegistry()
            const file = registry.files.find((item) => item.id === payload.fileId)
            if (file === undefined || file.ext !== '.csv') throw new Error('csv fileId not found')
            mkdirSync(FILES_ROOT, { recursive: true })
            const stamp = new Date().toISOString().replace(/[:.]/g, '-')
            const versionPath = join(FILES_ROOT, `${file.name.replace(/\.csv$/i, '')}-${stamp}.csv`)
            writeFileSync(versionPath, payload.csvText ?? '', 'utf8')
            const version = { path: versionPath, sha256: sha256(versionPath), createdAt: new Date().toISOString(), reason: payload.reason ?? 'workspace edit', original: file.absolutePath }
            file.versions.push(version)
            file.updatedAt = version.createdAt
            writeRegistry(registry)
            response.setHeader('content-type', 'application/json')
            response.end(JSON.stringify({ ok: true, file, version }))
          } catch (error) {
            response.statusCode = 400
            response.end(JSON.stringify({ error: String(error) }))
          }
        })
      },
    },
  ]

  ctx.inject(['webServer'], (webCtx) => {
    for (const route of httpRoutes()) {
      webCtx.effect(() => webCtx.webServer.register(route))
    }
  })

  console.log('[kongchain-office-workspace] loaded')
  console.log('[kongchain-office-workspace] registered file registry/read/save/export tools')
}
