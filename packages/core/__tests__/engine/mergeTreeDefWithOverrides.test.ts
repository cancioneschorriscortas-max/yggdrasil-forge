import { describe, expect, it } from 'vitest'
import { mergeTreeDefWithOverrides } from '../../src/engine/mergeTreeDefWithOverrides.js'
import type { TreeDef } from '../../src/types/tree.js'

/** Helper: TreeDef base mínimo para tests. */
function makeBase(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'base-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Base Tree',
    nodes: [{ id: 'n1', type: 'skill', label: 'Nodo 1' }],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

describe('mergeTreeDefWithOverrides', () => {
  it('overrides vacíos: devolve base inalterado (deep equal)', () => {
    const base = makeBase()
    const result = mergeTreeDefWithOverrides(base, {})
    expect(result).toEqual(base)
  })

  it('overrides con name (label): label substituído', () => {
    const base = makeBase()
    const result = mergeTreeDefWithOverrides(base, { label: 'Novo Nome' })
    expect(result.label).toBe('Novo Nome')
    expect(result.id).toBe('base-tree')
  })

  it('overrides con nodes: nodes substituído completamente', () => {
    const base = makeBase()
    const newNodes = [{ id: 'n2', type: 'skill' as const, label: 'Nodo 2' }]
    const result = mergeTreeDefWithOverrides(base, { nodes: newNodes })
    expect(result.nodes).toEqual(newNodes)
    expect(result.nodes).not.toEqual(base.nodes)
  })

  it('overrides con edges: edges substituído completamente', () => {
    const base = makeBase({
      edges: [{ source: 'n1', target: 'n2' }],
    })
    const newEdges = [{ source: 'n3', target: 'n4' }]
    const result = mergeTreeDefWithOverrides(base, { edges: newEdges })
    expect(result.edges).toEqual(newEdges)
  })

  it('overrides con layout: layout substituído', () => {
    const base = makeBase()
    const result = mergeTreeDefWithOverrides(base, {
      layout: { type: 'tree' },
    })
    expect(result.layout).toEqual({ type: 'tree' })
  })

  it('overrides con startingBudget: budget substituído', () => {
    const base = makeBase({ startingBudget: { resources: { xp: 100 } } })
    const result = mergeTreeDefWithOverrides(base, {
      startingBudget: { resources: { gold: 50 } },
    })
    expect(result.startingBudget).toEqual({ resources: { gold: 50 } })
  })

  it('overrides con metadata: metadata substituído', () => {
    const base = makeBase({ metadata: { nivel: 1 } })
    const result = mergeTreeDefWithOverrides(base, {
      metadata: { nivel: 5, dificultade: 'alta' },
    })
    expect(result.metadata).toEqual({ nivel: 5, dificultade: 'alta' })
  })

  it('overrides con id: id NON se sobrescribe (sempre base.id)', () => {
    const base = makeBase()
    const result = mergeTreeDefWithOverrides(base, {
      id: 'intento-de-cambio',
    })
    expect(result.id).toBe('base-tree')
  })

  it('overrides combinados (nodes + label + layout): todos aplicados', () => {
    const base = makeBase()
    const newNodes = [{ id: 'n99', type: 'skill' as const, label: 'Combo' }]
    const result = mergeTreeDefWithOverrides(base, {
      nodes: newNodes,
      label: 'Combinado',
      layout: { type: 'tree' },
    })
    expect(result.nodes).toEqual(newNodes)
    expect(result.label).toBe('Combinado')
    expect(result.layout).toEqual({ type: 'tree' })
    expect(result.id).toBe('base-tree')
  })

  it('base inalterado (cero mutación)', () => {
    const base = makeBase()
    const baseSnapshot = JSON.parse(JSON.stringify(base))
    mergeTreeDefWithOverrides(base, {
      label: 'Cambiado',
      nodes: [],
    })
    expect(base).toEqual(baseSnapshot)
  })
})
