window.__ModuleLoader__.load({
  id: '@kongchain/experts',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState } = React

    const EXPERTS = [
      { id: 'expert-finance-analysis', name: '财务分析专家', role: '财务指标、预算执行、成本费用和异常波动', tools: 'finance_profile / finance_analyze / document_extract / finance_deliver', skills: 'financial-data-analysis、kongchain-finance-tools', io: '期间/预算/分类字段 → 结论/证据/口径/未知/建议/分歧', scenarios: '期间分析、预算执行、成本结构、异常波动' },
      { id: 'expert-accounting', name: '会计核算专家', role: '会计凭证、附件、科目辅助检查和账表勾稽', tools: 'voucher_reconcile / document_extract / rule_check / finance_deliver', skills: 'accounting-document-review、kongchain-finance-tools', io: '凭证/发票/附件/账表 → 勾稽结果/证据/待核实', scenarios: '凭证核对、发票勾稽、附件核对、账表核对' },
      { id: 'expert-audit-internal', name: '审计与内控专家', role: '风险识别、控制评价、测试程序、证据和底稿', tools: 'audit_workpaper / rule_check / evidence_pack / voucher_reconcile', skills: 'internal-control-basics、working-paper-drafting、evidence-traceability', io: '流程/控制/发现 → 风险/测试/异常/整改/底稿', scenarios: '采购付款内控、控制评价、异常清单、整改建议' },
      { id: 'expert-tax-policy', name: '税务与政策研究专家', role: '官方资料检索、适用条件、有效期和来源核验', tools: 'web_search / web_fetch / document_extract', skills: 'policy-research、kongchain-finance-tools', io: '政策问题/税种/期间 → 条款/来源/适用条件/待核实', scenarios: '税务政策、适用条件、有效期核验、来源核验' },
      { id: 'expert-excel-data', name: 'Excel 与财务数据专家', role: '数据清洗、复杂计算、跨表对账及异常分析', tools: 'finance_profile / financial_compare / finance_analyze / finance_deliver', skills: 'financial-data-analysis、kongchain-finance-tools', io: 'XLSX/CSV/键列/金额列 → 清洗/对账/异常/结果文件', scenarios: 'Excel 清洗、跨表对账、重复识别、异常分析' },
      { id: 'expert-report-workpaper', name: '报告与底稿专家', role: '将已验证结果整理为工作底稿、报告和复核清单', tools: 'report_generate / finance_deliver / audit_workpaper / evidence_pack / present', skills: 'working-paper-drafting、evidence-traceability、kongchain-finance-tools', io: '多个结构化结果/源文件 → 底稿/报告/复核清单/分歧', scenarios: '汇总底稿、交付报告、复核清单、分歧呈现' },
    ]

    const STYLE_ID = 'kongchain-experts-style'
    function ensureStyle() {
      if (document.getElementById(STYLE_ID) !== null) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = `
        .kc-experts { display: grid; gap: 12px; }
        .kc-expert { border: 1px solid var(--kc-line,#e5e7eb); border-radius: 12px; padding: 14px; background: var(--kc-surface,#fff); }
        .kc-expert h3 { margin: 0 0 6px; font-size: 16px; color: var(--kc-ink,#111827); }
        .kc-expert p { margin: 4px 0; color: var(--kc-muted,#6b7280); font-size: 13px; line-height: 1.5; }
        .kc-expert-actions { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
        .kc-expert button { border: 1px solid #d1d5db; border-radius: 999px; padding: 6px 12px; background: #fff; cursor: pointer; }
        .kc-expert button:hover { border-color: var(--kc-accent,#0f766e); color: var(--kc-accent,#0f766e); }
        .kc-expert-note { font-size: 12px; color: var(--kc-muted,#6b7280); min-height: 16px; }
        .kc-expert-status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--kc-muted,#6b7280); }
        .kc-expert-dot { width: 7px; height: 7px; border-radius: 50%; background: #9ca3af; }
        .kc-expert-status[data-state="completed"] .kc-expert-dot { background: #16a34a; }
        .kc-expert-status[data-state="running"] .kc-expert-dot { background: var(--kc-accent,#0f766e); }
      `
      document.head.appendChild(style)
    }

    function insertComposer(text) {
      const editor = document.querySelector('[contenteditable="true"]')
      if (editor === null) return false
      editor.focus()
      document.execCommand('insertText', false, text)
      return true
    }

    function openComposerWith(text, setNote) {
      const newSession = [...document.querySelectorAll('button')].find((button) => button.getAttribute('aria-label') === '新建会话')
      if (newSession !== undefined) newSession.click()
      window.setTimeout(() => {
        const ok = insertComposer(text)
        setNote(ok ? '已把专家选择写入任务输入区，请补充任务后发送。' : '未找到任务输入区，请在会话中手动选择专家。')
      }, 800)
    }

    function ExpertCenter() {
      ensureStyle()
      const [note, setNote] = useState('')
      const choose = (expert) => {
        openComposerWith(`请由专家【${expert.name}】处理：`, setNote)
      }
      const auto = () => {
        openComposerWith('请根据任务自动调度合适的财务专家：', setNote)
      }
      return h('div', { className: 'kc-experts', 'data-kc-experts': '' },
        h('div', { className: 'kc-expert' },
          h('h3', null, '专家与能力中心'),
          h('p', null, '专家共享主 Agent 的工具注册表、文件能力和会话记录。未被调用的专家不会显示为“正在协作”。'),
          h('div', { className: 'kc-expert-actions' },
            h('button', { type: 'button', onClick: auto }, '自动调度'),
          ),
          h('div', { className: 'kc-expert-note', role: 'status' }, note),
        ),
        ...EXPERTS.map((expert) => h('div', { className: 'kc-expert', key: expert.id, 'data-expert-id': expert.id },
          h('h3', null, expert.name),
          h('p', null, `职责：${expert.role}`),
          h('p', null, `工具：${expert.tools}`),
          h('p', null, `技能：${expert.skills}`),
          h('p', null, `输入/输出：${expert.io}`),
          h('p', null, `适用场景：${expert.scenarios}`),
          h('div', { className: 'kc-expert-status', 'data-state': 'idle' },
            h('span', { className: 'kc-expert-dot' }),
            '当前状态：可用；实际参与与结果见会话中的子代理卡片',
          ),
          h('div', { className: 'kc-expert-actions' },
            h('button', { type: 'button', onClick: () => choose(expert) }, '选择专家'),
          ),
        )),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ensureStyle()
        const dispose = ctx.slots.inject('plugins.tab', () => ctx.slots.register({
          name: 'plugins.tab',
          id: 'kongchain-experts',
          label: '专家与能力中心',
          order: 20,
        }, ExpertCenter))
        return () => {
          dispose()
          document.getElementById(STYLE_ID)?.remove()
        }
      },
    }
  },
})
