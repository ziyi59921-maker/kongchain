/**
 * Reusable finance expert definitions and deterministic dispatch planning.
 * The data is shared by the host tools and kept intentionally explicit:
 * each expert names its real tools, skills, input/output contract and scope.
 */

export const STRUCTURED_HANDOFF = {
  type: 'object',
  additionalProperties: false,
  properties: {
    conclusion: { type: 'string' },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          source: { type: 'string' },
          locator: { type: 'string' },
          claim: { type: 'string' },
        },
        required: ['source', 'locator', 'claim'],
      },
    },
    calculation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        fields: { type: 'array', items: { type: 'string' } },
        methodology: { type: 'string' },
        assumptions: { type: 'array', items: { type: 'string' } },
      },
      required: ['fields', 'methodology', 'assumptions'],
    },
    unknowns: { type: 'array', items: { type: 'string' } },
    nextSteps: { type: 'array', items: { type: 'string' } },
    disagreements: { type: 'array', items: { type: 'string' } },
  },
  required: ['conclusion', 'evidence', 'calculation', 'unknowns', 'nextSteps', 'disagreements'],
}

const BASE_TOOLS = [
  'read/glob/grep',
  'pwsh（受限命令）',
  'kongchain_document_extract',
  'kongchain_finance_profile',
  'kongchain_finance_analyze',
  'kongchain_voucher_reconcile',
  'kongchain_audit_workpaper',
  'kongchain_finance_deliver',
]

export const EXPERTS = [
  {
    id: 'expert-finance-analysis',
    presetId: 'expert-finance-analysis',
    name: '财务分析专家',
    role: '财务指标、预算执行、成本费用结构、异常波动',
    responsibilities: ['期间对比与趋势', '预算执行与差异', '成本费用结构', '财务比率与异常波动'],
    tools: [...BASE_TOOLS],
    skills: ['financial-data-analysis', 'kongchain-finance-tools'],
    input: '期间表、预算表、科目/部门字段、金额字段、分析阈值',
    output: STRUCTURED_HANDOFF,
    scenarios: ['期间分析', '预算执行', '成本结构', '异常波动'],
  },
  {
    id: 'expert-accounting',
    presetId: 'expert-accounting',
    name: '会计核算专家',
    role: '会计凭证、附件、科目辅助检查和账表勾稽',
    responsibilities: ['凭证必填项与字段核查', '发票/凭证金额勾稽', '附件完整性与索引', '科目/账表辅助核对'],
    tools: [...BASE_TOOLS, 'kongchain_rule_check'],
    skills: ['accounting-document-review', 'kongchain-finance-tools'],
    input: '凭证表、发票清单、附件索引、科目/账表数据',
    output: STRUCTURED_HANDOFF,
    scenarios: ['凭证核对', '发票勾稽', '附件核对', '账表核对'],
  },
  {
    id: 'expert-audit-internal',
    presetId: 'expert-audit-internal',
    name: '审计与内控专家',
    role: '风险识别、控制评价、测试程序、证据和底稿',
    responsibilities: ['风险点与控制目标', '测试程序设计', '异常事项分类', '整改建议与底稿框架'],
    tools: [...BASE_TOOLS, 'kongchain_rule_check', 'kongchain_evidence_pack'],
    skills: ['internal-control-basics', 'working-paper-drafting', 'evidence-traceability', 'kongchain-finance-tools'],
    input: '业务流程、数据、控制描述、已验证发现',
    output: STRUCTURED_HANDOFF,
    scenarios: ['采购付款内控', '控制评价', '异常清单', '整改建议'],
  },
  {
    id: 'expert-tax-policy',
    presetId: 'expert-tax-policy',
    name: '税务与政策研究专家',
    role: '官方资料检索、适用条件、有效期和来源核验',
    responsibilities: ['检索官方资料', '核对适用条件与有效期', '记录来源链接/发布日期', '区分原文与推断'],
    tools: ['web_search', 'web_fetch', 'read/glob/grep', 'kongchain_document_extract'],
    skills: ['policy-research', 'kongchain-finance-tools'],
    input: '政策问题、税种/地区/期间、需要核验的原文来源',
    output: STRUCTURED_HANDOFF,
    scenarios: ['税务政策', '适用条件', '有效期核验', '法规来源核验'],
  },
  {
    id: 'expert-excel-data',
    presetId: 'expert-excel-data',
    name: 'Excel 与财务数据专家',
    role: '数据清洗、复杂计算、跨表对账及异常分析',
    responsibilities: ['字段识别与清洗', '重复/缺失/异常', '跨表对账与合计', '可复算结果文件'],
    tools: [...BASE_TOOLS, 'kongchain_financial_compare'],
    skills: ['financial-data-analysis', 'kongchain-finance-tools'],
    input: 'XLSX/CSV 文件、键列、金额列、日期/分类字段',
    output: STRUCTURED_HANDOFF,
    scenarios: ['Excel 清洗', '跨表对账', '重复识别', '异常分析'],
  },
  {
    id: 'expert-report-workpaper',
    presetId: 'expert-report-workpaper',
    name: '报告与底稿专家',
    role: '将已验证结果整理为工作底稿、报告和复核清单',
    responsibilities: ['整合已验证结果', '编制底稿/报告', '列明口径与限制', '生成复核清单'],
    tools: [...BASE_TOOLS, 'kongchain_report_generate', 'present'],
    skills: ['working-paper-drafting', 'evidence-traceability', 'kongchain-finance-tools'],
    input: '多个专家的结构化结果、源文件清单、复核要求',
    output: STRUCTURED_HANDOFF,
    scenarios: ['汇总底稿', '交付报告', '复核清单', '分歧呈现'],
    aggregator: true,
  },
]

const SIMPLE = /汇总|合计|统计|排序|去重|求和|平均/
const PROCUREMENT = /采购|付款|凭证|发票|内控|审计|风险|控制/
const TAX = /税务|政策|法规|税率|优惠|适用条件|有效期|条文/
const DATA = /excel|xlsx|csv|跨表|对账|清洗|透视|重复|字段|公式|数据/
const ACCOUNTING = /凭证|发票|科目|账表|勾稽|附件|入账/
const AUDIT = /审计|内控|风险|控制|测试程序|整改|底稿|证据/
const REPORT = /报告|底稿|复核清单|交付|汇总报告/
const FINANCE = /指标|预算|成本|费用|波动|利润|现金流|比率|分析/
const REVIEW = /复核|独立复核|验证|矛盾|分歧|争议/

export function planExperts(task) {
  const text = String(task ?? '').toLowerCase()
  const reasons = []
  const experts = []
  const add = (id, reason) => {
    if (!experts.includes(id)) {
      experts.push(id)
      reasons.push(reason)
    }
  }
  if (SIMPLE.test(text) && !PROCUREMENT.test(text) && !TAX.test(text) && !REPORT.test(text)) {
    return {
      mode: 'direct',
      experts: [],
      reason: '简单表格汇总/统计任务，主 Agent 直接执行，不拆分专家。',
      handoff: STRUCTURED_HANDOFF,
    }
  }
  if (TAX.test(text)) add('expert-tax-policy', '涉及政策/税务条款与来源核验')
  if (DATA.test(text)) add('expert-excel-data', '涉及 Excel/CSV、跨表或数据质量')
  if (ACCOUNTING.test(text)) add('expert-accounting', '涉及凭证、发票、科目或账表勾稽')
  if (AUDIT.test(text)) add('expert-audit-internal', '涉及风险、控制、测试程序或内控')
  if (FINANCE.test(text) && experts.length < 2) add('expert-finance-analysis', '涉及财务指标、预算、成本或波动')
  if (REPORT.test(text) || experts.length >= 2) add('expert-report-workpaper', '需要整合已验证结果并形成交付')
  if (experts.length === 0) add('expert-finance-analysis', '默认财务分析，但保持单一专家')
  const review = REVIEW.test(text)
  if (review && !experts.includes('expert-audit-internal')) add('expert-audit-internal', '需要独立复核')
  return {
    mode: review ? 'review' : experts.length > 1 ? 'parallel' : 'single',
    experts,
    reason: reasons.join('；'),
    review,
    handoff: STRUCTURED_HANDOFF,
  }
}

export function buildDispatchPrompt(expert, task, handoff, reviewOf) {
  const lines = [
    `你是控链专家团队中的「${expert.name}」。`,
    `职责：${expert.role}。`,
    `专业技能：${(expert.skills ?? []).join('、')}。`,
    `可用工具：${(expert.tools ?? []).join('、')}。`,
    `输入约定：${expert.input}。`,
    `任务：${task}`,
  ]
  if (handoff !== undefined) lines.push(`上一阶段结构化交接：${JSON.stringify(handoff)}`)
  if (reviewOf !== undefined) lines.push(`这是独立复核请求。请用不同数据检查/计算规则复核以下结果，不要重复同一模型请求当作独立验证：${JSON.stringify(reviewOf)}`)
  lines.push('必须实际调用工具计算或核对；不要只给建议。')
  lines.push('重要数字必须可复算；注明字段、口径和假设。没有可靠来源的会计/审计/税务结论标为待核实。')
  lines.push('最后只输出一个 JSON 对象，字段为 conclusion,evidence,calculation,unknowns,nextSteps,disagreements；分歧必须明示，不得强行平均。')
  return lines.join('\n')
}
