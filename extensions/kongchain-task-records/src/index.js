/**
 * KongChain task execution records and evidence traceability.
 *
 * This is a cross-reference layer over existing Harness session events and
 * tool-call records, not a second session database. Every record carries the
 * session id and tool call ids so a reviewer can walk back from conclusion to
 * data, calculation, tool run and status.
 *
 * @module @kongchain/task-records
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'
import {
  TASK_STATES,
  TASK_RECORD_SCHEMA,
  canTransition,
  deriveFinishStatus,
  redact,
  validateEvidence,
  verifyOutputs,
} from './record.mjs'

export const name = 'kongchain-task-records'
export const inject = ['tools']

const TASK_ROOT = 'F:/KongChain-logs/tasks'
const INDEX_FILE = join(TASK_ROOT, 'index.json')
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

function taskFile(taskId) {
  return join(TASK_ROOT, `${String(taskId).replace(/[^a-z0-9_-]/gi, '')}.jsonl`)
}

function appendEvent(taskId, event) {
  mkdirSync(TASK_ROOT, { recursive: true })
  appendFileSync(taskFile(taskId), `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`)
}

function readEvents(taskId) {
  const file = taskFile(taskId)
  if (!existsSync(file)) return []
  return readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
}

function foldRecord(taskId) {
  const events = readEvents(taskId)
  const record = { taskId, status: 'waiting', toolRuns: [], steps: [], evidence: [], outputs: [], approvals: [], incomplete: [], manualReview: [] }
  for (const event of events) {
    if (event.type === 'begin') Object.assign(record, event.record)
    if (event.type === 'tool') record.toolRuns.push(event.toolRun)
    if (event.type === 'step') record.steps.push(event.step)
    if (event.type === 'evidence') record.evidence.push(...event.items)
    if (event.type === 'output') record.outputs.push(...event.items)
    if (event.type === 'approval') record.approvals.push(event.approval)
    if (event.type === 'status') {
      record.status = event.status
      record.endedAt = event.endedAt ?? record.endedAt
    }
    if (event.type === 'finish') {
      record.status = event.status
      record.conclusion = event.conclusion
      record.incomplete = event.incomplete ?? []
      record.manualReview = event.manualReview ?? []
      record.endedAt = event.endedAt
    }
    if (event.type === 'cancel') {
      record.status = 'cancelled'
      record.endedAt = event.at
    }
  }
  return record
}

function updateIndex(taskId, status) {
  mkdirSync(TASK_ROOT, { recursive: true })
  const index = existsSync(INDEX_FILE) ? JSON.parse(readFileSync(INDEX_FILE, 'utf8')) : {}
  index[taskId] = { status, updatedAt: new Date().toISOString(), file: taskFile(taskId) }
  writeFileSync(INDEX_FILE, `${JSON.stringify(index, undefined, 2)}\n`)
}

function activeTaskId(sessionId, explicit) {
  return explicit ?? activeBySession.get(sessionId)
}

const activeBySession = new Map()
const runTask = new Map()

function recordToolCall(exec, result) {
  const sessionId = exec.agent?.session?.id
  const taskId = activeBySession.get(sessionId)
  if (taskId === undefined || String(exec.name).startsWith('kongchain_task_')) return
  const status = result?.isError ? 'failed' : 'completed'
  appendEvent(taskId, {
    type: 'tool',
    toolRun: {
      tool: exec.name,
      callId: exec.callId,
      status,
      arguments: redact(exec.arguments),
      resultPreview: redact(result?.isError ? (result.error?.message ?? result.message) : result?.value).slice(0, 1200),
    },
  })
}

export function apply(ctx) {
  ctx.on('tools/result', (exec, result) => {
    try {
      recordToolCall(exec, result)
    } catch {
      // Recording must never break the tool pipeline.
    }
  })

  ctx.on('subagent/start', (info) => {
    const sessionId = info.parent?.session?.id
    const taskId = activeBySession.get(sessionId)
    if (taskId !== undefined) appendEvent(taskId, { type: 'step', step: { name: 'subagent-start', status: 'running', expertChildId: info.id, label: info.label } })
  })

  ctx.on('subagent/end', (info) => {
    for (const [sessionId, taskId] of activeBySession) {
      appendEvent(taskId, { type: 'step', step: { name: 'subagent-end', status: info.stopReason === 'completed' ? 'completed' : 'failed', expertChildId: info.id, stopReason: info.stopReason } })
    }
  })

  ctx.tools.register(tool(
    'kongchain_task_schema',
    'Return the structured task record schema and evidence requirements.',
    { type: 'object', properties: {}, additionalProperties: false },
    async () => ({ schema: TASK_RECORD_SCHEMA, states: TASK_STATES, evidenceRequired: ['source', 'method', 'result', 'interpretation/classification'] }),
  ))

  ctx.tools.register(tool(
    'kongchain_task_begin',
    'Begin a structured task record tied to this session. Record goal and input files; future tool runs are captured automatically while this task is active.',
    {
      type: 'object',
      properties: {
        goal: { type: 'string' },
        inputFiles: { type: 'array', items: { type: 'string' } },
        expectedOutputs: { type: 'array', items: { type: 'string' } },
        requireTools: { type: 'boolean' },
      },
      required: ['goal'],
      additionalProperties: false,
    },
    async (args, exec) => {
      const sessionId = exec.agent?.session?.id
      if (sessionId === undefined) throw new Error('task records require a calling agent session')
      const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const inputs = (args.inputFiles ?? []).map((path) => ({ path, sha256: existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : null }))
      appendEvent(taskId, { type: 'begin', record: { taskId, sessionId, goal: args.goal, status: 'waiting', inputFiles: inputs, expectedOutputs: args.expectedOutputs ?? [], requireTools: args.requireTools !== false, startedAt: new Date().toISOString() } })
      activeBySession.set(sessionId, taskId)
      updateIndex(taskId, 'waiting')
      return { taskId, sessionId, status: 'waiting', schema: TASK_RECORD_SCHEMA }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_task_step',
    'Record one real task step/status/error. Use it for approvals, cancellations, expert phases, and human checkpoints; tool runs are captured automatically.',
    {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        name: { type: 'string' },
        status: { type: 'string', enum: TASK_STATES },
        detail: { type: 'string' },
        error: { type: 'string' },
        experts: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'status'],
      additionalProperties: false,
    },
    async (args, exec) => {
      const sessionId = exec.agent?.session?.id
      const taskId = activeTaskId(sessionId, args.taskId)
      if (taskId === undefined) throw new Error('no active task record')
      const record = foldRecord(taskId)
      const stepStatus = args.status
      const nextStatus = ['waiting', 'running', 'waiting_approval'].includes(stepStatus) ? stepStatus : record.status
      if (nextStatus !== record.status && !canTransition(record.status, nextStatus)) {
        throw new Error(`invalid task transition ${record.status} -> ${nextStatus}`)
      }
      if (['completed', 'partial', 'failed', 'cancelled'].includes(record.status)) {
        throw new Error(`task already ended as ${record.status}`)
      }
      appendEvent(taskId, { type: 'step', step: { name: args.name, status: stepStatus, detail: redact(args.detail), error: redact(args.error), experts: args.experts ?? [], callId: exec.callId } })
      if (nextStatus !== record.status) {
        appendEvent(taskId, { type: 'status', status: nextStatus })
        updateIndex(taskId, nextStatus)
      }
      return { ok: true, taskId, status: nextStatus, stepStatus }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_task_evidence',
    'Attach structured evidence to a task finding. Each item needs source, rule/calculation method, verifiable result and interpretation/classification; inference requires an assumption.',
    {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        evidence: { type: 'array', items: { type: 'object', additionalProperties: true } },
      },
      required: ['evidence'],
      additionalProperties: false,
    },
    async (args, exec) => {
      const sessionId = exec.agent?.session?.id
      const taskId = activeTaskId(sessionId, args.taskId)
      if (taskId === undefined) throw new Error('no active task record')
      const problems = validateEvidence(args.evidence)
      if (problems.length > 0) return { ok: false, problems }
      appendEvent(taskId, { type: 'evidence', items: args.evidence.map((item) => ({ ...item, note: redact(item.note) })) })
      return { ok: true, taskId, evidenceCount: args.evidence.length }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_task_output',
    'Record real output files with existence and SHA-256 verification. Missing outputs cannot be marked complete.',
    {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        outputs: { type: 'array', items: { type: 'object', additionalProperties: true } },
      },
      required: ['outputs'],
      additionalProperties: false,
    },
    async (args, exec) => {
      const sessionId = exec.agent?.session?.id
      const taskId = activeTaskId(sessionId, args.taskId)
      if (taskId === undefined) throw new Error('no active task record')
      const items = args.outputs.map((item) => {
        const path = typeof item === 'string' ? item : item.path
        const exists = existsSync(path)
        return { path, ok: exists, sha256: exists ? createHash('sha256').update(readFileSync(path)).digest('hex') : undefined, description: item.description }
      })
      appendEvent(taskId, { type: 'output', items })
      return { ok: items.every((item) => item.ok), taskId, outputs: items }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_task_approval',
    'Record a user approval, rejection or cancellation decision with reason.',
    {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        decision: { type: 'string', enum: ['approved', 'rejected', 'cancelled'] },
        reason: { type: 'string' },
      },
      required: ['decision', 'reason'],
      additionalProperties: false,
    },
    async (args, exec) => {
      const sessionId = exec.agent?.session?.id
      const taskId = activeTaskId(sessionId, args.taskId)
      if (taskId === undefined) throw new Error('no active task record')
      appendEvent(taskId, { type: 'approval', approval: { decision: args.decision, reason: redact(args.reason), callId: exec.callId, at: new Date().toISOString() } })
      if (args.decision === 'cancelled') {
        appendEvent(taskId, { type: 'cancel', reason: redact(args.reason) })
        activeBySession.delete(sessionId)
        updateIndex(taskId, 'cancelled')
      }
      return { ok: true, taskId, decision: args.decision }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_task_finish',
    'Finish a task with verified outputs and evidence. The record cannot claim completed when tools failed, outputs are missing, evidence is incomplete, or manual review items remain.',
    {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        requestedStatus: { type: 'string', enum: ['completed', 'partial', 'failed'] },
        conclusion: { type: 'string' },
        incomplete: { type: 'array', items: { type: 'string' } },
        manualReview: { type: 'array', items: { type: 'string' } },
        allowPartial: { type: 'boolean' },
      },
      required: ['requestedStatus', 'conclusion'],
      additionalProperties: false,
    },
    async (args, exec) => {
      const sessionId = exec.agent?.session?.id
      const taskId = activeTaskId(sessionId, args.taskId)
      if (taskId === undefined) throw new Error('no active task record')
      const record = foldRecord(taskId)
      const outputVerification = record.outputs
      const verdict = deriveFinishStatus({ requested: args.requestedStatus, toolRuns: record.toolRuns, outputs: { verification: outputVerification }, evidence: record.evidence, incomplete: args.incomplete ?? [], manualReview: args.manualReview ?? [], allowPartial: args.allowPartial === true })
      appendEvent(taskId, {
        type: 'finish',
        status: verdict.status,
        conclusion: redact(args.conclusion),
        incomplete: args.incomplete ?? [],
        manualReview: args.manualReview ?? [],
        reasons: verdict.reasons,
        endedAt: new Date().toISOString(),
      })
      activeBySession.delete(sessionId)
      updateIndex(taskId, verdict.status)
      return { ok: true, taskId, status: verdict.status, reasons: verdict.reasons, record: foldRecord(taskId) }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_task_cancel',
    'Cancel a task with a reason; the terminal state remains visible and is never shown as complete.',
    {
      type: 'object',
      properties: { taskId: { type: 'string' }, reason: { type: 'string' } },
      required: ['reason'],
      additionalProperties: false,
    },
    async (args, exec) => {
      const sessionId = exec.agent?.session?.id
      const taskId = activeTaskId(sessionId, args.taskId)
      if (taskId === undefined) throw new Error('no active task record')
      appendEvent(taskId, { type: 'cancel', reason: redact(args.reason) })
      activeBySession.delete(sessionId)
      updateIndex(taskId, 'cancelled')
      return { ok: true, taskId, status: 'cancelled' }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_task_query',
    'Read one task record or the task index. Returns structured events, status and evidence/output verification.',
    {
      type: 'object',
      properties: { taskId: { type: 'string' }, sessionId: { type: 'string' } },
      additionalProperties: false,
    },
    async (args, exec) => {
      const sessionId = args.sessionId ?? exec.agent?.session?.id
      const taskId = args.taskId ?? activeBySession.get(sessionId)
      if (taskId === undefined) {
        const index = existsSync(INDEX_FILE) ? JSON.parse(readFileSync(INDEX_FILE, 'utf8')) : {}
        return { index }
      }
      return { record: foldRecord(taskId), events: readEvents(taskId) }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_task_export',
    'Export a redacted, reviewable task record as JSON or Markdown.',
    {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        format: { type: 'string', enum: ['json', 'md'] },
        outputPath: { type: 'string' },
      },
      required: ['taskId', 'format', 'outputPath'],
      additionalProperties: false,
    },
    async (args) => {
      const record = foldRecord(args.taskId)
      mkdirSync(TASK_ROOT, { recursive: true })
      const content = args.format === 'md'
        ? `# 任务记录 ${record.taskId}\n\n状态：${record.status}\n\n目标：${record.goal}\n\n结论：${record.conclusion ?? ''}\n\n## 工具运行\n${record.toolRuns.map((run) => `- ${run.tool} ${run.status} ${run.callId ?? ''}`).join('\n')}\n\n## 证据\n${record.evidence.map((item) => `- ${item.source} / ${item.method} / ${item.result}`).join('\n')}\n`
        : JSON.stringify(record, undefined, 2)
      writeFileSync(args.outputPath, redact(content))
      return { ok: true, taskId: args.taskId, outputPath: args.outputPath }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_task_clean',
    'Redact secrets in one task record or delete an explicitly named record. Never cleans unrelated sessions or files.',
    {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        mode: { type: 'string', enum: ['redact', 'delete'] },
      },
      required: ['taskId', 'mode'],
      additionalProperties: false,
    },
    async (args) => {
      const file = taskFile(args.taskId)
      if (!existsSync(file)) return { ok: false, error: 'record not found' }
      if (args.mode === 'delete') {
        writeFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), type: 'clean', mode: 'deleted' })}\n`)
        return { ok: true, taskId: args.taskId, mode: 'deleted' }
      }
      const redacted = readEvents(args.taskId).map((event) => JSON.parse(redact(event)))
      writeFileSync(file, `${redacted.map((event) => JSON.stringify(event)).join('\n')}\n`)
      return { ok: true, taskId: args.taskId, mode: 'redacted' }
    },
  ))

  console.log('[kongchain-task-records] loaded')
  console.log('[kongchain-task-records] registered schema/begin/step/evidence/output/approval/finish/cancel/query/export/clean tools')
}
