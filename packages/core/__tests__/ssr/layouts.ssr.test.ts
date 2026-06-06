import { describe, expect, it } from 'vitest'
import { computeBounds } from '../../src/engine/layouts/BoundsCalculator.js'
import {
  IdentityLayout,
  LayoutEngineRegistry,
  QuadTree,
  RadialLayout,
  TreeLayout,
  buildPaths,
  computeLayout,
} from '../../src/index.js'
import { createSimpleTreeDef } from './_helpers.js'

describe('SSR: Layout Engine completo en Node sen DOM', () => {
  it('importa todas as pezas sen crash', () => {
    expect(LayoutEngineRegistry).toBeDefined()
    expect(IdentityLayout).toBeDefined()
    expect(RadialLayout).toBeDefined()
    expect(TreeLayout).toBeDefined()
    expect(computeLayout).toBeDefined()
    expect(buildPaths).toBeDefined()
    expect(computeBounds).toBeDefined()
    expect(QuadTree).toBeDefined()
  })

  it('IdentityLayout: compute en Node devolve LayoutResult correcto', () => {
    const treeDef = createSimpleTreeDef('custom')
    const engine = new IdentityLayout()
    const result = engine.compute(treeDef)
    expect(result.ok).toBe(true)
  })

  it('RadialLayout: compute en Node devolve LayoutResult correcto', () => {
    const treeDef = createSimpleTreeDef('radial', { radius: 100 })
    const engine = new RadialLayout()
    const result = engine.compute(treeDef)
    expect(result.ok).toBe(true)
  })

  it('TreeLayout: Buchheim en Node devolve LayoutResult correcto', () => {
    const treeDef = createSimpleTreeDef('tree')
    const engine = new TreeLayout()
    const result = engine.compute(treeDef)
    expect(result.ok).toBe(true)
  })

  it('computeLayout via registry en Node', () => {
    const registry = new LayoutEngineRegistry().register(new IdentityLayout())
    const treeDef = createSimpleTreeDef('custom')
    const result = computeLayout(treeDef, registry)
    expect(result.ok).toBe(true)
  })

  it('buildPaths cos 5 estilos en Node', () => {
    const engine = new IdentityLayout()
    const treeDef = createSimpleTreeDef('custom')
    const layoutResult = engine.compute(treeDef)
    if (!layoutResult.ok) throw new Error('layout failed')

    for (const style of [
      'straight',
      'diagonal-vertical',
      'diagonal-horizontal',
      'radial',
      'orthogonal',
    ] as const) {
      const result = buildPaths(layoutResult.value, style)
      expect(result.edges.size).toBeGreaterThanOrEqual(0)
    }
  })

  it('computeBounds en Node', () => {
    const engine = new IdentityLayout()
    const treeDef = createSimpleTreeDef('custom')
    const layoutResult = engine.compute(treeDef)
    if (!layoutResult.ok) throw new Error('layout failed')

    const bounds = computeBounds(layoutResult.value, { padding: 10 })
    expect(bounds).toBeDefined()
    expect(typeof bounds.minX).toBe('number')
  })

  it('QuadTree en Node con range/nearest queries', () => {
    const engine = new IdentityLayout()
    const treeDef = createSimpleTreeDef('custom')
    const layoutResult = engine.compute(treeDef)
    if (!layoutResult.ok) throw new Error('layout failed')

    const quad = QuadTree.fromLayoutResult(layoutResult.value)
    expect(quad.size()).toBeGreaterThanOrEqual(0)

    const inRange = quad.queryRange({
      minX: -1000,
      minY: -1000,
      maxX: 1000,
      maxY: 1000,
    })
    expect(Array.isArray(inRange)).toBe(true)

    const nearest = quad.queryNearest({ x: 0, y: 0 })
    expect(typeof nearest === 'string' || nearest === undefined).toBe(true)
  })
})
