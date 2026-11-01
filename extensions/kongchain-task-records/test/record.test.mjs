import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TASK_STATES,
  canTransition,
  deriveFinishStatus,
  redact,
  validateEvidence,
  verifyOutputs,
} from '../src/record.mjs'

test('task states are canonical and transitions reject terminal rollback', () => {
  assert.deepEqual(TASK_STATES, ['waiting', 'running', 'waiting_approval', 'completed', 'partial', 'failed', 'cancelled'])
  assert.equal(canTransition('waiting', 'running'), true)
  assert.equal(canTransition('running', 'waiting_approval'), true)
  assert.equal(canTransition('completed', 'running'), false)
  assert.equal(canTransition('failed', 'completed'), false)
})

test('redaction removes secrets without removing ordinary evidence', () => {
  const text = redact('DEEPSEEK_API_KEY=sk-secret123456789 and Bearer abcdefghijklmnop and result=ok')
  assert.equal(text.includes('sk-secret123456789'), false)
  assert.equal(text.includes('abcdefghijklmnop'), false)
  assert.equal(text.includes('result=ok'), true)
})

test('evidence requires source method result and classification', () => {
  const problems = validateEvidence([{ source: 'x', method: 'Decimal sum', result: '1', classification: 'fact' }])
  assert.deepEqual(problems, [])
  const bad = validateEvidence([{ source: '', method: '', result: '', classification: 'inference' }])
  assert.equal(bad.length >= 3, true)
  assert.equal(bad.includes('inference evidence must state an assumption'), true)
})

test('missing outputs and failed tools force partial/failed status', () => {
  const outputs = verifyOutputs(['missing-output.xlsx'], (path) => path === 'exists.xlsx', () => 'hash')
  assert.equal(outputs[0].ok, false)
  const verdict = deriveFinishStatus({
    requested: 'completed',
    toolRuns: [{ status: 'failed' }],
    outputs: { verification: outputs },
    evidence: [{ source: 'x', method: 'm', result: 'r', classification: 'fact' }],
  })
  assert.equal(verdict.status, 'partial')
  assert.equal(verdict.reasons.length > 0, true)
})

test('completed is only allowed with verified outputs, evidence and no manual remainder', () => {
  const verdict = deriveFinishStatus({
    requested: 'completed',
    toolRuns: [{ status: 'completed' }],
    outputs: { verification: [{ path: 'out.xlsx', ok: true, sha256: 'abc' }] },
    evidence: [{ source: 'x', method: 'm', result: 'r', classification: 'fact' }],
  })
  assert.equal(verdict.status, 'completed')
  const partial = deriveFinishStatus({
    requested: 'completed',
    toolRuns: [{ status: 'completed' }],
    outputs: { verification: [{ path: 'out.xlsx', ok: true, sha256: 'abc' }] },
    evidence: [{ source: 'x', method: 'm', result: 'r', classification: 'fact' }],
    manualReview: ['人工复核原始凭证'],
  })
  assert.equal(partial.status, 'partial')
})
