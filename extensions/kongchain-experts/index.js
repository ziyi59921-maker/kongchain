/**
 * KongChain finance expert catalog and dispatch over the existing Harness
 * subagent runtime. No parallel Agent Loop is created here: dispatch starts a
 * real managed subagent through `ctx.subagents` and returns its child id.
 *
 * @module @kongchain/experts
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { EXPERTS, STRUCTURED_HANDOFF, buildDispatchPrompt, planExperts } from './src/catalog.mjs'

export const name = 'kongchain-experts'
export const inject = ['tools', 'subagents']

const STATUS_ROOT = 'F:/KongChain-logs/experts'
const STATUS_FILE = join(STATUS_ROOT, 'status.json')
const EVENTS_FILE = join(STATUS_ROOT, 'events.jsonl')

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

function readStatus() {
  try {
    return JSON.parse(readFileSync(STATUS_FILE, 'utf8'))
  } catch {
    return { experts: {}, recent: [] }
  }
}

function writeStatus(status) {
  mkdirSync(STATUS_ROOT, { recursive: true })
  writeFileSync(STATUS_FILE, `${JSON.stringify(status, undefined, 2)}\n`)
}

function logEvent(event) {
  mkdirSync(STATUS_ROOT, { recursive: true })
  appendFileSync(EVENTS_FILE, `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`)
}

function outputText(message) {
  return (message ?? []).map((block) => block?.text ?? '').join('\n')
}

export function apply(ctx) {
  const runs = new Map()

  ctx.on('subagent/start', (info) => {
    const record = runs.get(info.id) ?? runs.get(info.runId)
    if (record !== undefined) {
      const status = readStatus()
      status.experts[record.expertId] = {
        ...(status.experts[record.expertId] ?? {}),
        state: 'running',
        childId: info.id,
        runId: info.runId,
        label: record.label,
        startedAt: new Date().toISOString(),
      }
      writeStatus(status)
      logEvent({ event: 'expert-start', expertId: record.expertId, runId: info.runId, childId: info.id, label: record.label })
    }
  })

  ctx.on('subagent/end', (info) => {
    const record = runs.get(info.id) ?? runs.get(info.runId)
    const status = readStatus()
    const expertId = record?.expertId ?? 'unknown'
    status.experts[expertId] = {
      ...(status.experts[expertId] ?? {}),
      state: info.stopReason === 'completed' ? 'completed' : `failed:${info.stopReason}`,
      stopReason: info.stopReason,
      endedAt: new Date().toISOString(),
      outputPreview: outputText(info.lastAssistantMessage).slice(-1000),
    }
    status.recent = [
      { at: new Date().toISOString(), expertId, runId: info.runId, stopReason: info.stopReason, label: record?.label },
      ...(status.recent ?? []),
    ].slice(0, 20)
    writeStatus(status)
    logEvent({ event: 'expert-end', expertId, runId: info.runId, stopReason: info.stopReason, outputPreview: status.experts[expertId].outputPreview })
  })

  ctx.tools.register(tool(
    'kongchain_expert_catalog',
    'List the six reusable finance experts: responsibilities, real tools, skills, input/output contract, applicable scenarios, and current dispatch status. Use before dispatching; simple tasks should stay with the main Agent.',
    { type: 'object', properties: {}, additionalProperties: false },
    async () => {
      const status = readStatus()
      return {
        experts: EXPERTS.map((expert) => ({
          ...expert,
          status: status.experts?.[expert.id] ?? { state: 'idle', note: 'not called; do not show as collaborating' },
        })),
        policy: {
          simpleTasks: 'main Agent executes directly',
          complexTasks: 'dispatch only the experts that add independent value',
          review: 'independent review must use different data checks/calculations, not duplicate prompts',
          failures: 'failed/disputed results remain visible and are never averaged away',
        },
      }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_expert_plan',
    'Plan expert participation for one natural-language task. Returns direct/single/parallel/review mode, recommended expert ids, rationale, and the structured handoff schema. The main Agent makes the final choice.',
    {
      type: 'object',
      properties: { task: { type: 'string' } },
      required: ['task'],
      additionalProperties: false,
    },
    async (args) => ({ ...planExperts(args.task), catalog: EXPERTS.map(({ id, name, role }) => ({ id, name, role })) }),
  ))

  ctx.tools.register(tool(
    'kongchain_expert_dispatch',
    'Dispatch one finance expert as a real Harness subagent with its Agent Preset, tools and skills. Returns the child id immediately; completion is delivered by the subagent runtime. Use multiple calls in one message for parallel work. The final child output is structured handoff JSON.',
    {
      type: 'object',
      properties: {
        expertId: { type: 'string' },
        description: { type: 'string' },
        task: { type: 'string' },
        handoff: { type: 'object', additionalProperties: true },
        reviewOf: { type: 'object', additionalProperties: true },
        mode: { type: 'string', enum: ['single', 'parallel', 'review'] },
      },
      required: ['expertId', 'description', 'task'],
      additionalProperties: false,
    },
    async (args, exec) => {
      const expert = EXPERTS.find((item) => item.id === args.expertId)
      if (expert === undefined) throw new Error(`unknown expert: ${args.expertId}`)
      const parent = exec.agent
      if (parent === undefined) throw new Error('expert dispatch requires a calling agent')
      const provider = ctx.subagents.getProvider('spawn')
      if (provider === undefined) throw new Error('subagent provider "spawn" is not available')
      const prompt = buildDispatchPrompt(expert, args.task, args.handoff, args.reviewOf)
      const request = {
        prompt: [{ type: 'text', text: prompt }],
        parent,
        agentPreset: expert.presetId,
        maxDepth: 1,
        ...(provider.capabilities.outputSchema ? { outputSchema: STRUCTURED_HANDOFF } : {}),
      }
      const started = await ctx.subagents.startActivation({
        provider: 'spawn',
        label: `${expert.id} | ${args.description}`,
        request,
        signal: exec.signal,
        delivery: 'parent',
      })
      runs.set(started.childId, { expertId: expert.id, label: args.description })
      const status = readStatus()
      status.experts[expert.id] = {
        ...(status.experts[expert.id] ?? {}),
        state: 'dispatched',
        childId: started.childId,
        label: args.description,
        dispatchedAt: new Date().toISOString(),
        mode: args.mode ?? 'single',
      }
      writeStatus(status)
      logEvent({ event: 'expert-dispatch', expertId: expert.id, childId: started.childId, label: args.description, mode: args.mode ?? 'single' })
      return { kind: 'activation', subagentId: started.childId, expertId: expert.id, mode: args.mode ?? 'single', note: 'result is delivered by the Harness subagent runtime; no fake completion is shown' }
    },
  ))

  ctx.tools.register(tool(
    'kongchain_expert_status',
    'Read real expert dispatch status and recent lifecycle events. Idle experts are never presented as collaborating.',
    { type: 'object', properties: {}, additionalProperties: false },
    async () => ({ ...readStatus(), eventsFile: EVENTS_FILE }),
  ))

  ctx.tools.register(tool(
    'kongchain_expert_log',
    'Append a structured expert coordination event (plan, handoff, review request, disagreement, failure).',
    {
      type: 'object',
      properties: {
        event: { type: 'string' },
        expertId: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
      required: ['event'],
      additionalProperties: false,
    },
    async (args) => {
      logEvent({ event: args.event, expertId: args.expertId ?? 'main', ...(args.data ?? {}) })
      return { ok: true, eventsFile: EVENTS_FILE }
    },
  ))

  console.log('[kongchain-experts] loaded')
  console.log('[kongchain-experts] registered catalog/plan/dispatch/status/log tools')
}
