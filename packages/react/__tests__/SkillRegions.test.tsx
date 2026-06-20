// ── INICIO: tests Capa 2 — Rexións (SkillRegions + SkillTree integration) ──
import { render } from '@testing-library/react'
import type { NodeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { type RegionSpec, SkillRegions } from '../src/SkillRegions.js'

const nodes: NodeDef[] = [
  { id: 'a', type: 'small', label: 'A', tags: ['warrior'] },
  { id: 'b', type: 'small', label: 'B', tags: ['warrior'] },
  { id: 'c', type: 'small', label: 'C', tags: ['cleric'] },
  { id: 'd', type: 'small', label: 'D' }, // sen tags
]

const positions = new Map<string, { x: number; y: number }>([
  ['a', { x: 0, y: 0 }],
  ['b', { x: 100, y: 0 }],
  ['c', { x: 500, y: 200 }],
  ['d', { x: 1000, y: 1000 }],
])

const regions: RegionSpec[] = [
  { id: 'warrior', label: 'Guerreiro', tag: 'warrior', color: '#c1442e' },
  { id: 'cleric', label: 'Clérigo', tag: 'cleric', color: '#3a7ec7' },
]

describe('SkillRegions', () => {
  it('renderiza un <rect> por rexión con nodos do seu tag', () => {
    const { container } = render(
      <svg aria-label="t">
        <title>t</title>
        <SkillRegions regions={regions} nodePositions={positions} nodes={nodes} />
      </svg>,
    )
    const rects = container.querySelectorAll('.yf-skill-region rect')
    expect(rects.length).toBe(2) // warrior + cleric
  })

  it('cada rexión expón data-region-id co seu id', () => {
    const { container } = render(
      <svg aria-label="t">
        <title>t</title>
        <SkillRegions regions={regions} nodePositions={positions} nodes={nodes} />
      </svg>,
    )
    expect(container.querySelector('[data-region-id="warrior"]')).not.toBeNull()
    expect(container.querySelector('[data-region-id="cleric"]')).not.toBeNull()
  })

  it('renderiza o label da rexión como <text>', () => {
    const { container } = render(
      <svg aria-label="t">
        <title>t</title>
        <SkillRegions regions={regions} nodePositions={positions} nodes={nodes} />
      </svg>,
    )
    expect(container.textContent).toContain('Guerreiro')
    expect(container.textContent).toContain('Clérigo')
  })

  it('omite rexións que non teñen nodos do seu tag', () => {
    const empty: RegionSpec[] = [{ id: 'ghost', label: 'Fantasma', tag: 'ghost', color: '#666' }]
    const { container } = render(
      <svg aria-label="t">
        <title>t</title>
        <SkillRegions regions={empty} nodePositions={positions} nodes={nodes} />
      </svg>,
    )
    expect(container.querySelector('[data-region-id="ghost"]')).toBeNull()
    expect(container.textContent).not.toContain('Fantasma')
  })

  it('sen rexións → render null (cero saída)', () => {
    const { container } = render(
      <svg aria-label="t">
        <title>t</title>
        <SkillRegions regions={[]} nodePositions={positions} nodes={nodes} />
      </svg>,
    )
    expect(container.querySelector('.yf-skill-regions')).toBeNull()
  })

  it('o bbox engloba só os nodos do tag (non os outros)', () => {
    const onlyWarrior: RegionSpec[] = [
      { id: 'warrior', label: 'Guerreiro', tag: 'warrior', color: '#c1442e' },
    ]
    const { container } = render(
      <svg aria-label="t">
        <title>t</title>
        <SkillRegions regions={onlyWarrior} nodePositions={positions} nodes={nodes} padding={0} />
      </svg>,
    )
    const rect = container.querySelector('rect')
    if (rect === null) throw new Error('rect missing')
    // warrior nodes: a(0,0) + b(100,0) (small shape ~16px radius).
    // bbox sen padding cobre ambos máis ±radius. Verificamos só
    // que sexa razoable: w >= 100 (separación) e h pequeno.
    const w = Number.parseFloat(rect.getAttribute('width') ?? '0')
    const h = Number.parseFloat(rect.getAttribute('height') ?? '0')
    expect(w).toBeGreaterThanOrEqual(100)
    expect(h).toBeLessThan(100) // pequena
  })

  it('aplica fill-opacity baixa (tinte non opaco)', () => {
    const { container } = render(
      <svg aria-label="t">
        <title>t</title>
        <SkillRegions regions={regions} nodePositions={positions} nodes={nodes} />
      </svg>,
    )
    const rect = container.querySelector('.yf-skill-region rect')
    const opacity = Number.parseFloat(rect?.getAttribute('fill-opacity') ?? '1')
    expect(opacity).toBeLessThan(0.5) // baixa
  })

  it('respeta tintOpacity custom', () => {
    const { container } = render(
      <svg aria-label="t">
        <title>t</title>
        <SkillRegions
          regions={regions}
          nodePositions={positions}
          nodes={nodes}
          tintOpacity={0.35}
        />
      </svg>,
    )
    const rect = container.querySelector('.yf-skill-region rect')
    expect(rect?.getAttribute('fill-opacity')).toBe('0.35')
  })

  it('pointerEvents="none" para non interferir con clics nos nodos', () => {
    const { container } = render(
      <svg aria-label="t">
        <title>t</title>
        <SkillRegions regions={regions} nodePositions={positions} nodes={nodes} />
      </svg>,
    )
    const layer = container.querySelector('.yf-skill-regions')
    expect(layer?.getAttribute('pointer-events')).toBe('none')
  })
})
// ── FIN: tests Capa 2 ──
