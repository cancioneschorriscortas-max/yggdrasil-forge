// ── INICIO: tests SkillEdge + MeshOverlay — tematización inline (F10.3.fix) ──
import { render } from '@testing-library/react'
import type { EdgeDef, EdgePath, MeshElement } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { MeshOverlay } from '../src/MeshOverlay.js'
import { SkillEdge } from '../src/SkillEdge.js'
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
    edge: '#BB0001',
    mesh: '#BB0002',
  },
  sizes: { strokeWidth: 3.5, fontSize: 14, fontSizeSmall: 11 },
}

const edge: EdgeDef = {
  id: 'e',
  source: 'a',
  target: 'b',
  kind: 'dependency',
}
const path: EdgePath = {
  edgeId: 'e',
  kind: 'straight',
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
  ],
}

describe('SkillEdge — stroke inline (F10.3.fix)', () => {
  it('con tema: <path> ten style.stroke=#BB0001, style.strokeWidth=3.5', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <svg role="img" aria-label="t">
          <SkillEdge edgeId="e" edge={edge} path={path} />
        </svg>
      </ThemeProvider>,
    )
    const p = container.querySelector('path.yf-skill-edge')
    const style = p?.getAttribute('style') ?? ''
    expect(style).toContain('stroke: #BB0001') // #BB0001
    expect(style).toContain('stroke-width: 3.5')
  })

  it('sen tema (headless): style baleiro, conserva atributo stroke="currentColor"', () => {
    const { container } = render(
      <svg role="img" aria-label="t">
        <SkillEdge edgeId="e" edge={edge} path={path} />
      </svg>,
    )
    const p = container.querySelector('path.yf-skill-edge')
    expect(p?.getAttribute('stroke')).toBe('currentColor')
    expect(p?.getAttribute('style') ?? '').not.toContain('stroke:')
  })
})

const meshElements: MeshElement[] = [
  { type: 'line', from: { x: 0, y: 0 }, to: { x: 10, y: 10 } },
  { type: 'circle', center: { x: 5, y: 5 }, radius: 3 },
  {
    type: 'polygon',
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 },
    ],
  },
]

describe('MeshOverlay — stroke inline (F10.3.fix)', () => {
  it('con tema: cada subelemento (line/circle/polygon) leva style.stroke=mesh', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <svg role="img" aria-label="t">
          <MeshOverlay mesh={meshElements} />
        </svg>
      </ThemeProvider>,
    )
    const line = container.querySelector('line.yf-mesh-overlay__line')
    const circle = container.querySelector('circle.yf-mesh-overlay__circle')
    const polygon = container.querySelector('polygon.yf-mesh-overlay__polygon')

    for (const el of [line, circle, polygon]) {
      const style = el?.getAttribute('style') ?? ''
      expect(style).toContain('stroke: #BB0002') // #BB0002
      expect(style).toContain('stroke-width: 3.5')
    }
  })

  it('sen tema (headless): atributos conservados, sen inline style', () => {
    const { container } = render(
      <svg role="img" aria-label="t">
        <MeshOverlay mesh={meshElements} />
      </svg>,
    )
    const line = container.querySelector('line.yf-mesh-overlay__line')
    expect(line?.getAttribute('stroke')).toBe('currentColor')
    expect(line?.getAttribute('style') ?? '').not.toContain('stroke:')
  })
})
// ── FIN: tests SkillEdge + MeshOverlay — tematización inline ──
