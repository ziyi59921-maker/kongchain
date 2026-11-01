window.__ModuleLoader__.load({
  id: '@kongchain/brand',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    function KongChainMark() {
      return h('svg', {
        viewBox: '0 0 24 24',
        width: 22,
        height: 22,
        role: 'img',
        'aria-label': '控链 KongChain',
        style: { display: 'block', color: 'inherit' },
      },
        h('path', {
          d: 'M9.2 14.8 6.4 17.6a3.4 3.4 0 0 1-4.8-4.8l3.2-3.2a3.4 3.4 0 0 1 4.8 0l.7.7',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M14.8 9.2 17.6 6.4a3.4 3.4 0 0 1 4.8 4.8l-3.2 3.2a3.4 3.4 0 0 1-4.8 0l-.7-.7',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M8.4 13.2 13.2 8.4',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
        }),
      )
    }

    function KongChainName() {
      return h('span', {
        style: {
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: '0.4em',
          fontWeight: 650,
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
        },
      },
        h('span', null, '控链'),
        h('span', { style: { fontWeight: 500, opacity: 0.72, fontSize: '0.92em' } }, 'KongChain'),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.inject('sidebar.brand.name', function* () {
          yield ctx.slots.register({ name: 'sidebar.brand.mark' }, KongChainMark)
          yield ctx.slots.register({ name: 'sidebar.brand.name' }, KongChainName)
        }))
      },
    }
  },
})
