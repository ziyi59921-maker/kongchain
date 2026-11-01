window.__ModuleLoader__.load({
  id: '@kongchain/office-workspace',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState } = React

    const STYLE_ID = 'kongchain-office-workspace-style'
    function ensureStyle() {
      if (document.getElementById(STYLE_ID)) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = `
        .kc-office { display:flex; flex-direction:column; gap:12px; padding:12px; color:var(--kc-ink,#111827); }
        .kc-office-tabs { display:flex; gap:8px; flex-wrap:wrap; }
        .kc-office-tab { border:1px solid var(--kc-line,#e5e7eb); border-radius:999px; padding:6px 12px; background:#fff; cursor:pointer; }
        .kc-office-tab[data-active="true"] { background:var(--kc-accent,#0f766e); color:#fff; border-color:var(--kc-accent,#0f766e); }
        .kc-office-toolbar { display:flex; gap:8px; flex-wrap:wrap; }
        .kc-office button { border:1px solid var(--kc-line,#e5e7eb); border-radius:8px; padding:7px 12px; background:#fff; cursor:pointer; }
        .kc-office button:hover { border-color:var(--kc-accent,#0f766e); color:var(--kc-accent,#0f766e); }
        .kc-office-table { width:100%; border-collapse:collapse; font-size:12px; }
        .kc-office-table th,.kc-office-table td { border:1px solid var(--kc-line,#e5e7eb); padding:5px 7px; text-align:left; }
        .kc-office-editor { width:100%; min-height:180px; font-family:Consolas,monospace; font-size:12px; border:1px solid var(--kc-line,#e5e7eb); border-radius:8px; padding:8px; }
        .kc-office-note { font-size:12px; color:var(--kc-muted,#6b7280); }
        .kc-office-error { color:#b91c1c; font-size:12px; }
        .kc-office-preview { white-space:pre-wrap; font-size:12px; background:#f9fafb; border:1px solid var(--kc-line,#e5e7eb); border-radius:8px; padding:8px; max-height:260px; overflow:auto; }
      `
      document.head.appendChild(style)
    }

    async function fetchFiles() {
      const response = await fetch('/api/kongchain-office/files', { credentials: 'include' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    }

    function OfficeWorkspace() {
      ensureStyle()
      const [category, setCategory] = useState('全部文件')
      const [files, setFiles] = useState([])
      const [selected, setSelected] = useState(undefined)
      const [csvText, setCsvText] = useState('')
      const [notice, setNotice] = useState('')
      const [error, setError] = useState('')

      const reload = async () => {
        try {
          const registry = await fetchFiles()
          setFiles(registry.files ?? [])
          setError('')
        } catch (reason) {
          setError(`文件列表加载失败：${String(reason)}`)
        }
      }
      useEffect(() => { void reload() }, [])

      const visible = files.filter((file) => category === '最近文件' || category === 'AI 生成成果'
        ? (category === 'AI 生成成果' ? (file.versions ?? []).length > 0 : true)
        : category === '全部文件' || file.type === category)

      const openFile = async (file) => {
        setSelected(file)
        setCsvText('')
        if (file.ext === '.csv') {
          try {
            const response = await fetch(`/api/kongchain-office/file?path=${encodeURIComponent(file.absolutePath)}`, { credentials: 'include' })
            setCsvText(await response.text())
          } catch (reason) {
            setError(`读取 CSV 失败：${String(reason)}`)
          }
        }
      }

      const saveCsv = async () => {
        if (!selected || selected.ext !== '.csv') return
        try {
          const response = await fetch('/api/kongchain-office/csv', {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ fileId: selected.id, csvText, reason: 'workspace edit' }),
          })
          const result = await response.json()
          if (!response.ok || !result.ok) throw new Error(result.error ?? response.statusText)
          setNotice(`已保存新版本：${result.version.path}`)
          await reload()
        } catch (reason) {
          setError(`保存失败：${String(reason)}`)
        }
      }

      const askAI = (prompt) => {
        const editor = document.querySelector('[contenteditable="true"]')
        if (!editor) {
          setNotice('未找到任务输入区，请在会话中发送任务。')
          return
        }
        editor.focus()
        document.execCommand('insertText', false, prompt)
        setNotice('已写入任务输入区，请补充后发送。')
      }

      return h('div', { className: 'kc-office', 'data-kc-office': '' },
        h('div', { className: 'kc-office-tabs' },
          ['最近文件', '全部文件', '表格', '文档', 'PDF 与附件', 'AI 生成成果'].map((name) =>
            h('button', { key: name, type: 'button', className: 'kc-office-tab', 'data-active': category === name, onClick: () => setCategory(name) }, name)),
        ),
        h('div', { className: 'kc-office-toolbar' },
          h('button', { type: 'button', onClick: () => document.querySelector('input[type=file]')?.click() }, '从本地选择文件'),
          h('button', { type: 'button', onClick: reload }, '刷新'),
          selected && h('button', { type: 'button', onClick: () => askAI(`请分析文件 ${selected.absolutePath} 的数据质量、合计和异常。`) }, 'AI 解释数据'),
          selected && selected.ext === '.csv' && h('button', { type: 'button', onClick: saveCsv }, '保存 CSV 新版本'),
          selected && h('button', { type: 'button', onClick: () => askAI(`请基于 ${selected.absolutePath} 生成新成果，保留原文件。`) }, '生成相关成果'),
        ),
        h('div', { className: 'kc-office-note' }, '文件列表来自真实注册表；CSV 保存为新版本，原始文件只读；XLSX/DOCX/PDF 需通过预览或 AI 工具读取。'),
        error && h('div', { className: 'kc-office-error', role: 'alert' }, error),
        notice && h('div', { className: 'kc-office-note', role: 'status' }, notice),
        h('table', { className: 'kc-office-table' },
          h('thead', null, h('tr', null, ['文件名', '类型', '大小', '修改时间', '来源', '版本', '操作'].map((text) => h('th', { key: text }, text)))),
          h('tbody', null, visible.map((file) => h('tr', { key: file.id },
            h('td', null, file.name),
            h('td', null, file.type),
            h('td', null, `${file.size} B`),
            h('td', null, file.modified),
            h('td', null, file.source),
            h('td', null, String((file.versions ?? []).length)),
            h('td', null, h('button', { type: 'button', onClick: () => void openFile(file) }, '打开')),
          ))),
        ),
        selected && h('div', null,
          h('h3', null, `${selected.name}（${selected.type}）`),
          h('div', { className: 'kc-office-note' }, `SHA-256: ${selected.sha256}`),
          selected.ext === '.csv'
            ? h('textarea', { className: 'kc-office-editor', value: csvText, onChange: (event) => setCsvText(event.target.value) })
            : h('div', { className: 'kc-office-preview' }, `此格式使用现有 Harness 文档预览/Office 工具读取；当前最小编辑器只编辑 CSV。\n路径：${selected.absolutePath}`),
        ),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ensureStyle()
        const dispose = ctx.slots.inject('plugins.tab', () => ctx.slots.register({
          name: 'plugins.tab',
          id: 'kongchain-office-workspace',
          label: '文件空间',
          order: 10,
        }, OfficeWorkspace))
        return () => {
          dispose()
          document.getElementById(STYLE_ID)?.remove()
        }
      },
    }
  },
})
