window.__ModuleLoader__.load({
  id: '@kongchain/workspace-shell',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useCallback, useRef, Fragment } = React
    const CSS = [
      '.nxo54q_sidebarCol{display:none!important;width:0!important;min-width:0!important;flex:0 0 0!important;overflow:hidden!important}',
      '.nxo54q_centerCol{width:100%!important;flex:1 1 100%!important;min-width:0!important}',
      '.nxo54q_frame{width:100%!important;display:flex!important}',
      '[class*="sidebarCol"]{display:none!important}',
      '#root,#root>div,#root>div>div{width:100%!important;height:100%!important}',
      '*{box-sizing:border-box}',
      ':root{--bg:#f8f9fa;--surface:#fff;--hover:#f8f9fa;--text:#212529;--muted:#6c757d;--faint:#adb5bd;--border:#e9ecef;--focus:#2d8b7a;--accent:#2d8b7a;--accent-h:#247a6a;--accent-l:#f0fdf4;--accent-t:#166534;--ok:#16a34a;--ok-bg:#dcfce7;--info:#2563eb;--info-bg:#dbeafe;--warn:#d97706;--warn-bg:#fef3c7;--danger:#dc2626;--danger-bg:#fee2e2;--r:8px;--rl:12px;--shadow:0 1px 3px rgba(0,0,0,.04),0 1px 2px rgba(0,0,0,.02)}',
      '.kw{display:flex;height:100%;width:100%;font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;color:var(--text);background:var(--bg);overflow:hidden;font-size:14px;line-height:1.5}',
      '.kw-l{width:232px;min-width:232px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}',
      '.kw-b{padding:20px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}',
      '.kw-bi{width:32px;height:32px;border-radius:var(--r);background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;flex-shrink:0}',
      '.kw-bn{font-size:14px;font-weight:700;color:var(--text)}',
      '.kw-bs{font-size:11px;color:var(--muted)}',
      '.kw-n{flex:1;overflow-y:auto;padding:8px 0}',
      '.kw-ni{display:flex;align-items:center;gap:10px;padding:9px 16px;cursor:pointer;color:var(--muted);font-size:13px;border-left:3px solid transparent;transition:background .12s,color .12s}',
      '.kw-ni:hover{background:var(--hover);color:var(--text)}',
      '.kw-ni.act{background:var(--accent-l);color:var(--accent-t);border-left-color:var(--ok);font-weight:500}',
      '.kw-ni svg{width:16px;height:16px;opacity:.55;flex-shrink:0}',
      '.kw-ni.act svg{opacity:1}',
      '.kw-ns{padding:7px 16px 7px 43px;cursor:pointer;color:var(--muted);font-size:12px;border-left:3px solid transparent;transition:background .12s,color .12s}',
      '.kw-ns:hover{background:var(--hover);color:var(--text)}',
      '.kw-ns.act{background:var(--accent-l);color:var(--accent-t);border-left-color:var(--ok)}',
      '.kw-c{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}',
      '.kw-h{height:56px;min-height:56px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 24px;gap:12px}',
      '.kw-ht{font-size:18px;font-weight:700;color:var(--text)}',
      '.kw-hs{flex:1}',
      '.kw-btn{padding:6px 12px;border:1px solid var(--border);border-radius:6px;background:var(--surface);cursor:pointer;font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:4px;transition:all .12s;font-weight:500}',
      '.kw-btn:hover{border-color:var(--focus);color:var(--accent)}',
      '.kw-btn.p{background:var(--accent);color:#fff;border-color:var(--accent)}',
      '.kw-btn.p:hover{background:var(--accent-h)}',
      '.kw-bd{flex:1;overflow-y:auto;padding:24px}',
      '.kw-r{width:320px;min-width:320px;background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}',
      '.kw-ch{padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}',
      '.kw-ct{font-size:13px;font-weight:600;color:var(--text)}',
      '.kw-cb{flex:1;overflow-y:auto;padding:12px}',
      '.kw-cm{margin-bottom:10px;padding:10px 12px;border-radius:var(--r);font-size:13px;line-height:1.6;white-space:pre-wrap}',
      '.kw-cm.u{background:var(--bg);color:var(--text);border:1px solid var(--border)}',
      '.kw-cm.a{background:var(--accent-l);color:var(--accent-t);border:1px solid var(--ok-bg)}',
      '.kw-ci{padding:12px;border-top:1px solid var(--border)}',
      '.kw-ci textarea{width:100%;height:72px;border:1px solid var(--border);border-radius:6px;padding:10px;font-size:13px;resize:none;outline:none;font-family:inherit;background:var(--surface)}',
      '.kw-ci textarea:focus{border-color:var(--focus)}',
      '.kw-cs{width:100%;margin-top:8px;padding:8px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600}',
      '.kw-cs:hover{background:var(--accent-h)}',
      '.kw-cs:disabled{background:var(--faint)}',
      '.kw-sec{background:var(--surface);border-radius:var(--rl);padding:20px 24px;margin-bottom:16px;border:1px solid var(--border);box-shadow:var(--shadow)}',
      '.kw-st{font-size:13px;font-weight:600;color:var(--text);margin-bottom:16px;display:flex;align-items:center;gap:8px}',
      '.kw-st svg{width:16px;height:16px;color:var(--accent)}',
      '.kw-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}',
      '.kw-stat{background:var(--surface);border-radius:var(--r);padding:20px 24px;border:1px solid var(--border);box-shadow:var(--shadow)}',
      '.kw-stat-num{font-size:28px;font-weight:700;color:var(--text);line-height:1.2}',
      '.kw-stat-label{font-size:12px;color:var(--muted);margin-top:4px}',
      '.kw-q{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}',
      '.kw-qc{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px;cursor:pointer;text-align:center;transition:all .15s}',
      '.kw-qc:hover{border-color:var(--focus);box-shadow:var(--shadow)}',
      '.kw-qi{width:36px;height:36px;border-radius:var(--r);margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:16px}',
      '.kw-qn{font-size:12px;font-weight:600;color:var(--text)}',
      '.kw-qd{font-size:10px;color:var(--muted);margin-top:2px}',
      '.kw-e{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px;margin-bottom:12px;box-shadow:var(--shadow)}',
      '.kw-en{font-size:14px;font-weight:600;color:var(--text)}',
      '.kw-ed{font-size:12px;color:var(--muted);margin-top:4px;line-height:1.5}',
      '.kw-et{font-size:11px;color:var(--accent);margin-top:8px;font-family:ui-monospace,monospace}',
      '.kw-empty{text-align:center;padding:48px 24px;color:var(--faint)}',
      '.kw-empty svg{width:48px;height:48px;margin-bottom:12px;opacity:.25}',
      '.kw-empty-t{font-size:13px;line-height:1.6}',
      '.kw-file{display:flex;align-items:center;padding:10px 12px;border-radius:6px;cursor:pointer;transition:background .12s}',
      '.kw-file:hover{background:var(--hover)}',
      '.kw-fi{width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;margin-right:12px;font-size:12px;font-weight:600;flex-shrink:0}',
      '.kw-fn{font-size:13px;font-weight:500;color:var(--text)}',
      '.kw-fm{font-size:11px;color:var(--muted);margin-top:1px}',
      '.kw-toolbar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center}',
      '.kw-toolbar input{padding:7px 12px;border:1px solid var(--border);border-radius:6px;font-size:12px;outline:none;width:200px;background:var(--surface)}',
      '.kw-toolbar input:focus{border-color:var(--focus)}',
      '.kw-toolbar select{padding:7px 12px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--surface);outline:none}',
      '.kw-excel{border-collapse:collapse;font-size:12px;min-width:100%}',
      '.kw-excel th{background:var(--bg);padding:6px 10px;border:1px solid var(--border);font-weight:600;color:var(--muted);font-size:11px;text-align:left}',
      '.kw-excel td{padding:0;border:1px solid var(--border);height:28px}',
      '.kw-excel td input{width:100%;height:100%;border:none;padding:2px 6px;font-size:12px;outline:none;background:transparent;font-family:inherit}',
      '.kw-excel td input:focus{background:var(--accent-l);box-shadow:inset 0 0 0 2px var(--accent)}',
      '.kw-excel td.rh{background:var(--bg);font-weight:600;color:var(--muted);text-align:center;font-size:10px;min-width:32px;width:32px}',
      '.kw-modal-o{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:1000}',
      '.kw-modal{background:var(--surface);border-radius:var(--rl);padding:28px;max-width:440px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.15)}',
      '.kw-modal-t{font-size:16px;font-weight:700;color:var(--text);margin-bottom:16px}',
      '.kw-modal-i{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;outline:none;margin-bottom:12px;background:var(--surface)}',
      '.kw-modal-i:focus{border-color:var(--focus)}',
      '.kw-modal-a{display:flex;gap:8px;justify-content:flex-end}',
      '.kw-step{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--bg)}',
      '.kw-step:last-child{border-bottom:none}',
      '.kw-step-i{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;font-weight:600}',
      '.kw-step-i.done{background:var(--ok-bg);color:var(--ok)}.kw-step-i.run{background:var(--info-bg);color:var(--info)}.kw-step-i.pend{background:var(--bg);color:var(--faint)}',
      '.kw-step-t{font-size:13px;color:var(--text);line-height:1.5}',
      '.kw-table{width:100%;border-collapse:collapse;font-size:12px}',
      '.kw-table th{background:var(--bg);padding:8px 12px;text-align:left;font-weight:600;color:var(--muted);border-bottom:2px solid var(--border);font-size:11px}',
      '.kw-table td{padding:8px 12px;border-bottom:1px solid var(--bg);color:var(--text)}',
      '.kw-table tr:hover td{background:var(--hover)}',
      '.kw-table td.num{text-align:right;font-family:ui-monospace,monospace}',
      '.kw-tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500}',
      '.kw-tag.red{background:var(--danger-bg);color:var(--danger)}.kw-tag.green{background:var(--ok-bg);color:var(--ok)}.kw-tag.orange{background:var(--warn-bg);color:var(--warn)}.kw-tag.blue{background:var(--info-bg);color:var(--info)}.kw-tag.gray{background:var(--bg);color:var(--muted)}'
    ].join('\n')
    function ensureStyle(){if(document.getElementById('kws-style'))return;var s=document.createElement('style');s.id='kws-style';s.textContent=CSS;document.head.appendChild(s)}    const I = {
      play:'M8 5v14l11-7z',folder:'M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z',
      file:'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z',task:'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
      chart:'M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z',audit:'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
      settings:'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
      ai:'M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1.17A7.002 7.002 0 0112 22a7.002 7.002 0 01-6.83-5H4a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1v-.27c-.6-.34-1-.99-1-1.73a2 2 0 012-2z',
      excel:'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14h-2v-2h2v2zm0-4h-2V9h2v4zm-4 4h-2v-2h2v2zm0-4h-2V9h2v4zm-4 4H7v-2h2v2zm0-4H7V9h2v4z',
      word:'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z',pdf:'M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 9h-2v2h-2v-2H9V9h5V7h2v4zm-3-5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V8l-4-2z',
      deliverable:'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z',capability:'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
      expert:'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
      plugin:'M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-2 .9-2 2v3.8h1.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z',
      skill:'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
      dev:'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
      search:'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
      upload:'M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z',refresh:'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
      check:'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'
    }
    function Ico(p){return h('svg',{width:p.s||16,height:p.s||16,viewBox:'0 0 24 24',fill:'currentColor'},h('path',{d:I[p.n]||I.file}))}
    const NAV=[
      {id:'dashboard',label:'工作台',icon:'play'},
      {id:'projects',label:'项目',icon:'folder'},
      {id:'files',label:'文件空间',icon:'file'},
      {id:'tasks',label:'智能任务',icon:'task'},
      {id:'finance',label:'财务与内控',icon:'chart',children:[{id:'accounting',label:'会计核算'},{id:'analysis',label:'财务分析'},{id:'vouchers',label:'凭证与票据'},{id:'audit',label:'审计核查'},{id:'internal',label:'内部控制'},{id:'tax',label:'财税政策'},{id:'reports',label:'报告与底稿'}]},
      {id:'deliverables',label:'成果中心',icon:'deliverable'},
      {id:'capabilities',label:'能力中心',icon:'capability',children:[{id:'experts',label:'专家团队'},{id:'plugins',label:'插件管理'},{id:'skills',label:'Skill 管理'},{id:'devmode',label:'开发者模式'}]},
      {id:'settings',label:'设置',icon:'settings'}
    ]
    const EXPERTS=[
      {name:'财务分析专家',desc:'财务指标、预算执行、成本费用和异常波动',tools:'finance_profile / finance_analyze / financial_compare',skills:'financial-data-analysis'},
      {name:'会计核算专家',desc:'会计凭证、附件、科目辅助检查和账表勾稽',tools:'voucher_reconcile / document_extract / rule_check',skills:'accounting-document-review'},
      {name:'审计与内控专家',desc:'风险识别、控制评价、测试程序、证据和底稿',tools:'audit_workpaper / rule_check / evidence_pack',skills:'internal-control-basics'},
      {name:'税务与政策研究专家',desc:'官方资料检索、适用条件、有效期和来源核验',tools:'web_search / web_fetch / document_extract',skills:'tax-policy-research'},
      {name:'Excel 与财务数据专家',desc:'数据清洗、复杂计算、跨表对账及异常分析',tools:'finance_profile / financial_compare / finance_analyze',skills:'financial-data-analysis'},
      {name:'报告与底稿专家',desc:'将已验证结果整理为工作底稿、报告和复核清单',tools:'report_generate / finance_deliver / audit_workpaper',skills:'working-paper-drafting'}
    ]
    function fmt(n){return typeof n==='number'?n.toLocaleString('zh-CN'):String(n||'0')}
    function Dashboard(props){
      var _d=useState({files:[],loading:true}),st=_d[0],setSt=_d[1]
      useEffect(function(){
        fetch('/api/kongchain-office/files',{credentials:'include'}).then(function(r){return r.ok?r.json():{files:[]}}).then(function(d){
          var files=d.files||[];var versions=files.reduce(function(s,f){return s+((f.versions||[]).length)},0)
          setSt({files:files,versions:versions,loading:false})
        }).catch(function(){setSt({files:[],versions:0,loading:false})})
      },[])
      var files=st.files
      return h('div',null,
        h('div',{className:'kw-stats'},
          h('div',{className:'kw-stat'},h('div',{className:'kw-stat-num'},fmt(files.length)),h('div',{className:'kw-stat-label'},'\u5df2\u6ce8\u518c\u6587\u4ef6')),
          h('div',{className:'kw-stat'},h('div',{className:'kw-stat-num'},fmt(st.versions)),h('div',{className:'kw-stat-label'},'\u6587\u4ef6\u7248\u672c')),
          h('div',{className:'kw-stat'},h('div',{className:'kw-stat-num'},'11'),h('div',{className:'kw-stat-label'},'\u4efb\u52a1\u8bb0\u5f55')),
          h('div',{className:'kw-stat'},h('div',{className:'kw-stat-num'},'20'),h('div',{className:'kw-stat-label'},'\u4e13\u4e1a\u6280\u80fd'))),
        h('div',{className:'kw-sec'},
          h('div',{className:'kw-st'},h(Ico,{n:'play'}),'\u5feb\u901f\u5f00\u59cb'),
          h('div',{style:{fontSize:12,color:'var(--muted)',marginBottom:16}},'\u9009\u62e9\u4e13\u4e1a\u4efb\u52a1\uff0c\u6216\u5728\u53f3\u4fa7 AI \u5bf9\u8bdd\u4e2d\u63cf\u8ff0\u9700\u6c42'),
          h('div',{className:'kw-q'},
            ...([
              {name:'\u8d39\u7528\u62a5\u9500\u6838\u67e5',desc:'\u91cd\u590d/\u5f02\u5e38/\u5236\u5ea6',icon:'audit',color:'var(--accent-l)',nav:'audit'},
              {name:'\u8d22\u52a1\u6570\u636e\u5206\u6790',desc:'\u6307\u6807/\u9884\u7b97/\u6210\u672c',icon:'chart',color:'var(--info-bg)',nav:'analysis'},
              {name:'\u51ed\u8bc1\u4e0e\u7968\u636e\u5ba1\u6838',desc:'\u6838\u5bf9/\u52fe\u7a3d/\u5f02\u5e38',icon:'file',color:'var(--warn-bg)',nav:'vouchers'},
              {name:'\u5185\u63a7\u8bc4\u4ef7',desc:'\u98ce\u9669/\u63a7\u5236/\u7f3a\u9677',icon:'capability',color:'#fdf2f8',nav:'internal'},
              {name:'\u5ba1\u8ba1\u5e95\u7a3f\u7f16\u5236',desc:'\u5e95\u7a3f/\u8bc1\u636e/\u7ed3\u8bba',icon:'deliverable',color:'#f5f3ff',nav:'reports'},
              {name:'\u8d22\u7a0e\u653f\u7b56\u7814\u7a76',desc:'\u68c0\u7d22/\u6838\u9a8c/\u9002\u7528',icon:'search',color:'var(--ok-bg)',nav:'tax'}
            ]).map(function(q){
              return h('div',{key:q.name,className:'kw-qc',onClick:function(){props.navigate(q.nav)}},
                h('div',{className:'kw-qi',style:{background:q.color}},h(Ico,{n:q.icon})),
                h('div',{className:'kw-qn'},q.name),
                h('div',{className:'kw-qd'},q.desc))
            }))),
        files.length>0?h('div',{className:'kw-sec'},
          h('div',{className:'kw-st'},h(Ico,{n:'file'}),'\u6700\u8fd1\u6587\u4ef6'),
          h('table',{className:'kw-table'},
            h('thead',null,h('tr',null,h('th',null,'\u6587\u4ef6\u540d'),h('th',null,'\u7c7b\u578b'),h('th',{style:{textAlign:'right'}},'\u5927\u5c0f'),h('th',{style:{textAlign:'right'}},'\u7248\u672c'),h('th',null,'\u66f4\u65b0\u65f6\u95f4'))),
            h('tbody',null,files.map(function(f){
              var ext=(f.name||'').split('.').pop().toLowerCase()
              var isX=['xlsx','xls','csv'].indexOf(ext)>=0
              var isP=ext==='pdf'
              return h('tr',{key:f.id},
                h('td',null,f.name),
                h('td',null,h('span',{className:'kw-tag '+(isX?'green':isP?'red':'blue')},isX?'\u8868\u683c':isP?'PDF':'\u6587\u6863')),
                h('td',{className:'num'},fmt(f.size)+' B'),
                h('td',{className:'num'},fmt((f.versions||[]).length)),
                h('td',null,(f.updatedAt||f.modified||'').slice(0,16).replace('T',' ')))
            })))):null)
    }
    function ProjectsView(p){
      return h('div',null,h('div',{className:'kw-sec'},
        h('div',{className:'kw-st'},h(Ico,{n:'folder'}),'项目列表'),
        p.projects.length===0
          ? h('div',{className:'kw-empty'},h(Ico,{n:'folder',s:48}),h('div',{className:'kw-empty-t'},'暂无项目'))
          : p.projects.map(function(x){
            return h('div',{key:x.id,className:'kw-file',onClick:function(){p.navigate('tasks')}},
              h('div',{className:'kw-fi',style:{background:'var(--info-bg)'}},h(Ico,{n:'folder',s:14})),
              h('div',null,h('div',{className:'kw-fn'},x.name),h('div',{className:'kw-fm'},(x.desc||'')+' '+(x.createdAt||'').slice(0,10))))
          })))
    }
    function SmartTasks(){
      return h('div',null,h('div',{className:'kw-sec'},
        h('div',{className:'kw-st'},h(Ico,{n:'task'}),'智能任务'),
        h('div',{className:'kw-empty'},h(Ico,{n:'task',s:48}),h('div',{className:'kw-empty-t'},'暂无任务'))))
    }    function FileWorkspace(){
      var _f=useState([]),files=_f[0],setFiles=_f[1]
      var _s=useState(''),search=_s[0],setSearch=_s[1]
      var _fl=useState('all'),filter=_fl[0],setFilter=_fl[1]
      var _ed=useState(null),editing=_ed[0],setEditing=_ed[1]
      var _d=useState([]),data=_d[0],setData=_d[1]
      var _n=useState(''),notice=_n[0],setNotice=_n[1]
      useEffect(function(){
        fetch('/api/kongchain-office/files',{credentials:'include'}).then(function(r){return r.ok?r.json():{files:[]}}).then(function(d){setFiles(d.files||[])}).catch(function(){})
      },[])
      var visible=files.filter(function(f){
        if(search&&(f.name||'').toLowerCase().indexOf(search.toLowerCase())<0)return false
        if(filter==='all')return true
        if(filter==='excel')return /\.(xlsx|xls|csv)$/i.test(f.name||'')
        if(filter==='word')return /\.(docx|doc)$/i.test(f.name||'')
        if(filter==='pdf')return /\.pdf$/i.test(f.name||'')
        return true
      })
      function openFile(f){
        setEditing(f);setNotice('')
        fetch('/api/kongchain-office/file?path='+encodeURIComponent(f.absolutePath||f.path),{credentials:'include'}).then(function(r){return r.ok?r.text():null}).then(function(c){
          if(!c){setData([['']]);return}
          try{var p=JSON.parse(c);setData(p.sheets?(p.sheets[0]||{}).data||[]:Array.isArray(p)?p:[['']])}
          catch(e){setData(c.split('\n').map(function(l){return l.split(',').map(function(x){return x.trim()})}))}
        })
      }
      if(editing){
        var mc=8;data.forEach(function(r){if(r.length>mc)mc=r.length})
        var cols=[];for(var ci=0;ci<mc;ci++)cols.push(String.fromCharCode(65+(ci%26)))
        return h('div',null,
          h('div',{style:{display:'flex',alignItems:'center',gap:12,marginBottom:16}},
            h('button',{className:'kw-btn',onClick:function(){setEditing(null);setData([]);setNotice('')}},'返回'),
            h('div',null,
              h('div',{style:{fontSize:18,fontWeight:700,color:'var(--text)'}},editing.name),
              h('div',{style:{fontSize:12,color:'var(--muted)'}},'表格编辑器 - 原始文件只读，保存生成新版本'))),
          h('div',{className:'kw-toolbar'},
            h('button',{className:'kw-btn',onClick:function(){setData(function(p){var w=(p[0]||[]).length||5;var b=[];for(var i=0;i<w;i++)b.push('');return p.concat([b])})}},'+ 行'),
            h('button',{className:'kw-btn',onClick:function(){setData(function(p){return p.map(function(r){return r.concat([''])})})}},'+ 列'),
            h('div',{style:{flex:1}}),
            notice&&h('span',{style:{fontSize:11,color:notice.indexOf('失败')>=0?'var(--danger)':'var(--ok)',fontWeight:500}},notice),
            h('button',{className:'kw-btn p',onClick:function(){
              if(!editing)return
              var csv=data.map(function(r){return r.map(function(c){return'"'+String(c).replace(/"/g,'""')+'"'}).join(',')}).join('\n')
              fetch('/api/kongchain-office/csv',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({fileId:editing.id,csvText:csv,reason:'edit'})}).then(function(r){return r.json()}).then(function(res){setNotice(res.error?'保存失败: '+res.error:'已保存为新版本')})
            }},'保存新版本')),
          h('div',{style:{border:'1px solid var(--border)',borderRadius:'var(--r)',overflow:'auto',maxHeight:'calc(100vh - 280px)',background:'var(--surface)'}},
            h('table',{className:'kw-excel'},
              h('thead',null,h('tr',null,h('th',{className:'rh'},''),cols.map(function(c){return h('th',{key:c},c)}))),
              h('tbody',null,data.map(function(row,ri){
                return h('tr',{key:ri},h('td',{className:'rh'},String(ri+1)),cols.map(function(_,ci){
                  return h('td',{key:ci},h('input',{value:row[ci]||'',onChange:function(e){var v=e.target.value;setData(function(p){var n=p.map(function(r){return r.slice()});while(n.length<=ri)n.push([]);while(n[ri].length<=ci)n[ri].push('');n[ri][ci]=v;return n})}}))
                }))
              })))))
      }
      return h('div',null,h('div',{className:'kw-sec'},
        h('div',{className:'kw-st'},h(Ico,{n:'folder'}),'文件空间'),
        h('div',{className:'kw-toolbar'},
          h('input',{placeholder:'搜索文件...',value:search,onChange:function(e){setSearch(e.target.value)}}),
          h('select',{value:filter,onChange:function(e){setFilter(e.target.value)}},
            h('option',{value:'all'},'全部类型'),h('option',{value:'excel'},'表格'),h('option',{value:'word'},'文档'),h('option',{value:'pdf'},'PDF')),
          h('button',{className:'kw-btn',onClick:function(){fetch('/api/kongchain-office/files',{credentials:'include'}).then(function(r){return r.json()}).then(function(d){setFiles(d.files||[])})}},h(Ico,{n:'refresh'}),' 刷新')),
        visible.length===0
          ? h('div',{className:'kw-empty'},h(Ico,{n:'folder',s:48}),h('div',{className:'kw-empty-t'},files.length===0?'暂无文件\n通过 AI 对话或工具注册文件后显示在这里':'没有匹配的文件'))
          : visible.map(function(f){
            var ext=(f.name||'').split('.').pop().toLowerCase()
            var isX=['xlsx','xls','csv'].indexOf(ext)>=0
            var isP=ext==='pdf'
            return h('div',{key:f.id,className:'kw-file',onClick:function(){openFile(f)}},
              h('div',{className:'kw-fi',style:{background:isX?'var(--ok-bg)':isP?'var(--danger-bg)':'var(--info-bg)'}},h(Ico,{n:isX?'excel':isP?'pdf':'word',s:14})),
              h('div',{style:{flex:1}},
                h('div',{className:'kw-fn'},f.name),
                h('div',{className:'kw-fm'},fmt(f.size)+' B - 版本 '+((f.versions||[]).length))),
              h('span',{className:'kw-tag gray'},isX?'表格':isP?'PDF':'文档'))
          })))
    }
    var FIN={accounting:{title:'会计核算',desc:'凭证核查、科目辅助检查、账表勾稽',icon:'audit'},analysis:{title:'财务分析',desc:'预算执行、成本结构、异常波动',icon:'chart'},vouchers:{title:'凭证与票据',desc:'票据核对、重复检查、金额核对',icon:'file'},audit:{title:'审计核查',desc:'风险识别、控制测试、证据整理',icon:'audit'},internal:{title:'内部控制',desc:'流程梳理、风险识别、缺陷分析',icon:'capability'},tax:{title:'财税政策',desc:'政策检索、适用条件、来源核验',icon:'search'},reports:{title:'报告与底稿',desc:'底稿编制、报告生成、复核清单',icon:'deliverable'}}
    function FinancePage(p){
      var x=FIN[p.sub]||FIN.accounting
      return h('div',null,h('div',{className:'kw-sec'},
        h('div',{className:'kw-st'},h(Ico,{n:x.icon}),x.title),
        h('div',{style:{fontSize:12,color:'var(--muted)',marginBottom:16}},x.desc),
        h('div',{className:'kw-empty'},h(Ico,{n:x.icon,s:48}),h('div',{className:'kw-empty-t'},x.title+'工作空间\n在右侧 AI 对话中下达任务'))))
    }    function Deliverables(){
      return h('div',null,h('div',{className:'kw-sec'},
        h('div',{className:'kw-st'},h(Ico,{n:'deliverable'}),'成果中心'),
        h('div',{className:'kw-empty'},h(Ico,{n:'deliverable',s:48}),h('div',{className:'kw-empty-t'},'暂无成果'))))
    }
    function Capabilities(p){
      if(!p.sub)return h('div',null,h('div',{className:'kw-sec'},
        h('div',{className:'kw-st'},h(Ico,{n:'capability'}),'能力中心'),
        h('div',{className:'kw-q'},
          ...[{name:'专家团队',desc:'6个专家',icon:'expert',color:'var(--info-bg)',t:'experts'},
              {name:'插件管理',desc:'安装/卸载',icon:'plugin',color:'var(--accent-l)',t:'plugins'},
              {name:'Skill 管理',desc:'知识技能',icon:'skill',color:'var(--warn-bg)',t:'skills'},
              {name:'开发者模式',desc:'代码/测试',icon:'dev',color:'#fdf2f8',t:'devmode'}
          ].map(function(q){
            return h('div',{key:q.name,className:'kw-qc',onClick:function(){p.navigate(q.t)}},
              h('div',{className:'kw-qi',style:{background:q.color}},h(Ico,{n:q.icon})),
              h('div',{className:'kw-qn'},q.name),h('div',{className:'kw-qd'},q.desc))
          }))))
      if(p.sub==='experts')return h('div',null,h('div',{className:'kw-sec'},
        h('div',{className:'kw-st'},h(Ico,{n:'expert'}),'专家团队'),
        EXPERTS.map(function(e,i){return h('div',{key:i,className:'kw-e'},
          h('div',{className:'kw-en'},e.name),h('div',{className:'kw-ed'},e.desc),
          h('div',{className:'kw-et'},'工具: '+e.tools),
          h('div',{style:{fontSize:11,color:'var(--muted)',marginTop:4}},'技能: '+e.skills))})))
      var tt={plugins:'插件管理',skills:'Skill 管理',devmode:'开发者模式'}
      return h('div',null,h('div',{className:'kw-sec'},
        h('div',{className:'kw-st'},h(Ico,{n:'capability'}),tt[p.sub]||'能力中心'),
        h('div',{className:'kw-empty'},h(Ico,{n:'capability',s:48}),h('div',{className:'kw-empty-t'},'功能开发中'))))
    }
    function SettingsPage(){
      return h('div',null,
        h('div',{className:'kw-sec'},h('div',{className:'kw-st'},h(Ico,{n:'settings'}),'模型配置'),
          h('div',{style:{fontSize:12,color:'var(--muted)',marginBottom:12}},'配置 AI 模型供应商和 API Key'),
          h('div',{style:{marginBottom:8}},h('label',{style:{display:'block',fontSize:11,color:'var(--muted)',marginBottom:4}},'模型供应商'),
            h('select',{className:'kw-modal-i',style:{marginBottom:0}},h('option',null,'DeepSeek'),h('option',null,'OpenAI'),h('option',null,'其他'))),
          h('div',{style:{marginBottom:8}},h('label',{style:{display:'block',fontSize:11,color:'var(--muted)',marginBottom:4}},'API Key'),
            h('input',{className:'kw-modal-i',type:'password',placeholder:'sk-...',style:{marginBottom:0}})),
          h('button',{className:'kw-btn p',style:{marginTop:8}},'保存配置')),
        h('div',{className:'kw-sec'},h('div',{className:'kw-st'},h(Ico,{n:'file'}),'工作空间'),
          h('div',{style:{fontSize:12,color:'var(--muted)'}},'存储位置: F:\\KongChain-logs\\')))
    }
    function TaskView(p){
      if(!p.task)return h('div',{className:'kw-empty'},h(Ico,{n:'task',s:48}),h('div',{className:'kw-empty-t'},'选择任务或创建新任务'))
      var plan=p.task.plan||[]
      return h('div',null,h('div',{className:'kw-sec'},
        h('div',{className:'kw-st'},h(Ico,{n:'task'}),p.task.name),
        h('div',{style:{fontSize:12,color:'var(--muted)',marginBottom:12}},'状态: '+(p.task.status==='running'?'执行中':'待执行')),
        plan.map(function(s,i){
          var cls=s.status==='done'?'done':s.status==='running'?'run':'pend'
          var mark=s.status==='done'?'\u2713':s.status==='running'?'\u2026':String(i+1)
          return h('div',{key:i,className:'kw-step'},h('div',{className:'kw-step-i '+cls},mark),h('div',{className:'kw-step-t'},s.text))
        })))
    }
    function ChatPanel(p){
      var _m=useState([]),msgs=_m[0],setMsgs=_m[1]
      var _i=useState(''),draft=_i[0],setDraft=_i[1]
      var _s=useState(false),sending=_s[0],setSending=_s[1]
      var endRef=useRef(null)
      function send(){
        if(!draft.trim()||sending)return
        var t=draft.trim()
        setMsgs(function(x){return x.concat([{r:'u',t:t}])})
        setDraft('');setSending(true)
        setTimeout(function(){
          setMsgs(function(x){return x.concat([{r:'a',t:'收到任务：\u300c'+t+'\u300d\n\n正在分析需求并制定执行计划...'}])})
          setSending(false)
          if(p.onTaskCreate)p.onTaskCreate(t)
        },800)
      }
      useEffect(function(){if(endRef.current)endRef.current.scrollIntoView({behavior:'smooth'})},[msgs])
      return h('div',{className:'kw-r'},
        h('div',{className:'kw-ch'},h(Ico,{n:'ai'}),h('div',{className:'kw-ct'},'AI 助手')),
        h('div',{className:'kw-cb'},
          msgs.length===0
            ? h('div',{className:'kw-cm a'},'您好！我是控链 AI 助手。\n\n我可以帮您：\n- 核查费用报销\n- 分析财务数据\n- 审核凭证票据\n- 编制审计底稿\n- 生成专业报告\n\n请描述您的任务。')
            : h(Fragment,null,msgs.map(function(m,i){return h('div',{key:i,className:'kw-cm '+(m.r==='u'?'u':'a')},m.t)}),h('div',{ref:endRef}))),
        h('div',{className:'kw-ci'},
          h('textarea',{placeholder:'描述您想要完成的任务...',value:draft,onChange:function(e){setDraft(e.target.value)},onKeyDown:function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}},disabled:sending}),
          h('button',{className:'kw-cs',onClick:send,disabled:sending},sending?'执行中...':'发送')))
    }    function Shell(){
      ensureStyle()
      var _p=useState('dashboard'),page=_p[0],setPage=_p[1]
      var _e=useState({finance:true,capabilities:true}),expanded=_e[0],setExpanded=_e[1]
      var _t=useState(null),activeTask=_t[0],setActiveTask=_t[1]
      var _m=useState(false),showModal=_m[0],setShowModal=_m[1]
      var _pj=useState(function(){try{return JSON.parse(localStorage.getItem('kc-projects')||'[]')}catch(e){return[]}}),projects=_pj[0],setProjects=_pj[1]
      var _n=useState(''),newName=_n[0],setNewName=_n[1]
      var _d=useState(''),newDesc=_d[0],setNewDesc=_d[1]
      var navigate=useCallback(function(t){
        var pm={accounting:'finance',analysis:'finance',vouchers:'finance',audit:'finance',internal:'finance',tax:'finance',reports:'finance',experts:'capabilities',plugins:'capabilities',skills:'capabilities',devmode:'capabilities'}
        if(pm[t]){setPage(pm[t]+'/'+t);setExpanded(function(g){var n={};n[pm[t]]=true;return Object.assign({},g,n)})}
        else setPage(t)
      },[])
      var toggle=useCallback(function(id){setExpanded(function(g){var n={};n[id]=!g[id];return Object.assign({},g,n)})},[])
      var createProject=useCallback(function(){
        if(!newName.trim())return
        var p={id:Date.now().toString(36),name:newName.trim(),desc:newDesc.trim(),createdAt:new Date().toISOString()}
        setProjects(function(x){var n=x.concat([p]);try{localStorage.setItem('kc-projects',JSON.stringify(n))}catch(e){}return n})
        setShowModal(false);setNewName('');setNewDesc('')
      },[newName,newDesc])
      var onTask=useCallback(function(name){
        setActiveTask({name:name,status:'running',plan:[{text:'理解任务目标',status:'done'},{text:'检索相关文件',status:'running'},{text:'执行数据分析',status:'pending'},{text:'生成核查结果',status:'pending'}]})
        setPage('task')
      },[])
      var mp=page.indexOf('/')>=0?page.split('/')[0]:page
      var sp=page.indexOf('/')>=0?page.split('/')[1]:undefined
      var content
      if(mp==='dashboard')content=h(Dashboard,{navigate:navigate})
      else if(mp==='projects')content=h(ProjectsView,{projects:projects,navigate:navigate})
      else if(mp==='files')content=h(FileWorkspace)
      else if(mp==='tasks')content=h(SmartTasks)
      else if(mp==='finance')content=h(FinancePage,{sub:sp})
      else if(mp==='deliverables')content=h(Deliverables)
      else if(mp==='capabilities')content=h(Capabilities,{sub:sp,navigate:navigate})
      else if(mp==='settings')content=h(SettingsPage)
      else if(mp==='task')content=h(TaskView,{task:activeTask})
      else content=h(Dashboard,{navigate:navigate})
      var titles={dashboard:'工作台',projects:'项目',files:'文件空间',tasks:'智能任务',finance:'财务与内控',deliverables:'成果中心',capabilities:'能力中心',settings:'设置'}
      var title=mp==='task'?(activeTask?activeTask.name:'任务'):(titles[mp]||'工作台')
      var navNodes=[]
      NAV.forEach(function(item){
        var active=mp===item.id,open=expanded[item.id]
        navNodes.push(h('div',{key:item.id,className:'kw-ni'+(active?' act':''),onClick:function(){
          if(item.children){if(active)toggle(item.id);else setPage(item.id+'/'+item.children[0].id)}
          else setPage(item.id)
        }},h(Ico,{n:item.icon}),h('span',null,item.label),
          item.children?h('span',{style:{marginLeft:'auto',fontSize:8}},open?'\u25bc':'\u25b6'):null))
        if(item.children&&(open||active)){
          item.children.forEach(function(ch){
            navNodes.push(h('div',{key:item.id+'/'+ch.id,className:'kw-ns'+(sp===ch.id?' act':''),onClick:function(){setPage(item.id+'/'+ch.id)}},ch.label))
          })
        }
      })
      return h('div',{className:'kw'},
        h('div',{className:'kw-l'},
          h('div',{className:'kw-b'},
            h('div',{className:'kw-bi'},'\u63a7'),
            h('div',null,h('div',{className:'kw-bn'},'\u63a7\u94fe KongChain'),h('div',{className:'kw-bs'},'\u8d22\u52a1\u4e0e\u5185\u63a7 AI \u5de5\u4f5c\u5e73\u53f0'))),
          h('div',{className:'kw-n'},navNodes),
          h('div',{style:{padding:'12px 16px',borderTop:'1px solid var(--border)'}},
            h('button',{className:'kw-btn',style:{width:'100%',justifyContent:'center'},onClick:function(){setShowModal(true)}},'+ \u65b0\u5efa\u9879\u76ee'))),
        h('div',{className:'kw-c'},
          h('div',{className:'kw-h'},h('div',{className:'kw-ht'},title),h('div',{className:'kw-hs'}),
            h('button',{className:'kw-btn',onClick:function(){navigate('files')}},'\u6587\u4ef6'),
            h('button',{className:'kw-btn',onClick:function(){navigate('tasks')}},'\u4efb\u52a1')),
          h('div',{className:'kw-bd'},content)),
        h(ChatPanel,{onTaskCreate:onTask}),
        showModal?h('div',{className:'kw-modal-o',onClick:function(){setShowModal(false)}},
          h('div',{className:'kw-modal',onClick:function(e){e.stopPropagation()}},
            h('div',{className:'kw-modal-t'},'\u65b0\u5efa\u9879\u76ee'),
            h('input',{className:'kw-modal-i',placeholder:'\u9879\u76ee\u540d\u79f0',value:newName,onChange:function(e){setNewName(e.target.value)}}),
            h('textarea',{className:'kw-modal-i',style:{height:80,resize:'none',fontFamily:'inherit'},placeholder:'\u9879\u76ee\u63cf\u8ff0',value:newDesc,onChange:function(e){setNewDesc(e.target.value)}}),
            h('div',{className:'kw-modal-a'},
              h('button',{className:'kw-btn',onClick:function(){setShowModal(false)}},'\u53d6\u6d88'),
              h('button',{className:'kw-btn p',onClick:createProject},'\u521b\u5efa')))):null)
    }
    return {
      inject: ['slots', 'layout'],
      apply: function(ctx) {
        ensureStyle()
        var ds = []
        try { ds.push(ctx.slots.inject('main', function*(){ yield ctx.slots.register({name:'main',key:'kongchain',inject:function(){return{}}}, Shell) })) } catch(e) {}
        try { ds.push(ctx.slots.inject('sidebar.panellist', function(){ return ctx.slots.register({name:'sidebar.panellist',id:'kongchain',order:-10,label:function(){return'\u63a7\u94fe'}}, function(){ return h('svg',{width:20,height:20,viewBox:'0 0 24 24',fill:'none'},h('circle',{cx:12,cy:12,r:10,stroke:'currentColor',strokeWidth:2}),h('path',{d:'M8 12h8M12 8v8',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round'}))})})) } catch(e) {}
        setTimeout(function(){try{ctx.layout&&ctx.layout.selectPanel&&ctx.layout.selectPanel('kongchain')}catch(e){}},200)
        return function(){ds.forEach(function(d){try{d()}catch(e){}});var el=document.getElementById('kws-style');if(el)el.remove()}
      }
    }
  }
})