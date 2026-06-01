import { ErrorCode, isErr, isOk } from '@yggdrasil-forge/common'
// ── INICIO: tests de Reconciler ──
import { describe, expect, it } from 'vitest'
import { reconcile } from '../../../src/engine/reconciler/Reconciler.js'
import type { ReconcileOptions } from '../../../src/engine/reconciler/Reconciler.js'
import type { NodeInstance } from '../../../src/types/node.js'
import type { TreeDef } from '../../../src/types/tree.js'
import type { TreeState } from '../../../src/types/tree.js'

// ── Helpers ──
const DEFAULT_OPTIONS: ReconcileOptions = {
  refundRemovedNodes: false,
  grandfatherIncreasedCosts: false,
  refundDecreasedCosts: false,
  invalidateOnPrereqFailure: 'disable',
}

function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'tree-1',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Test Tree',
    nodes: [],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

function makeNodeInstance(id: string, state: NodeInstance['state'] = 'locked'): NodeInstance {
  return { id, state, currentTier: state === 'unlocked' ? 1 : 0 }
}

function makeTreeState(
  nodes: Record<string, NodeInstance>,
  resources: Record<string, number> = {},
): TreeState {
  return { nodes, budget: { resources } }
}

describe('Reconciler — operacións básicas', () => {
  it('TreeDef sen cambios: cero cambios, TreeState intacto', () => {
    const treeDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') })
    const result = reconcile(treeDef, treeDef, state, DEFAULT_OPTIONS)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([])
      expect(result.value.newTreeState.nodes.a).toBeDefined()
    }
  })

  it('nodo eliminado locked: emite node_removed wasUnlocked=false, cero refund', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    const newDef = makeTreeDef({ nodes: [] })
    const state = makeTreeState({ a: makeNodeInstance('a', 'locked') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundRemovedNodes: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([
        { type: 'node_removed', nodeId: 'a', wasUnlocked: false },
      ])
      expect(result.value.newTreeState.nodes.a).toBeUndefined()
    }
  })

  it('nodo eliminado unlocked + refundRemovedNodes=true: refund ao budget', () => {
    const oldDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [{ resourceId: 'xp', amount: 10 }],
        },
      ],
    })
    const newDef = makeTreeDef({ nodes: [] })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 5 })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundRemovedNodes: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([
        { type: 'node_removed', nodeId: 'a', wasUnlocked: true },
        { type: 'cost_refunded', nodeId: 'a', resourceId: 'xp', amount: 10 },
      ])
      expect(result.value.newTreeState.budget.resources.xp).toBe(15)
    }
  })

  it('nodo eliminado unlocked + refundRemovedNodes=false: cero refund', () => {
    const oldDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [{ resourceId: 'xp', amount: 10 }],
        },
      ],
    })
    const newDef = makeTreeDef({ nodes: [] })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 5 })
    const result = reconcile(oldDef, newDef, state, DEFAULT_OPTIONS)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([
        { type: 'node_removed', nodeId: 'a', wasUnlocked: true },
      ])
      expect(result.value.newTreeState.budget.resources.xp).toBe(5)
    }
  })

  it('múltiples nodos eliminados procesados', () => {
    const oldDef = makeTreeDef({
      nodes: [
        { id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 5 }] },
        { id: 'b', type: 'skill', label: 'B', cost: [{ resourceId: 'gold', amount: 20 }] },
        { id: 'c', type: 'skill', label: 'C' },
      ],
    })
    const newDef = makeTreeDef({ nodes: [{ id: 'c', type: 'skill', label: 'C' }] })
    const state = makeTreeState(
      {
        a: makeNodeInstance('a', 'unlocked'),
        b: makeNodeInstance('b', 'unlocked'),
        c: makeNodeInstance('c', 'locked'),
      },
      { xp: 0, gold: 10 },
    )
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundRemovedNodes: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.newTreeState.budget.resources.xp).toBe(5)
      expect(result.value.newTreeState.budget.resources.gold).toBe(30)
      expect(result.value.newTreeState.nodes.a).toBeUndefined()
      expect(result.value.newTreeState.nodes.b).toBeUndefined()
      expect(result.value.newTreeState.nodes.c).toBeDefined()
    }
  })
})

describe('Reconciler — validacións', () => {
  it('id distinto: err(RECONCILE_TREE_MISMATCH)', () => {
    const oldDef = makeTreeDef({ id: 'tree-A' })
    const newDef = makeTreeDef({ id: 'tree-B' })
    const state = makeTreeState({})
    const result = reconcile(oldDef, newDef, state, DEFAULT_OPTIONS)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.RECONCILE_TREE_MISMATCH)
    }
  })

  it('locale es propaga á mensaxe de erro', () => {
    const oldDef = makeTreeDef({ id: 'tree-A' })
    const newDef = makeTreeDef({ id: 'tree-B' })
    const result = reconcile(oldDef, newDef, makeTreeState({}), DEFAULT_OPTIONS, 'es')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.message).toContain('reconciliar')
    }
  })
})

describe('Reconciler — edge cases', () => {
  it('nodo en oldTreeState pero non en oldTreeDef: ignora defensivamente', () => {
    const oldDef = makeTreeDef({ nodes: [] })
    const newDef = makeTreeDef({ nodes: [] })
    const state = makeTreeState({ phantom: makeNodeInstance('phantom', 'unlocked') })
    const result = reconcile(oldDef, newDef, state, DEFAULT_OPTIONS)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      // O nodo phantom non aparece nos cambios (non foi eliminado de oldTreeDef)
      expect(result.value.changes).toEqual([])
    }
  })

  it('nodo eliminado con múltiples recursos: un cost_refunded por recurso', () => {
    const oldDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [
            { resourceId: 'xp', amount: 10 },
            { resourceId: 'gold', amount: 50 },
          ],
        },
      ],
    })
    const newDef = makeTreeDef({ nodes: [] })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 0, gold: 0 })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundRemovedNodes: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const refunds = result.value.changes.filter((c) => c.type === 'cost_refunded')
      expect(refunds).toHaveLength(2)
      expect(result.value.newTreeState.budget.resources.xp).toBe(10)
      expect(result.value.newTreeState.budget.resources.gold).toBe(50)
    }
  })

  it('nodo eliminado con cost=[] (sen custos): node_removed pero cero refund', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [] }],
    })
    const newDef = makeTreeDef({ nodes: [] })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundRemovedNodes: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([
        { type: 'node_removed', nodeId: 'a', wasUnlocked: true },
      ])
    }
  })

  it('nodo eliminado sen cost (undefined): node_removed pero cero refund', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    const newDef = makeTreeDef({ nodes: [] })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundRemovedNodes: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([
        { type: 'node_removed', nodeId: 'a', wasUnlocked: true },
      ])
    }
  })

  it('recurso non existente no budget trata como 0 + refund', () => {
    const oldDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [{ resourceId: 'newRes', amount: 42 }],
        },
      ],
    })
    const newDef = makeTreeDef({ nodes: [] })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, {})
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundRemovedNodes: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.newTreeState.budget.resources.newRes).toBe(42)
    }
  })

  it('nodo maxed tráctase como unlocked para refund', () => {
    const oldDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [{ resourceId: 'xp', amount: 5 }],
        },
      ],
    })
    const newDef = makeTreeDef({ nodes: [] })
    const state = makeTreeState({ a: makeNodeInstance('a', 'maxed') }, { xp: 0 })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundRemovedNodes: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes[0]).toEqual({
        type: 'node_removed',
        nodeId: 'a',
        wasUnlocked: true,
      })
      expect(result.value.newTreeState.budget.resources.xp).toBe(5)
    }
  })

  it('nodo eliminado non existente no TreeState: ignora defensivamente', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    const newDef = makeTreeDef({ nodes: [] })
    const state = makeTreeState({})
    const result = reconcile(oldDef, newDef, state, DEFAULT_OPTIONS)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([])
    }
  })
})

describe('Reconciler — inmutabilidade', () => {
  it('oldTreeState non se modifica', () => {
    const oldDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [{ resourceId: 'xp', amount: 10 }],
        },
      ],
    })
    const newDef = makeTreeDef({ nodes: [] })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 5 })
    const snapshot = JSON.stringify(state)
    reconcile(oldDef, newDef, state, { ...DEFAULT_OPTIONS, refundRemovedNodes: true })
    expect(JSON.stringify(state)).toBe(snapshot)
  })

  it('oldTreeDef non se modifica', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    const snapshot = JSON.stringify(oldDef)
    reconcile(oldDef, makeTreeDef({ nodes: [] }), makeTreeState({}), DEFAULT_OPTIONS)
    expect(JSON.stringify(oldDef)).toBe(snapshot)
  })

  it('newTreeDef non se modifica', () => {
    const newDef = makeTreeDef({ nodes: [] })
    const snapshot = JSON.stringify(newDef)
    reconcile(
      makeTreeDef({ nodes: [{ id: 'a', type: 'skill', label: 'A' }] }),
      newDef,
      makeTreeState({}),
      DEFAULT_OPTIONS,
    )
    expect(JSON.stringify(newDef)).toBe(snapshot)
  })
})

describe('Reconciler — opcións agora implementadas (3.6.b)', () => {
  it('grandfatherIncreasedCosts=true con cost subido: emite cost_grandfathered', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 20 }] }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 0 })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      grandfatherIncreasedCosts: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([
        { type: 'cost_grandfathered', nodeId: 'a', resourceId: 'xp', oldAmount: 10, newAmount: 20 },
      ])
    }
  })

  it('refundDecreasedCosts=true con cost baixado: emite cost_decreased_refunded + refund', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 20 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 0 })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundDecreasedCosts: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([
        {
          type: 'cost_decreased_refunded',
          nodeId: 'a',
          resourceId: 'xp',
          oldAmount: 20,
          newAmount: 10,
          refundAmount: 10,
        },
      ])
      expect(result.value.newTreeState.budget.resources.xp).toBe(10)
    }
  })

  it('invalidateOnPrereqFailure=refund con prereq roto: pasa a locked + refund', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 5 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [{ resourceId: 'xp', amount: 5 }],
          prerequisites: { type: 'node_unlocked', nodeId: 'b' },
        },
      ],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 0 })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      invalidateOnPrereqFailure: 'refund',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.newTreeState.nodes.a.state).toBe('locked')
      const prereqChange = result.value.changes.find((c) => c.type === 'prereq_failure_refunded')
      expect(prereqChange).toBeDefined()
      expect(result.value.newTreeState.budget.resources.xp).toBe(5)
    }
  })
})

// ── 3.6.b tests novos ──

describe('Reconciler — grandfatherIncreasedCosts', () => {
  it('custo subido + grandfather=false: cero evento', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 20 }] }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 0 })
    const result = reconcile(oldDef, newDef, state, DEFAULT_OPTIONS)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([])
    }
  })

  it('custo subido + nodo locked: cero acción', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 20 }] }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'locked') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      grandfatherIncreasedCosts: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([])
    }
  })

  it('custo igual + grandfather=true: cero evento', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const result = reconcile(
      oldDef,
      oldDef,
      makeTreeState({ a: makeNodeInstance('a', 'unlocked') }),
      {
        ...DEFAULT_OPTIONS,
        grandfatherIncreasedCosts: true,
      },
    )
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([])
    }
  })

  it('múltiples recursos subidos: un evento por recurso', () => {
    const oldDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [
            { resourceId: 'xp', amount: 10 },
            { resourceId: 'gold', amount: 5 },
          ],
        },
      ],
    })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [
            { resourceId: 'xp', amount: 20 },
            { resourceId: 'gold', amount: 15 },
          ],
        },
      ],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      grandfatherIncreasedCosts: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const gf = result.value.changes.filter((c) => c.type === 'cost_grandfathered')
      expect(gf).toHaveLength(2)
    }
  })

  it('nodo maxed tamén procesado', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 20 }] }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'maxed') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      grandfatherIncreasedCosts: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes[0]?.type).toBe('cost_grandfathered')
    }
  })

  it('cero refund de budget (grandfather é só auditoría)', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 20 }] }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 5 })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      grandfatherIncreasedCosts: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.newTreeState.budget.resources.xp).toBe(5)
    }
  })

  it('recurso novo (non en old) tráctase como subido desde 0', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [] }],
    })
    const newDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      grandfatherIncreasedCosts: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([
        { type: 'cost_grandfathered', nodeId: 'a', resourceId: 'xp', oldAmount: 0, newAmount: 10 },
      ])
    }
  })
})

describe('Reconciler — refundDecreasedCosts', () => {
  it('custo baixado + refund=false: cero evento', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 20 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 0 })
    const result = reconcile(oldDef, newDef, state, DEFAULT_OPTIONS)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([])
    }
  })

  it('custo baixado + nodo locked: cero acción', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 20 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'locked') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundDecreasedCosts: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([])
    }
  })

  it('custo igual + refund=true: cero evento', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const result = reconcile(
      oldDef,
      oldDef,
      makeTreeState({ a: makeNodeInstance('a', 'unlocked') }),
      {
        ...DEFAULT_OPTIONS,
        refundDecreasedCosts: true,
      },
    )
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([])
    }
  })

  it('múltiples recursos baixados: un evento por cada', () => {
    const oldDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [
            { resourceId: 'xp', amount: 20 },
            { resourceId: 'gold', amount: 50 },
          ],
        },
      ],
    })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [
            { resourceId: 'xp', amount: 10 },
            { resourceId: 'gold', amount: 30 },
          ],
        },
      ],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 0, gold: 0 })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundDecreasedCosts: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const dr = result.value.changes.filter((c) => c.type === 'cost_decreased_refunded')
      expect(dr).toHaveLength(2)
      expect(result.value.newTreeState.budget.resources.xp).toBe(10)
      expect(result.value.newTreeState.budget.resources.gold).toBe(20)
    }
  })

  it('refundAmount calculado correctamente', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 100 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 37 }] }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 0 })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundDecreasedCosts: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const change = result.value.changes[0]
      expect(change.type === 'cost_decreased_refunded' && change.refundAmount).toBe(63)
    }
  })

  it('nodo maxed tamén procesado', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 20 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'maxed') }, { xp: 0 })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundDecreasedCosts: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes[0]?.type).toBe('cost_decreased_refunded')
    }
  })

  it('recurso eliminado (non en new) tráctase como baixado a 0', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [] }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 0 })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundDecreasedCosts: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const change = result.value.changes[0]
      expect(change.type === 'cost_decreased_refunded' && change.newAmount).toBe(0)
      expect(result.value.newTreeState.budget.resources.xp).toBe(10)
    }
  })
})

describe('Reconciler — invalidateOnPrereqFailure: disable', () => {
  it('nodo unlocked con prereq quebrado → locked + prereq_failure_disabled', () => {
    const oldDef = makeTreeDef({ nodes: [{ id: 'a', type: 'skill', label: 'A' }] })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          prerequisites: { type: 'node_unlocked', nodeId: 'b' },
        },
      ],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      invalidateOnPrereqFailure: 'disable',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.newTreeState.nodes.a.state).toBe('locked')
      expect(result.value.changes).toEqual([{ type: 'prereq_failure_disabled', nodeId: 'a' }])
    }
  })

  it('nodo unlocked con prereq que cumpre → cero acción', () => {
    const oldDef = makeTreeDef({
      nodes: [
        { id: 'a', type: 'skill', label: 'A' },
        { id: 'b', type: 'skill', label: 'B' },
      ],
    })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          prerequisites: { type: 'node_unlocked', nodeId: 'b' },
        },
        { id: 'b', type: 'skill', label: 'B' },
      ],
    })
    const state = makeTreeState({
      a: makeNodeInstance('a', 'unlocked'),
      b: makeNodeInstance('b', 'unlocked'),
    })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      invalidateOnPrereqFailure: 'disable',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([])
    }
  })

  it('nodo sen prereq en newTreeDef → cero acción', () => {
    const oldDef = makeTreeDef({ nodes: [{ id: 'a', type: 'skill', label: 'A' }] })
    const newDef = makeTreeDef({ nodes: [{ id: 'a', type: 'skill', label: 'A' }] })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      invalidateOnPrereqFailure: 'disable',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([])
    }
  })

  it('nodo locked con prereq non cumpre → cero acción', () => {
    const oldDef = makeTreeDef({ nodes: [{ id: 'a', type: 'skill', label: 'A' }] })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          prerequisites: { type: 'node_unlocked', nodeId: 'b' },
        },
      ],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'locked') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      invalidateOnPrereqFailure: 'disable',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([])
    }
  })
})

describe('Reconciler — invalidateOnPrereqFailure: refund', () => {
  it('refund con múltiples recursos en oldCost', () => {
    const oldDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [
            { resourceId: 'xp', amount: 10 },
            { resourceId: 'gold', amount: 20 },
          ],
        },
      ],
    })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [
            { resourceId: 'xp', amount: 10 },
            { resourceId: 'gold', amount: 20 },
          ],
          prerequisites: { type: 'node_unlocked', nodeId: 'b' },
        },
      ],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 0, gold: 0 })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      invalidateOnPrereqFailure: 'refund',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.newTreeState.nodes.a.state).toBe('locked')
      expect(result.value.newTreeState.budget.resources.xp).toBe(10)
      expect(result.value.newTreeState.budget.resources.gold).toBe(20)
    }
  })

  it('nodo sen oldCost: emite evento con refunds:[]', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          prerequisites: { type: 'node_unlocked', nodeId: 'b' },
        },
      ],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      invalidateOnPrereqFailure: 'refund',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const change = result.value.changes.find((c) => c.type === 'prereq_failure_refunded')
      expect(change).toBeDefined()
      if (change?.type === 'prereq_failure_refunded') {
        expect(change.refunds).toEqual([])
      }
    }
  })
})

describe('Reconciler — invalidateOnPrereqFailure: preserve', () => {
  it('mantén unlocked + emite prereq_failure_preserved', () => {
    const oldDef = makeTreeDef({ nodes: [{ id: 'a', type: 'skill', label: 'A' }] })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          prerequisites: { type: 'node_unlocked', nodeId: 'b' },
        },
      ],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      invalidateOnPrereqFailure: 'preserve',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.newTreeState.nodes.a.state).toBe('unlocked')
      expect(result.value.changes).toEqual([{ type: 'prereq_failure_preserved', nodeId: 'a' }])
    }
  })

  it('cero modificación de budget en preserve', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [{ resourceId: 'xp', amount: 10 }],
          prerequisites: { type: 'node_unlocked', nodeId: 'b' },
        },
      ],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 5 })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      invalidateOnPrereqFailure: 'preserve',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.newTreeState.budget.resources.xp).toBe(5)
    }
  })

  it('múltiples nodos en preserve: todos emiten evento', () => {
    const oldDef = makeTreeDef({
      nodes: [
        { id: 'a', type: 'skill', label: 'A' },
        { id: 'c', type: 'skill', label: 'C' },
      ],
    })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          prerequisites: { type: 'node_unlocked', nodeId: 'b' },
        },
        {
          id: 'c',
          type: 'skill',
          label: 'C',
          prerequisites: { type: 'node_unlocked', nodeId: 'b' },
        },
      ],
    })
    const state = makeTreeState({
      a: makeNodeInstance('a', 'unlocked'),
      c: makeNodeInstance('c', 'unlocked'),
    })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      invalidateOnPrereqFailure: 'preserve',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const preserved = result.value.changes.filter((c) => c.type === 'prereq_failure_preserved')
      expect(preserved).toHaveLength(2)
    }
  })
})

describe('Reconciler — combinación opcións', () => {
  it('custo subido + prereq quebrado + grandfather+disable: ambos eventos', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [{ resourceId: 'xp', amount: 20 }],
          prerequisites: { type: 'node_unlocked', nodeId: 'b' },
        },
      ],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      grandfatherIncreasedCosts: true,
      invalidateOnPrereqFailure: 'disable',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const gf = result.value.changes.filter((c) => c.type === 'cost_grandfathered')
      const pf = result.value.changes.filter((c) => c.type === 'prereq_failure_disabled')
      expect(gf).toHaveLength(1)
      expect(pf).toHaveLength(1)
      expect(result.value.newTreeState.nodes.a.state).toBe('locked')
    }
  })

  it('refunds aplican antes de prereqs (orde 5.7)', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 20 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [{ resourceId: 'xp', amount: 10 }],
          prerequisites: { type: 'node_unlocked', nodeId: 'b' },
        },
      ],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 0 })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundDecreasedCosts: true,
      invalidateOnPrereqFailure: 'disable',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const types = result.value.changes.map((c) => c.type)
      const drIdx = types.indexOf('cost_decreased_refunded')
      const pfIdx = types.indexOf('prereq_failure_disabled')
      expect(drIdx).toBeLessThan(pfIdx)
    }
  })

  it('cero recursividade: invalidar A non re-avalía B (5.10)', () => {
    const oldDef = makeTreeDef({
      nodes: [
        { id: 'a', type: 'skill', label: 'A' },
        { id: 'b', type: 'skill', label: 'B' },
      ],
    })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          prerequisites: { type: 'node_unlocked', nodeId: 'c' },
        },
        {
          id: 'b',
          type: 'skill',
          label: 'B',
          prerequisites: { type: 'node_unlocked', nodeId: 'a' },
        },
      ],
    })
    // a e b están unlocked; c non existe → a falla prereq
    // b depende de a → pero se a se disable, b debería fallar tamén
    // PERO cero recursividade: b avalíase contra o estado onde a AÍN DA está como unlocked
    // no workingNodes (a invalidación de a modifica workingNodes ANTES de avaliar b)
    const state = makeTreeState({
      a: makeNodeInstance('a', 'unlocked'),
      b: makeNodeInstance('b', 'unlocked'),
    })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      invalidateOnPrereqFailure: 'disable',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      // a pasa a locked (prereq c non existe)
      expect(result.value.newTreeState.nodes.a.state).toBe('locked')
      // b: depende de a. a xa está locked no working state → b tamén falla
      expect(result.value.newTreeState.nodes.b.state).toBe('locked')
    }
  })
})

describe('Reconciler — edge cases 3.6.b', () => {
  it('nodos novos en newTreeDef non en oldTreeState: cero acción', () => {
    const oldDef = makeTreeDef({ nodes: [] })
    const newDef = makeTreeDef({
      nodes: [{ id: 'new-node', type: 'skill', label: 'New' }],
    })
    const result = reconcile(oldDef, newDef, makeTreeState({}), {
      ...DEFAULT_OPTIONS,
      grandfatherIncreasedCosts: true,
      refundDecreasedCosts: true,
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([])
    }
  })

  it('todas as opcións a false: cero evento', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 20 }] }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 0 })
    const result = reconcile(oldDef, newDef, state, DEFAULT_OPTIONS)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([])
    }
  })

  it('cero modificación de oldTreeDef/newTreeDef/oldTreeState (función pura)', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [{ resourceId: 'xp', amount: 5 }],
          prerequisites: { type: 'node_unlocked', nodeId: 'b' },
        },
      ],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 0 })
    const snapOld = JSON.stringify(oldDef)
    const snapNew = JSON.stringify(newDef)
    const snapState = JSON.stringify(state)
    reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      refundDecreasedCosts: true,
      invalidateOnPrereqFailure: 'refund',
    })
    expect(JSON.stringify(oldDef)).toBe(snapOld)
    expect(JSON.stringify(newDef)).toBe(snapNew)
    expect(JSON.stringify(state)).toBe(snapState)
  })

  it('integración 3.6.a + 3.6.b: eliminado + subido + baixado + prereq nun reconcile', () => {
    const oldDef = makeTreeDef({
      nodes: [
        { id: 'removed', type: 'skill', label: 'R', cost: [{ resourceId: 'xp', amount: 5 }] },
        { id: 'raised', type: 'skill', label: 'Raised', cost: [{ resourceId: 'xp', amount: 10 }] },
        {
          id: 'lowered',
          type: 'skill',
          label: 'Lowered',
          cost: [{ resourceId: 'gold', amount: 50 }],
        },
        { id: 'prereqd', type: 'skill', label: 'Prereq', cost: [{ resourceId: 'xp', amount: 3 }] },
      ],
    })
    const newDef = makeTreeDef({
      nodes: [
        { id: 'raised', type: 'skill', label: 'Raised', cost: [{ resourceId: 'xp', amount: 20 }] },
        {
          id: 'lowered',
          type: 'skill',
          label: 'Lowered',
          cost: [{ resourceId: 'gold', amount: 30 }],
        },
        {
          id: 'prereqd',
          type: 'skill',
          label: 'Prereq',
          cost: [{ resourceId: 'xp', amount: 3 }],
          prerequisites: { type: 'node_unlocked', nodeId: 'missing' },
        },
      ],
    })
    const state = makeTreeState(
      {
        removed: makeNodeInstance('removed', 'unlocked'),
        raised: makeNodeInstance('raised', 'unlocked'),
        lowered: makeNodeInstance('lowered', 'unlocked'),
        prereqd: makeNodeInstance('prereqd', 'unlocked'),
      },
      { xp: 0, gold: 0 },
    )
    const result = reconcile(oldDef, newDef, state, {
      refundRemovedNodes: true,
      grandfatherIncreasedCosts: true,
      refundDecreasedCosts: true,
      invalidateOnPrereqFailure: 'refund',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const types = result.value.changes.map((c) => c.type)
      expect(types).toContain('node_removed')
      expect(types).toContain('cost_refunded')
      expect(types).toContain('cost_grandfathered')
      expect(types).toContain('cost_decreased_refunded')
      expect(types).toContain('prereq_failure_refunded')
      // Budget: +5 (removed refund) +20 (lowered: 50-30) +3 (prereqd refund)
      expect(result.value.newTreeState.budget.resources.xp).toBe(8)
      expect(result.value.newTreeState.budget.resources.gold).toBe(20)
    }
  })

  it('determinismo: dúas chamadas idénticas producen mesma saída', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 20 }] }],
    })
    const newDef = makeTreeDef({
      nodes: [
        {
          id: 'a',
          type: 'skill',
          label: 'A',
          cost: [{ resourceId: 'xp', amount: 10 }],
          prerequisites: { type: 'node_unlocked', nodeId: 'b' },
        },
      ],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 0 })
    const opts: ReconcileOptions = {
      ...DEFAULT_OPTIONS,
      refundDecreasedCosts: true,
      invalidateOnPrereqFailure: 'disable',
    }
    const r1 = reconcile(oldDef, newDef, state, opts)
    const r2 = reconcile(oldDef, newDef, state, opts)
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2))
  })
})

describe('Reconciler — determinismo', () => {
  it('dúas chamadas idénticas producen exactamente o mesmo resultado', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', cost: [{ resourceId: 'xp', amount: 10 }] }],
    })
    const newDef = makeTreeDef({ nodes: [] })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') }, { xp: 5 })
    const opts = { ...DEFAULT_OPTIONS, refundRemovedNodes: true }
    const r1 = reconcile(oldDef, newDef, state, opts)
    const r2 = reconcile(oldDef, newDef, state, opts)
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2))
  })
})
// ── FIN: tests de Reconciler ──
