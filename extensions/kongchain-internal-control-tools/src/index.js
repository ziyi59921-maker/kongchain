/**
 * KongChain internal-control tools.
 *
 * Five independent tools share one deterministic Python helper. Each tool can
 * be called alone; nothing here chains them into a fixed workflow. Paths are
 * restricted to the repository and the authorized sample workspace.
 *
 * @module @kongchain/internal-control-tools
 */
import { spawnSync } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'

export const name = 'kongchain-internal-control-tools'
export const inject = ['tools']

const EXTENSIONS_ROOT = resolve(import.meta.dirname, '..', '..')
const REPO_ROOT = resolve(EXTENSIONS_ROOT, '..')
const HELPER = resolve(import.meta.dirname, '..', 'python', 'tools.py')
const FINANCE_HELPER = resolve(import.meta.dirname, '..', 'python', 'finance_tools.py')
const SAMPLES_ROOT = 'F:/KongChain-logs/samples'
const ALLOWED_ROOTS = [REPO_ROOT, SAMPLES_ROOT]

function inside(path, root) {
  const rel = relative(root, path)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

function real(path) {
  try {
    return realpathSync(path)
  } catch {
    return resolve(path)
  }
}

function authorized(input) {
  const path = real(resolve(String(input)))
  return ALLOWED_ROOTS.some((root) => inside(path, real(root)))
}

function outputAuthorized(input) {
  const path = real(resolve(String(input)))
  return inside(path, real(SAMPLES_ROOT))
}

function runHelper(action, args, helper = HELPER) {
  const candidates = [[process.env.KONGCHAIN_PYTHON ?? 'python', []], ['py', ['-3']]]
  let last
  for (const [command, prefix] of candidates) {
    const result = spawnSync(command, [...prefix, helper, action], {
      input: JSON.stringify(args),
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    })
    if (result.error?.code === 'ENOENT') {
      last = result
      continue
    }
    const stdout = String(result.stdout ?? '').trim()
    const stderr = String(result.stderr ?? '').trim()
    if (stdout === '') throw new Error(`helper ${action} returned no output${stderr === '' ? '' : `: ${stderr}`}`)
    try {
      return JSON.parse(stdout)
    } catch {
      throw new Error(`helper ${action} returned non-JSON output: ${stdout.slice(0, 500)}`)
    }
  }
  throw new Error(`cannot start Python (${last?.error?.message ?? 'not found'})`)
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

function requireSource(path) {
  if (!authorized(path)) throw new Error(`path outside authorized workspace: ${path}`)
  if (!existsSync(real(resolve(String(path))))) throw new Error(`file not found: ${path}`)
}

export function apply(ctx) {
  ctx.tools.register(tool(
    'kongchain_document_extract',
    'Extract text and tables from one authorized PDF, DOCX, XLSX, CSV, or text file. Returns source metadata (path/size/SHA-256), page/sheet/row locators, and explicit parsing limitations. Text-layer only; no OCR.',
    {
      type: 'object',
      properties: {
        path: { type: 'string' },
        includeTables: { type: 'boolean' },
        maxChars: { type: 'number' },
      },
      required: ['path'],
      additionalProperties: false,
    },
    async (args) => {
      requireSource(args.path)
      return runHelper('extract', { path: args.path, includeTables: args.includeTables !== false, maxChars: args.maxChars ?? 20000 })
    },
  ))

  ctx.tools.register(tool(
    'kongchain_financial_compare',
    'Compare two authorized tables (XLSX/CSV) by configured key and amount columns. Returns differences, duplicates, data quality issues, totals, Decimal recomputation parameters, and limitations. Independent; does not run rules or generate reports.',
    {
      type: 'object',
      properties: {
        left: { type: 'string' },
        right: { type: 'string' },
        keyColumns: { type: 'array', items: { type: 'string' } },
        amountColumns: { type: 'array', items: { type: 'string' } },
        tolerance: { type: 'string' },
        leftSheet: { type: 'string' },
        rightSheet: { type: 'string' },
      },
      required: ['left', 'right'],
      additionalProperties: false,
    },
    async (args) => {
      requireSource(args.left)
      requireSource(args.right)
      return runHelper('compare', args)
    },
  ))

  ctx.tools.register(tool(
    'kongchain_rule_check',
    'Manage or execute configurable deterministic internal-control rules. Actions: list, save, disable, check. Save/disable write the rules file; check executes enabled rules against an authorized table and returns rule version, parameters, evidence rows, and limitations.',
    {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'save', 'disable', 'check'] },
        rulesPath: { type: 'string' },
        dataPath: { type: 'string' },
        rule: { type: 'object', additionalProperties: true },
        ruleId: { type: 'string' },
        sheet: { type: 'string' },
      },
      required: ['action'],
      additionalProperties: false,
    },
    async (args) => {
      const rulesPath = args.rulesPath ?? `${SAMPLES_ROOT}/rules.json`
      if (!authorized(rulesPath)) throw new Error(`rules path outside authorized workspace: ${rulesPath}`)
      if (args.action === 'check') requireSource(args.dataPath)
      return runHelper('rules', { ...args, rulesPath })
    },
  ))

  ctx.tools.register(tool(
    'kongchain_evidence_pack',
    'Build a traceable evidence pack from authorized source files and findings. Preserves raw fields, source metadata (SHA-256), locators, and separates fact/calculation/inference/toVerify. Refuses when no source is supplied.',
    {
      type: 'object',
      properties: {
        sources: { type: 'array', items: { type: 'string' } },
        findings: { type: 'array', items: { type: 'object', additionalProperties: true } },
        outputPath: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['sources', 'outputPath'],
      additionalProperties: false,
    },
    async (args) => {
      if (!Array.isArray(args.sources) || args.sources.length === 0) throw new Error('at least one source is required')
      args.sources.forEach(requireSource)
      if (!outputAuthorized(args.outputPath)) throw new Error(`output must be under ${SAMPLES_ROOT}: ${args.outputPath}`)
      return runHelper('evidence', args)
    },
  ))

  ctx.tools.register(tool(
    'kongchain_report_generate',
    'Generate a Word (.docx) or Excel (.xlsx) working paper from actual source files and findings. Cites source paths and SHA-256; refuses to generate when no source data is supplied. Independent of extraction/comparison tools.',
    {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['docx', 'xlsx'] },
        title: { type: 'string' },
        sources: { type: 'array', items: { type: 'string' } },
        sections: { type: 'array', items: { type: 'object', additionalProperties: true } },
        findings: { type: 'array', items: { type: 'object', additionalProperties: true } },
        outputPath: { type: 'string' },
      },
      required: ['format', 'sources', 'outputPath'],
      additionalProperties: false,
    },
    async (args) => {
      if (!Array.isArray(args.sources) || args.sources.length === 0) throw new Error('sources are required; refusing to fabricate a report')
      args.sources.forEach(requireSource)
      if (!outputAuthorized(args.outputPath)) throw new Error(`output must be under ${SAMPLES_ROOT}: ${args.outputPath}`)
      return runHelper('report', args)
    },
  ))

  ctx.tools.register(tool(
    'kongchain_finance_profile',
    'Read and profile one authorized XLSX/CSV financial table: field kinds, cleaning/missing counts, duplicate keys, Decimal totals, grouped statistics, anomaly leads, and optional result workbook. Never overwrites the source file.',
    {
      type: 'object',
      properties: {
        path: { type: 'string' },
        sheet: { type: 'string' },
        groupBy: { type: 'string' },
        amountColumns: { type: 'array', items: { type: 'string' } },
        dedupeKeys: { type: 'array', items: { type: 'string' } },
        outputPath: { type: 'string' },
        writeOutput: { type: 'boolean' },
      },
      required: ['path'],
      additionalProperties: false,
    },
    async (args) => {
      requireSource(args.path)
      if (args.outputPath && !outputAuthorized(args.outputPath)) throw new Error(`output must be under ${SAMPLES_ROOT}: ${args.outputPath}`)
      return runHelper('profile', args, FINANCE_HELPER)
    },
  ))

  ctx.tools.register(tool(
    'kongchain_voucher_reconcile',
    'Reconcile structured voucher data against an invoice list and optional attachment index. Checks required fields, key/amount reconciliation, orphan or missing attachments, and low-confidence scans. Returns classified findings and limitations.',
    {
      type: 'object',
      properties: {
        voucherPath: { type: 'string' },
        invoicePath: { type: 'string' },
        attachmentPath: { type: 'string' },
        keyColumns: { type: 'array', items: { type: 'string' } },
        amountColumn: { type: 'string' },
        requiredFields: { type: 'array', items: { type: 'string' } },
        voucherSheet: { type: 'string' },
        invoiceSheet: { type: 'string' },
        attachmentSheet: { type: 'string' },
        outputPath: { type: 'string' },
      },
      required: ['voucherPath', 'invoicePath'],
      additionalProperties: false,
    },
    async (args) => {
      requireSource(args.voucherPath)
      requireSource(args.invoicePath)
      if (args.attachmentPath) requireSource(args.attachmentPath)
      if (args.outputPath && !outputAuthorized(args.outputPath)) throw new Error(`output must be under ${SAMPLES_ROOT}: ${args.outputPath}`)
      return runHelper('voucher', args, FINANCE_HELPER)
    },
  ))

  ctx.tools.register(tool(
    'kongchain_finance_analyze',
    'Compute period comparison, budget execution, cost structure, simple ratios, and variance/anomaly leads from authorized tables. All numbers use Decimal and expose parameters/assumptions; no accounting conclusion is invented.',
    {
      type: 'object',
      properties: {
        currentPath: { type: 'string' },
        previousPath: { type: 'string' },
        budgetPath: { type: 'string' },
        categoryColumn: { type: 'string' },
        amountColumn: { type: 'string' },
        varianceThreshold: { type: 'string' },
        currentSheet: { type: 'string' },
        previousSheet: { type: 'string' },
        budgetSheet: { type: 'string' },
        outputPath: { type: 'string' },
      },
      required: ['currentPath'],
      additionalProperties: false,
    },
    async (args) => {
      requireSource(args.currentPath)
      if (args.previousPath) requireSource(args.previousPath)
      if (args.budgetPath) requireSource(args.budgetPath)
      if (args.outputPath && !outputAuthorized(args.outputPath)) throw new Error(`output must be under ${SAMPLES_ROOT}: ${args.outputPath}`)
      return runHelper('analyze', args, FINANCE_HELPER)
    },
  ))

  ctx.tools.register(tool(
    'kongchain_audit_workpaper',
    'Build a traceable audit/internal-control workpaper framework from real sources and findings: risk points, control objectives, test procedures, anomalies, remediation, and fact/calculation/inference/toVerify/recommendation classification.',
    {
      type: 'object',
      properties: {
        title: { type: 'string' },
        scope: { type: 'string' },
        sources: { type: 'array', items: { type: 'string' } },
        findings: { type: 'array', items: { type: 'object', additionalProperties: true } },
        riskPoints: { type: 'array', items: { type: 'object', additionalProperties: true } },
        controlObjectives: { type: 'array', items: { type: 'object', additionalProperties: true } },
        testProcedures: { type: 'array', items: { type: 'object', additionalProperties: true } },
        remediation: { type: 'array', items: { type: 'object', additionalProperties: true } },
        outputPath: { type: 'string' },
      },
      required: ['sources'],
      additionalProperties: false,
    },
    async (args) => {
      args.sources.forEach(requireSource)
      if (args.outputPath && !outputAuthorized(args.outputPath)) throw new Error(`output must be under ${SAMPLES_ROOT}: ${args.outputPath}`)
      return runHelper('workpaper', args, FINANCE_HELPER)
    },
  ))

  ctx.tools.register(tool(
    'kongchain_finance_deliver',
    'Generate a real XLSX/DOCX/CSV/PDF financial deliverable with data scope, methodology, results, issues, limitations, and review suggestions. Requires source files and refuses to fabricate unsupported content.',
    {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['xlsx', 'docx', 'csv', 'pdf'] },
        title: { type: 'string' },
        scope: { type: 'string' },
        methodology: { type: 'string' },
        results: { type: 'array', items: { type: 'object', additionalProperties: true } },
        issues: { type: 'array', items: { type: 'object', additionalProperties: true } },
        limitations: { type: 'array', items: { type: 'string' } },
        review: { type: 'array', items: { type: 'string' } },
        sources: { type: 'array', items: { type: 'string' } },
        outputPath: { type: 'string' },
      },
      required: ['format', 'sources', 'outputPath'],
      additionalProperties: false,
    },
    async (args) => {
      args.sources.forEach(requireSource)
      if (!outputAuthorized(args.outputPath)) throw new Error(`output must be under ${SAMPLES_ROOT}: ${args.outputPath}`)
      return runHelper('deliver', args, FINANCE_HELPER)
    },
  ))

  console.log('[kongchain-internal-control-tools] loaded')
  console.log('[kongchain-internal-control-tools] registered document/compare/rules/evidence/report + finance profile/voucher/analyze/workpaper/deliver tools')
}
