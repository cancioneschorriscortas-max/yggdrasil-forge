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

describe('Reconciler — opcións non implementadas (3.6.a)', () => {
  it('grandfatherIncreasedCosts=true con cost subido: cero efecto aínda', () => {
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
      // Cero cambios emitidos (nodo non eliminado; grandfather non implementado)
      expect(result.value.changes).toEqual([])
    }
  })

  it('refundDecreasedCosts=true con cost baixado: cero efecto aínda', () => {
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
      expect(result.value.changes).toEqual([])
    }
  })

  it('invalidateOnPrereqFailure=refund con prereq roto: cero efecto aínda', () => {
    const oldDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    const newDef = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', prerequisites: ['b'] }],
    })
    const state = makeTreeState({ a: makeNodeInstance('a', 'unlocked') })
    const result = reconcile(oldDef, newDef, state, {
      ...DEFAULT_OPTIONS,
      invalidateOnPrereqFailure: 'refund',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.changes).toEqual([])
    }
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
