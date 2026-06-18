// ── INICIO: tests SkillEdge v2 (F10.4) ──
import { render } from '@testing-library/react'
import type { EdgeDef, EdgePath, NodeState } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { ARROW_MARKER_ID } from '../src/SVGRenderer.js'
import { SkillEdge, edgeStateFor } from '../src/SkillEdge.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import type { Theme } from '../src/theme-types.js'

const theme: Theme = {
  colors: {
    background: 'transparent',
    text: '#000',
    nodeLocked: '#000',
    nodeUnlockable: '#000',
    nodeUnlocked: '#000',
    nodeMaxed: '#000',
    nodeInProgress: '#000',
    nodeStroke: '#000',
    edge: '#CC0001',
    edgeActive: '#CC0002',
    mesh: '#000',
  },
  sizes: { strokeWidth: 2.5, fontSize: 14, fontSizeSmall: 11 },
}

const themeNoEdgeActive: Theme = {
  ...theme,
  colors: { ...theme.colors, edgeActive: undefined as unknown as string },
}

const edge: EdgeDef = { id: 'e', source: 'a', target: 'b', type: 'dependency' }
const directedEdge: EdgeDef = { ...edge, style: { directed: true } }
const path: EdgePath = {
  edgeId: 'e',
  kind: 'straight',
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
  ],
}

describe('edgeStateFor — helper puro (F10.4)', () => {
  const cases: Array<[NodeState | undefined, 'active' | 'inactive']> = [
    ['unlocked', 'active'],
    ['maxed', 'active'],
    ['locked', 'inactive'],
    ['unlockable', 'inactive'],
    ['in_progress', 'inactive'],
    ['disabled', 'inactive'],
    ['expired', 'inactive'],
    [undefined, 'inactive'],
  ]
  for (const [input, expected] of cases) {
    it(`source=${String(input)} → ${expected}`, () => {
      expect(edgeStateFor(input)).toBe(expected)
    })
  }
})

describe('SkillEdge v2 — cor por estado (F10.4)', () => {
  it('active: stroke=edgeActive, opacity NON aplica (=1)', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <svg role="img" aria-label="t">
          <SkillEdge edgeId="e" edge={edge} path={path} edgeState="active" />
        </svg>
      </ThemeProvider>,
    )
    const p = container.querySelector('path.yf-skill-edge')
    const style = p?.getAttribute('style') ?? ''
    expect(style).toContain('stroke: #CC0002')
    expect(style).not.toContain('opacity')
    expect(p?.getAttribute('data-edge-state')).toBe('active')
  })

  it('inactive: stroke=edge, opacity=0.4', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <svg role="img" aria-label="t">
          <SkillEdge edgeId="e" edge={edge} path={path} edgeState="inactive" />
        </svg>
      </ThemeProvider>,
    )
    const p = container.querySelector('path.yf-skill-edge')
    const style = p?.getAttribute('style') ?? ''
    expect(style).toContain('stroke: #CC0001')
    expect(style).toContain('opacity: 0.4')
    expect(p?.getAttribute('data-edge-state')).toBe('inactive')
  })

  it('default sen edgeState: comportamento inactive', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <svg role="img" aria-label="t">
          <SkillEdge edgeId="e" edge={edge} path={path} />
        </svg>
      </ThemeProvider>,
    )
    expect(container.querySelector('path.yf-skill-edge')?.getAttribute('data-edge-state')).toBe(
      'inactive',
    )
  })

  it('tema sen edgeActive: active cae a edge (fallback)', () => {
    const { container } = render(
      <ThemeProvider theme={themeNoEdgeActive}>
        <svg role="img" aria-label="t">
          <SkillEdge edgeId="e" edge={edge} path={path} edgeState="active" />
        </svg>
      </ThemeProvider>,
    )
    const p = container.querySelector('path.yf-skill-edge')
    expect(p?.getAttribute('style') ?? '').toContain('stroke: #CC0001')
  })
})

describe('SkillEdge v2 — marker-end (frechas, F10.4)', () => {
  it('directed=true: marker-end presente referenciando ARROW_MARKER_ID', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <svg role="img" aria-label="t">
          <SkillEdge edgeId="e" edge={directedEdge} path={path} edgeState="active" />
        </svg>
      </ThemeProvider>,
    )
    const p = container.querySelector('path.yf-skill-edge')
    expect(p?.getAttribute('marker-end')).toBe(`url(#${ARROW_MARKER_ID})`)
  })

  it('directed ausente: sen marker-end', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <svg role="img" aria-label="t">
          <SkillEdge edgeId="e" edge={edge} path={path} />
        </svg>
      </ThemeProvider>,
    )
    expect(container.querySelector('path.yf-skill-edge')?.getAttribute('marker-end')).toBeNull()
  })

  it('directed=true SEN tema (headless): sen marker-end (cero <defs> sen theme)', () => {
    const { container } = render(
      <svg role="img" aria-label="t">
        <SkillEdge edgeId="e" edge={directedEdge} path={path} />
      </svg>,
    )
    expect(container.querySelector('path.yf-skill-edge')?.getAttribute('marker-end')).toBeNull()
  })
})
// ── FIN: tests SkillEdge v2 ──
