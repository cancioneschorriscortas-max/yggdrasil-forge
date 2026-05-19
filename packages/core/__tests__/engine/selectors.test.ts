// ── INICIO: tests de selectors (1.15) ──
import { describe, expect, it, vi } from 'vitest'
import { createSelector, shallowEqual } from '../../src/engine/index.js'
import type { TreeState } from '../../src/types/index.js'

/** Helper: TreeState mínimo. */
function makeState(overrides?: Partial<TreeState>): TreeState {
  return {
    nodes: {},
    budget: { resources: { xp: 100 } },
    computedStats: {},
    metadata: {},
    ...overrides,
  }
}

describe('createSelector', () => {
  it('aplica o combinador e devolve o resultado derivado', () => {
    const selectXp = createSelector(
      (s: TreeState) => s.budget.resources.xp,
      (xp) => xp * 2,
    )
    expect(selectXp(makeState())).toBe(200)
  })

  it('NON recomputa cando as entradas non cambian (mesma referencia)', () => {
    const combiner = vi.fn((nodes: TreeState['nodes']) => Object.keys(nodes))
    const selectNodeIds = createSelector((s: TreeState) => s.nodes, combiner)

    const state = makeState({ nodes: { a: { id: 'a', state: 'locked' } } })
    selectNodeIds(state)
    selectNodeIds(state)
    selectNodeIds(state)

    expect(combiner).toHaveBeenCalledTimes(1)
  })

  it('recomputa cando cambia a referencia dunha entrada', () => {
    const combiner = vi.fn((nodes: TreeState['nodes']) => Object.keys(nodes))
    const selectNodeIds = createSelector((s: TreeState) => s.nodes, combiner)

    selectNodeIds(makeState({ nodes: { a: { id: 'a', state: 'locked' } } }))
    selectNodeIds(makeState({ nodes: { b: { id: 'b', state: 'locked' } } }))

    expect(combiner).toHaveBeenCalledTimes(2)
  })

  it('devolve o MESMO resultado cacheado (igualdade referencial) se non cambian entradas', () => {
    const selectNodeIds = createSelector(
      (s: TreeState) => s.nodes,
      (nodes) => Object.keys(nodes),
    )
    const state = makeState({ nodes: { a: { id: 'a', state: 'locked' } } })
    const first = selectNodeIds(state)
    const second = selectNodeIds(state)
    expect(second).toBe(first)
  })

  it('soporta varias entradas; recomputa só se cambia algunha (cambio dunha de varias)', () => {
    const combiner = vi.fn(
      (nodes: TreeState['nodes'], xp: number) => `${Object.keys(nodes).length}:${xp}`,
    )
    const sel = createSelector(
      (s: TreeState) => s.nodes,
      (s: TreeState) => s.budget.resources.xp,
      combiner,
    )

    const nodes = { a: { id: 'a', state: 'locked' as const } }
    const s1 = makeState({ nodes, budget: { resources: { xp: 100 } } })
    sel(s1)
    sel(s1)
    expect(combiner).toHaveBeenCalledTimes(1)

    // Cambia só unha das dúas entradas (xp), nodes mantén referencia.
    const s2 = makeState({ nodes, budget: { resources: { xp: 50 } } })
    expect(sel(s2)).toBe('1:50')
    expect(combiner).toHaveBeenCalledTimes(2)
  })

  it('soporta tres entradas', () => {
    const sel = createSelector(
      (s: TreeState) => s.budget.resources.xp,
      (s: TreeState) => Object.keys(s.nodes).length,
      (s: TreeState) => s.metadata,
      (xp, count, meta) => ({ xp, count, hasMeta: meta !== undefined }),
    )
    const result = sel(makeState({ nodes: { a: { id: 'a', state: 'locked' } } }))
    expect(result).toEqual({ xp: 100, count: 1, hasMeta: true })
  })
})

describe('shallowEqual', () => {
  it('true para primitivas idénticas', () => {
    expect(shallowEqual(1, 1)).toBe(true)
    expect(shallowEqual('a', 'a')).toBe(true)
    expect(shallowEqual(null, null)).toBe(true)
  })

  it('true para a mesma referencia', () => {
    const obj = { x: 1 }
    expect(shallowEqual(obj, obj)).toBe(true)
  })

  it('true para obxectos con mesmas claves e valores (un nivel)', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
  })

  it('true para arrays con mesmos elementos', () => {
    expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true)
  })

  it('false se difire un valor', () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false)
  })

  it('false se difire o número de claves', () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })

  it('false se ten igual número de claves pero distintas', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false)
  })

  it('false NON é recursivo (obxectos aniñados distintos por referencia)', () => {
    expect(shallowEqual({ a: { x: 1 } }, { a: { x: 1 } })).toBe(false)
  })

  it('false comparando obxecto con primitiva', () => {
    expect(shallowEqual({ a: 1 }, null)).toBe(false)
    expect(shallowEqual(5, { a: 1 })).toBe(false)
  })
})
// ── FIN: tests de selectors ──
