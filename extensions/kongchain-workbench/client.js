window.__ModuleLoader__.load({
  id: '@kongchain/workbench',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState } = React

    const STYLE_ID = 'kongchain-workbench-style'
    const QUICK_TASKS = [
      { id: 'finance', label: '财务数据分析', prompt: '请分析我提供的财务数据：汇总、核对、识别异常，并生成可复核的分析文件。' },
      { id: 'accounting', label: '会计资料核查', prompt: '请核查会计资料的完整性、一致性和异常项，给出数据依据与待核实事项。' },
      { id: 'audit', label: '审计与内控', prompt: '请执行审计与内控检查，形成带有依据、异常说明和待核实事项的结论。' },
      { id: 'policy', label: '政策研究', prompt: '请研究相关政策或制度，提炼与财务、内控相关的要求、影响和证据。' },
      { id: 'capability', label: '创建新能力', prompt: '请先检查现有能力，再根据需求创建一个新的无害工具或插件，并完成测试与安装验证。' },
    ]

    function ensureStyle() {
      if (typeof document === 'undefined' || document.getElementById(STYLE_ID) !== null) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = `
        :root {
          --kc-accent: #0f766e;
          --kc-accent-soft: #ecfdf5;
          --kc-ink: #111827;
          --kc-muted: #6b7280;
          --kc-line: #e5e7eb;
          --kc-surface: #ffffff;
        }
        .kc-brand { display: inline-flex; align-items: center; gap: 8px; color: var(--kc-ink); }
        .kc-brand-mark { width: 28px; height: 28px; color: var(--kc-accent); flex: 0 0 auto; }
        .kc-brand-copy { display: flex; flex-direction: column; line-height: 1.15; }
        .kc-brand-name { font-size: 20px; font-weight: 700; letter-spacing: 0.01em; }
        .kc-brand-tag { font-size: 12px; color: var(--kc-muted); font-weight: 500; }
        .kc-quick { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }
        .kc-quick-label { font-size: 12px; color: var(--kc-muted); margin-right: 2px; }
        .kc-chip {
          appearance: none; border: 1px solid var(--kc-line); background: var(--kc-surface);
          color: var(--kc-ink); border-radius: 999px; padding: 7px 12px; font-size: 13px;
          line-height: 1.2; cursor: pointer; transition: border-color .15s ease, color .15s ease, background .15s ease;
        }
        .kc-chip:hover, .kc-chip:focus-visible { border-color: var(--kc-accent); color: var(--kc-accent); outline: none; }
        .kc-chip[disabled] { opacity: .45; cursor: not-allowed; }
        .kc-chip--primary { background: var(--kc-accent); border-color: var(--kc-accent); color: #fff; }
        .kc-chip--primary:hover, .kc-chip--primary:focus-visible { background: #0b5f59; color: #fff; }
        .kc-entry { display: inline-flex; align-items: center; gap: 6px; }
        .kc-entry-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--kc-accent); }
        .kc-status {
          display: inline-flex; align-items: center; gap: 7px; min-height: 28px; padding: 4px 10px;
          border: 1px solid var(--kc-line); border-radius: 999px; background: #f9fafb;
          color: var(--kc-muted); font-size: 12px; white-space: nowrap;
        }
        .kc-status-dot { width: 7px; height: 7px; border-radius: 50%; background: #9ca3af; }
        .kc-status[data-state="running"] .kc-status-dot { background: var(--kc-accent); }
        .kc-status[data-state="waiting"] .kc-status-dot { background: #d97706; }
        .kc-status[data-state="done"] .kc-status-dot { background: #16a34a; }
        .kc-status[data-state="error"] .kc-status-dot { background: #dc2626; }
        .kc-notice { font-size: 12px; color: var(--kc-muted); min-height: 16px; }
        [class*="titleGroup"] > span:first-child { display: none !important; }
        [class*="previewBadge"] { display: none !important; }
        @media (max-width: 640px) {
          .kc-brand-name { font-size: 18px; }
          .kc-brand-tag { font-size: 11px; }
          .kc-quick { gap: 6px; }
          .kc-chip { padding: 6px 10px; font-size: 12px; }
          .kc-status { font-size: 11px; }
        }
      `
      document.head.appendChild(style)
    }

    function replaceHeroCopy() {
      if (typeof document === 'undefined') return
      const spans = document.querySelectorAll('span')
      for (const span of spans) {
        if (span.childElementCount !== 0) continue
        const text = (span.textContent ?? '').trim()
        if (text === '探索未至之境' || text === 'Into the Unknown') span.style.display = 'none'
        if (text === '预览版' || text === 'Preview') span.textContent = '财务与内控 AI Agent'
      }
    }

    function clickAriaLabel(label) {
      if (typeof document === 'undefined') return false
      const buttons = document.querySelectorAll('button')
      for (const button of buttons) {
        if (button.getAttribute('aria-label') === label) {
          button.click()
          return true
        }
      }
      return false
    }

    function BrandMark() {
      ensureStyle()
      useEffect(() => {
        replaceHeroCopy()
        const timer = window.setTimeout(replaceHeroCopy, 80)
        return () => { window.clearTimeout(timer) }
      }, [])
      return h('span', { className: 'kc-brand', 'data-kc-workbench-brand': '' },
        h('svg', {
          className: 'kc-brand-mark', viewBox: '0 0 24 24', width: 28, height: 28,
          role: 'img', 'aria-label': '控链 KongChain',
        },
          h('path', {
            d: 'M9.2 14.8 6.4 17.6a3.4 3.4 0 0 1-4.8-4.8l3.2-3.2a3.4 3.4 0 0 1 4.8 0l.7.7',
            fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round',
          }),
          h('path', {
            d: 'M14.8 9.2 17.6 6.4a3.4 3.4 0 0 1 4.8 4.8l-3.2 3.2a3.4 3.4 0 0 1-4.8 0l-.7-.7',
            fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round',
          }),
          h('path', {
            d: 'M8.4 13.2 13.2 8.4', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round',
          }),
        ),
        h('span', { className: 'kc-brand-copy' },
          h('span', { className: 'kc-brand-name' }, '控链 KongChain'),
          h('span', { className: 'kc-brand-tag' }, '财务与内控 AI Agent'),
        ),
      )
    }

    function QuickTasks(props) {
      ensureStyle()
      const [notice, setNotice] = useState('')
      const inputActions = props.inputActions
      const ready = inputActions !== undefined

      const fill = (prompt) => {
        if (!ready) {
          setNotice('请先选择工作区并创建会话')
          return
        }
        inputActions.setDraft(prompt)
        setNotice('任务已填入输入区，可继续编辑或发送')
      }

      const start = (prompt) => {
        if (!ready) {
          setNotice('请先选择工作区并创建会话')
          return
        }
        inputActions.setDraft(prompt)
        inputActions.submit()
        setNotice('任务已提交，状态来自真实会话事件')
      }

      const addFile = () => {
        const input = document.querySelector('input[type="file"]')
        if (input === null) {
          setNotice('未找到原生上传入口，请先创建会话')
          return
        }
        input.click()
        setNotice('已打开原生文件选择器')
      }

      const openHistory = () => {
        const ok = clickAriaLabel('搜索会话') || clickAriaLabel('展开侧边栏')
        setNotice(ok ? '已打开历史会话入口' : '历史入口暂不可用，请检查侧边栏')
      }

      const openCapabilities = () => {
        const ok = clickAriaLabel('插件')
        setNotice(ok ? '已打开专家与能力中心' : '能力中心入口暂不可用')
      }

      const openDeveloper = () => {
        if (!ready) {
          setNotice('请先选择工作区并创建会话')
          return
        }
        inputActions.setDraft('/developer status')
        inputActions.submit()
        setNotice('已提交开发者模式状态查询')
      }

      return h('div', { className: 'kc-quick', 'data-kc-workbench-quick': '' },
        h('span', { className: 'kc-quick-label' }, '常用任务'),
        ...QUICK_TASKS.map((task) => h('button', {
          key: task.id, type: 'button', className: 'kc-chip',
          onClick: () => start(task.prompt), disabled: !ready,
          title: ready ? `开始：${task.label}` : '选择工作区后可用',
        }, task.label)),
        h('button', {
          type: 'button', className: 'kc-chip kc-chip--primary kc-entry',
          onClick: addFile,
        }, h('span', { className: 'kc-entry-dot' }), '添加文件'),
        h('button', {
          type: 'button', className: 'kc-chip kc-entry',
          onClick: openHistory,
        }, h('span', { className: 'kc-entry-dot' }), '历史任务'),
        h('button', {
          type: 'button', className: 'kc-chip kc-entry',
          onClick: openCapabilities,
        }, h('span', { className: 'kc-entry-dot' }), '专家与能力中心'),
        h('button', {
          type: 'button', className: 'kc-chip kc-entry', onClick: openDeveloper, disabled: !ready,
        }, h('span', { className: 'kc-entry-dot' }), '开发者模式'),
        h('span', { className: 'kc-notice', role: 'status' }, notice),
      )
    }

    function StatusPill(props) {
      ensureStyle()
      const sessionId = props.sessionId
      const input = props.useInput((snapshot) => snapshot)
      const status = props.useSessionStatus((snapshot) => sessionId === undefined ? undefined : snapshot.get(sessionId))
      const running = status?.running
      const [finished, setFinished] = useState(false)
      const [sawRunning, setSawRunning] = useState(false)
      useEffect(() => {
        if (running === true) {
          setSawRunning(true)
          setFinished(false)
        } else if (running === false && sawRunning) {
          setFinished(true)
        }
      }, [running, sawRunning])
      let text = '准备就绪'
      let state = 'idle'
      if (status?.pendingInteraction !== undefined) {
        text = '等待审批或补充信息'
        state = 'waiting'
      } else if (input?.phase === 'adjudicating') {
        text = '正在理解任务'
        state = 'running'
      } else if (input?.phase === 'submitting' || input?.phase === 'sending' || input?.phase === 'claimed') {
        text = '正在提交或执行'
        state = 'running'
      } else if (running === true) {
        text = '正在执行工具或步骤'
        state = 'running'
      } else if (finished) {
        text = '已完成，查看结果'
        state = 'done'
      }
      return h('div', {
        className: 'kc-status', 'data-kc-status': '', 'data-state': state,
        'aria-live': 'polite', title: '状态来自 Harness 会话与输入事件',
      }, h('span', { className: 'kc-status-dot' }), text)
    }

    function WorkbenchDock(props) {
      return h(React.Fragment, null, h(QuickTasks, props), h(StatusPill, props))
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ensureStyle()
        const disposers = []
        disposers.push(ctx.slots.inject('conversation.hero.brand.mark', () => ctx.slots.register(
          { name: 'conversation.hero.brand.mark', id: 'kongchain-workbench', priority: 100 },
          BrandMark,
        )))
        disposers.push(ctx.slots.inject('conversation.input.dock', () => ctx.slots.register(
          { name: 'conversation.input.dock', id: 'kongchain-workbench-status', order: -20 },
          WorkbenchDock,
        )))
        return () => {
          for (const dispose of disposers) dispose()
          document.getElementById(STYLE_ID)?.remove()
        }
      },
    }
  },
})
