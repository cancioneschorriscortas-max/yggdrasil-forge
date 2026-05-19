// ── INICIO: tests de subscrición selectiva de TreeEngine (1.15) ──
import { describe, expect, it, vi } from 'vitest'
import { TreeEngine, createSelector, shallowEqual } from '../../src/engine/index.js'
import type { NodeDef, TreeDef } from '../../src/types/index.js'

// ── Helpers ──

function makeNode(id: string, overrides?: Partial<NodeDef>): NodeDef {
  return {
    id,
    label: id,
    type: 'passive',
    ...overrides,
  }
}

function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Test Tree',
    nodes: [],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

/** Árbore con nodos sen custo: unlock cambia `nodes` pero NON `budget`. */
function makeFreeTree(): TreeDef {
  return makeTreeDef({
    startingBudget: { resources: { xp: 100 } },
    resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
    nodes: [makeNode('a'), makeNode('b')],
  })
}

/** Árbore con nodo con custo: unlock cambia `nodes` E `budget`. */
function makeCostTree(): TreeDef {
  return makeTreeDef({
    startingBudget: { resources: { xp: 10 } },
    resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
    nodes: [makeNode('cheap', { cost: [{ resourceId: 'xp', amount: 5 }] })],
  })
}

// ── select ──

describe('TreeEngine.select', () => {
  it('aplica o selector ao estado actual', () => {
    const engine = new TreeEngine(makeFreeTree())
    expect(engine.select((s) => s.budget.resources.xp)).toBe(100)
  })

  it('reflicte cambios despois dun unlock', async () => {
    const engine = new TreeEngine(makeFreeTree())
    expect(engine.select((s) => s.nodes.a?.state)).toBeUndefined()
    await engine.unlock('a')
    expect(engine.select((s) => s.nodes.a?.state)).toBe('unlocked')
  })

  it('funciona combinado cun selector memoizado de createSelector', async () => {
    const engine = new TreeEngine(makeFreeTree())
    const selectUnlocked = createSelector(
      (s: ReturnType<typeof engine.getSnapshot>) => s.nodes,
      (nodes) => Object.values(nodes).filter((n) => n.state === 'unlocked'),
    )
    expect(engine.select(selectUnlocked)).toHaveLength(0)
    await engine.unlock('a')
    expect(engine.select(selectUnlocked)).toHaveLength(1)
  })

  it('propaga a excepción dun selector que peta (NON a captura)', () => {
    const engine = new TreeEngine(makeFreeTree())
    expect(() =>
      engine.select(() => {
        throw new Error('bug do consumidor')
      }),
    ).toThrow('bug do consumidor')
  })
})

// ── subscribeWithSelector ──

describe('TreeEngine.subscribeWithSelector', () => {
  it('NON notifica se o valor seleccionado non cambia tras mutación non relacionada', async () => {
    const engine = new TreeEngine(makeFreeTree())
    const listener = vi.fn()
    // Selecciona budget; desbloquear un nodo sen custo NON toca budget.
    const unsub = engine.subscribeWithSelector((s) => s.budget.resources.xp, listener)
    await engine.unlock('a')
    expect(listener).not.toHaveBeenCalled()
    unsub()
  })

  it('SI notifica cando o valor seleccionado cambia', async () => {
    const engine = new TreeEngine(makeCostTree())
    const listener = vi.fn()
    const unsub = engine.subscribeWithSelector((s) => s.budget.resources.xp, listener)
    await engine.unlock('cheap')
    expect(listener).toHaveBeenCalledTimes(1)
    unsub()
  })

  it('pasa (selected, previous) correctos ao listener', async () => {
    const engine = new TreeEngine(makeCostTree())
    const listener = vi.fn()
    const unsub = engine.subscribeWithSelector((s) => s.budget.resources.xp, listener)
    await engine.unlock('cheap')
    expect(listener).toHaveBeenCalledWith(5, 10)
    unsub()
  })

  it('fireImmediately chama o listener unha vez co valor actual (current, current)', () => {
    const engine = new TreeEngine(makeFreeTree())
    const listener = vi.fn()
    const unsub = engine.subscribeWithSelector((s) => s.budget.resources.xp, listener, {
      fireImmediately: true,
    })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(100, 100)
    unsub()
  })

  it('NON dispara inmediatamente se fireImmediately é false (default)', () => {
    const engine = new TreeEngine(makeFreeTree())
    const listener = vi.fn()
    const unsub = engine.subscribeWithSelector((s) => s.budget.resources.xp, listener)
    expect(listener).not.toHaveBeenCalled()
    unsub()
  })

  it('respecta unha equalityFn custom (shallow sobre array)', async () => {
    const engine = new TreeEngine(makeFreeTree())
    const listener = vi.fn()
    // Selector que devolve sempre un array novo coas claves de nodos.
    const unsub = engine.subscribeWithSelector((s) => Object.keys(s.nodes), listener, {
      equalityFn: shallowEqual,
    })
    // unlock('a') engade 'a' a nodes → array distinto → notifica.
    await engine.unlock('a')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(['a'], [])
    unsub()
  })

  it('con Object.is por defecto, un selector que devolve array novo SEMPRE notifica', async () => {
    const engine = new TreeEngine(makeCostTree())
    const listener = vi.fn()
    const unsub = engine.subscribeWithSelector((s) => Object.keys(s.nodes), listener)
    await engine.unlock('cheap')
    expect(listener).toHaveBeenCalledTimes(1)
    unsub()
  })

  it('unsubscribe deixa de notificar', async () => {
    const engine = new TreeEngine(makeCostTree())
    const listener = vi.fn()
    const unsub = engine.subscribeWithSelector((s) => s.budget.resources.xp, listener)
    unsub()
    await engine.unlock('cheap')
    expect(listener).not.toHaveBeenCalled()
  })

  it('encadea correctamente varias notificacións con previous actualizado', async () => {
    const engine = new TreeEngine(
      makeTreeDef({
        startingBudget: { resources: { xp: 100 } },
        resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
        nodes: [
          makeNode('n1', { cost: [{ resourceId: 'xp', amount: 10 }] }),
          makeNode('n2', { cost: [{ resourceId: 'xp', amount: 20 }] }),
        ],
      }),
    )
    const calls: Array<[number, number]> = []
    const unsub = engine.subscribeWithSelector(
      (s) => s.budget.resources.xp,
      (sel, prev) => {
        calls.push([sel, prev])
      },
    )
    await engine.unlock('n1')
    await engine.unlock('n2')
    expect(calls).toEqual([
      [90, 100],
      [70, 90],
    ])
    unsub()
  })
})

// ── Estabilidade de getSnapshot ──

describe('TreeEngine.getSnapshot — estabilidade', () => {
  it('devolve a mesma referencia entre chamadas sen mutación', () => {
    const engine = new TreeEngine(makeFreeTree())
    const a = engine.getSnapshot()
    const b = engine.getSnapshot()
    expect(b).toBe(a)
  })

  it('devolve unha referencia distinta despois dunha mutación', async () => {
    const engine = new TreeEngine(makeCostTree())
    const before = engine.getSnapshot()
    await engine.unlock('cheap')
    const after = engine.getSnapshot()
    expect(after).not.toBe(before)
  })
})
// ── FIN: tests de subscrición selectiva de TreeEngine ──
