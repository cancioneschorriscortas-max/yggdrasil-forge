// ── INICIO: tests do regionShape='hull' (helper puro + render) ──
// O ficheiro SkillRegions.test.tsx existente non se toca → guard de
// regresión: o default 'box' segue funcionando exactamente igual.
// Aquí cubrimos só o que engade o blob.

import { render } from '@testing-library/react'
import type { NodeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { SkillRegions, computeRegionHullPath } from '../src/SkillRegions.js'

/** Helper: NodeDef mínimo con tags + size. */
function n(id: string, x: number, y: number, tag: string): NodeDef {
  // Posición non se pasa polo NodeDef (vai en positions), polo que x/y
  // son só argumentos do test (úsanse para construír o Map de positions).
  void x
  void y
  return {
    id,
    type: 'small',
    label: id,
    tags: [tag],
    size: 24,
  }
}

function pos(
  entries: ReadonlyArray<[string, number, number]>,
): Map<string, { readonly x: number; readonly y: number }> {
  const m = new Map<string, { readonly x: number; readonly y: number }>()
  for (const [id, x, y] of entries) m.set(id, { x, y })
  return m
}

describe('computeRegionHullPath (helper puro)', () => {
  it('4 nodos en abano: path comeza con M, contén C e remata en Z', () => {
    const nodes: NodeDef[] = [
      n('a', 100, 0, 't'),
      n('b', 0, 100, 't'),
      n('c', -100, 0, 't'),
      n('d', 0, -100, 't'),
    ]
    const positions = pos([
      ['a', 100, 0],
      ['b', 0, 100],
      ['c', -100, 0],
      ['d', 0, -100],
    ])
    const d = computeRegionHullPath('t', nodes, positions, 16)
    expect(d).not.toBeNull()
    if (d === null) return
    expect(d.startsWith('M')).toBe(true)
    expect(d.includes(' C ')).toBe(true)
    expect(d.trimEnd().endsWith('Z')).toBe(true)
  })

  it('un só nodo: produce un path pechado válido (sen degenerar)', () => {
    const nodes: NodeDef[] = [n('solo', 0, 0, 't')]
    const positions = pos([['solo', 0, 0]])
    const d = computeRegionHullPath('t', nodes, positions, 16)
    expect(d).not.toBeNull()
    if (d === null) return
    expect(d.startsWith('M')).toBe(true)
    expect(d.trimEnd().endsWith('Z')).toBe(true)
    // A mostraxe de K=10 puntos no perímetro do círculo dá un hull
    // con polo menos 3 vértices → debe usar segmentos C, non fallback.
    expect(d.includes(' C ')).toBe(true)
  })

  it('0 nodos co tag: devolve null', () => {
    const nodes: NodeDef[] = [n('a', 0, 0, 'outro')]
    const positions = pos([['a', 0, 0]])
    expect(computeRegionHullPath('non-existe', nodes, positions, 16)).toBeNull()
    expect(computeRegionHullPath('outro', [], positions, 16)).toBeNull()
  })

  it('hull engloba: bbox numérico do path inclúe os centros dos nodos', () => {
    const centers: ReadonlyArray<[string, number, number]> = [
      ['a', 100, 0],
      ['b', 0, 100],
      ['c', -100, 0],
      ['d', 0, -100],
    ]
    const nodes: NodeDef[] = centers.map(([id, x, y]) => n(id, x, y, 't'))
    const positions = pos(centers)
    const d = computeRegionHullPath('t', nodes, positions, 16)
    expect(d).not.toBeNull()
    if (d === null) return
    // Extracción aproximada das coordenadas do path (segmentos M/L/C
    // teñen "x y" en pares). É unha cota inferior do bbox real, pero
    // é suficiente para asertar enclose.
    const tokens = d.split(/[\s,MLCZ]+/u).filter((t) => t.length > 0)
    const nums = tokens.map(Number).filter((v) => Number.isFinite(v))
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = nums[i] as number
      const y = nums[i + 1] as number
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    for (const [, cx, cy] of centers) {
      expect(cx, `centro x=${cx} fora do bbox do hull`).toBeGreaterThanOrEqual(minX)
      expect(cx).toBeLessThanOrEqual(maxX)
      expect(cy).toBeGreaterThanOrEqual(minY)
      expect(cy).toBeLessThanOrEqual(maxY)
    }
  })
})

describe('SkillRegions render con regionShape', () => {
  const nodes: NodeDef[] = [
    n('a', 100, 0, 't'),
    n('b', 0, 100, 't'),
    n('c', -100, 0, 't'),
    n('d', 0, -100, 't'),
  ]
  const positions = pos([
    ['a', 100, 0],
    ['b', 0, 100],
    ['c', -100, 0],
    ['d', 0, -100],
  ])
  const regions = [{ id: 't', label: 'T', tag: 't', color: '#abcdef' }] as const

  it('regionShape="hull" renderiza <path> (e non <rect>) para a forma', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillRegions
          regions={regions}
          nodePositions={positions}
          nodes={nodes}
          regionShape="hull"
        />
      </svg>,
    )
    const region = container.querySelector('.yf-skill-region')
    expect(region, 'region renderizada').not.toBeNull()
    expect(region?.querySelector('path'), 'path renderizado').not.toBeNull()
    expect(region?.querySelector('rect'), 'sen rect cando shape=hull').toBeNull()
  })

  it('regionShape="box" (explícito) renderiza <rect>, como o default', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillRegions regions={regions} nodePositions={positions} nodes={nodes} regionShape="box" />
      </svg>,
    )
    const region = container.querySelector('.yf-skill-region')
    expect(region?.querySelector('rect')).not.toBeNull()
    expect(region?.querySelector('path')).toBeNull()
  })

  it('default (sen prop regionShape) é box → renderiza <rect>', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillRegions regions={regions} nodePositions={positions} nodes={nodes} />
      </svg>,
    )
    const region = container.querySelector('.yf-skill-region')
    expect(region?.querySelector('rect')).not.toBeNull()
    expect(region?.querySelector('path')).toBeNull()
  })
})
// ── FIN: tests regionShape='hull' ──
