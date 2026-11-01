/**
 * Structured task record primitives: state machine, evidence validation,
 * redaction, and append-only JSONL event records. Pure functions are tested
 * separately; the host plugin supplies tool execution and Harness event hooks.
 */

export const TASK_STATES = ['waiting', 'running', 'waiting_approval', 'completed', 'partial', 'failed', 'cancelled']

export const TASK_RECORD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    taskId: { type: 'string' },
    sessionId: { type: 'string' },
    goal: { type: 'string' },
    status: { type: 'string', enum: TASK_STATES },
    inputFiles: { type: 'array', items: { type: 'object', additionalProperties: true } },
    toolRuns: { type: 'array', items: { type: 'object', additionalProperties: true } },
    steps: { type: 'array', items: { type: 'object', additionalProperties: true } },
    evidence: { type: 'array', items: { type: 'object', additionalProperties: true } },
    outputs: { type: 'array', items: { type: 'object', additionalProperties: true } },
    approvals: { type: 'array', items: { type: 'object', additionalProperties: true } },
    conclusion: { type: 'string' },
    incomplete: { type: 'array', items: { type: 'string' } },
    manualReview: { type: 'array', items: { type: 'string' } },
    startedAt: { type: 'string' },
    endedAt: { type: 'string' },
  },
  required: ['taskId', 'sessionId', 'goal', 'status'],
}

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{12,}/g,
  /Bearer\s+[A-Za-z0-9._~+/-]{12,}/gi,
  /([A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*)\s*[:=]\s*["']?[^"'\s,;]+["']?/gi,
  /token=[A-Za-z0-9._~+/-]{8,}/gi,
]

export function redact(value) {
  let text = typeof value === 'string' ? value : JSON.stringify(value ?? '')
  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, '[REDACTED]')
  return text
}

export function canTransition(from, to) {
  const terminal = new Set(['completed', 'partial', 'failed', 'cancelled'])
  if (from === to) return true
  if (terminal.has(from)) return false
  if (from === 'waiting') return ['running', 'waiting_approval', 'cancelled', 'failed'].includes(to)
  if (from === 'running') return ['waiting_approval', 'completed', 'partial', 'failed', 'cancelled'].includes(to)
  if (from === 'waiting_approval') return ['running', 'completed', 'partial', 'failed', 'cancelled'].includes(to)
  return false
}

export function validateEvidence(evidence) {
  const problems = []
  for (const item of evidence ?? []) {
    if (!item || typeof item !== 'object') {
      problems.push('evidence item is not an object')
      continue
    }
    if (!item.source) problems.push('evidence missing source')
    if (!item.method) problems.push('evidence missing rule/calculation method')
    if (!item.result) problems.push('evidence missing verifiable result')
    if (!item.interpretation && !item.classification) problems.push('evidence missing interpretation/classification')
    if (item.classification === 'inference' && !item.assumption) problems.push('inference evidence must state an assumption')
  }
  return problems
}

export function verifyOutputs(outputs, exists, hash) {
  const results = []
  for (const output of outputs ?? []) {
    const path = typeof output === 'string' ? output : output?.path
    if (!path) {
      results.push({ path: null, ok: false, reason: 'output path missing' })
      continue
    }
    const ok = exists(path)
    results.push({ path, ok, sha256: ok ? hash(path) : undefined, reason: ok ? undefined : 'output file missing' })
  }
  return results
}

export function deriveFinishStatus({ requested, toolRuns, outputs, evidence, incomplete = [], manualReview = [], allowPartial = false }) {
  const failures = (toolRuns ?? []).filter((run) => run.status === 'failed')
  const outputResults = outputs?.verification ?? []
  const missingOutputs = outputResults.filter((item) => !item.ok)
  const evidenceProblems = validateEvidence(evidence)
  const reasons = []
  if (failures.length > 0) reasons.push(`${failures.length} tool run(s) failed`)
  if (missingOutputs.length > 0) reasons.push(`${missingOutputs.length} output file(s) missing`)
  if (evidenceProblems.length > 0) reasons.push(`${evidenceProblems.length} evidence problem(s)`)
  if (requested === 'completed') {
    if (failures.length > 0) return { status: 'partial', reasons, allowPartial }
    if (missingOutputs.length > 0) return { status: 'partial', reasons, allowPartial }
    if (evidenceProblems.length > 0) return { status: 'partial', reasons, allowPartial }
    if (incomplete.length > 0 || manualReview.length > 0) return { status: 'partial', reasons: [...reasons, 'incomplete/manual review items remain'], allowPartial }
    return { status: 'completed', reasons, allowPartial }
  }
  if (requested === 'partial' && allowPartial) return { status: 'partial', reasons, allowPartial }
  return { status: requested === 'failed' ? 'failed' : 'partial', reasons, allowPartial }
}
