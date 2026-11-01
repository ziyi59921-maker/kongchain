import test from 'node:test'
import assert from 'node:assert/strict'
import { EXPERTS, STRUCTURED_HANDOFF, buildDispatchPrompt, planExperts } from '../src/catalog.mjs'

test('catalog has six real experts with tools, skills and IO contracts', () => {
  assert.equal(EXPERTS.length, 6)
  for (const expert of EXPERTS) {
    assert.ok(expert.id && expert.presetId)
    assert.ok(expert.tools.length > 0)
    assert.ok(expert.skills.length > 0)
    assert.ok(expert.input && expert.output)
  }
  assert.equal(STRUCTURED_HANDOFF.required.includes('disagreements'), true)
})

test('simple table aggregation stays with the main Agent', () => {
  const plan = planExperts('请汇总这个表格的金额合计并统计行数')
  assert.equal(plan.mode, 'direct')
  assert.deepEqual(plan.experts, [])
})

test('procurement internal-control task plans accounting, audit and report experts', () => {
  const plan = planExperts('采购付款内控分析，核对凭证发票并形成审计底稿')
  assert.equal(plan.mode, 'parallel')
  assert.ok(plan.experts.includes('expert-accounting'))
  assert.ok(plan.experts.includes('expert-audit-internal'))
  assert.ok(plan.experts.includes('expert-report-workpaper'))
})

test('tax policy task selects the tax expert and review adds independent audit review', () => {
  const plan = planExperts('研究增值税优惠政策适用条件和有效期，并请独立复核')
  assert.equal(plan.mode, 'review')
  assert.ok(plan.experts.includes('expert-tax-policy'))
  assert.ok(plan.experts.includes('expert-audit-internal'))
})

test('dispatch prompt carries structured handoff and review discipline', () => {
  const expert = EXPERTS.find((item) => item.id === 'expert-report-workpaper')
  const prompt = buildDispatchPrompt(expert, '整合结果', { conclusion: 'x' }, { conclusion: 'y' })
  assert.match(prompt, /结构化/)
  assert.match(prompt, /独立复核/)
  assert.match(prompt, /disagreements/)
})
