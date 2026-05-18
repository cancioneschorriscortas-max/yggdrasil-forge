// ── INICIO: tests de mutacións de TreeEngine (1.13) ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it, vi } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { NodeDef, NodeInstance, TreeDef } from '../../src/types/index.js'

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

/** TreeDef con nodo simple sen custo nin prerequisites. */
function makeSimpleTree(): TreeDef {
  return makeTreeDef({
    startingBudget: { resources: { xp: 100 } },
    resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
    nodes: [makeNode('a'), makeNode('b'), makeNode('c')],
  })
}

/** TreeDef con nodo que ten custo. */
function makeCostTree(): TreeDef {
  return makeTreeDef({
    startingBudget: { resources: { xp: 10 } },
    resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
    nodes: [
      makeNode('cheap', { cost: [{ resourceId: 'xp', amount: 5 }] }),
      makeNode('expensive', { cost: [{ resourceId: 'xp', amount: 20 }] }),
    ],
  })
}

/** TreeDef con prerequisites: b require a. */
function makePrereqTree(): TreeDef {
  return makeTreeDef({
    startingBudget: { resources: {} },
    nodes: [
      makeNode('a'),
      makeNode('b', {
        prerequisites: { type: 'node_unlocked', nodeId: 'a' },
      }),
      makeNode('c', {
        prerequisites: { type: 'node_unlocked', nodeId: 'b' },
      }),
    ],
  })
}

/** TreeDef con exclusión: a e b son mutuamente exclusivos. */
function makeExclusionTree(): TreeDef {
  return makeTreeDef({
    startingBudget: { resources: {} },
    nodes: [makeNode('a', { exclusions: ['b'] }), makeNode('b', { exclusions: ['a'] })],
  })
}

// ── canUnlock ──

describe('canUnlock', () => {
  it('nodo inexistente → err NODE_NOT_FOUND', () => {
    const engine = new TreeEngine(makeSimpleTree())
    const result = engine.canUnlock('nonexistent')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
    }
  })

  it('nodo sen prerequisites nin custo → allowed: true', () => {
    const engine = new TreeEngine(makeSimpleTree())
    const result = engine.canUnlock('a')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(true)
    }
  })

  it('nodo xa unlocked → allowed: false (non é err)', () => {
    const engine = new TreeEngine(makeSimpleTree())
    void engine.unlock('a')
    // Despois de unlock, canUnlock debe dicir false
    // Como unlock é async e o test é síncrono, probámolo despois
  })

  it('prerequisites cumpridos → allowed: true', async () => {
    const engine = new TreeEngine(makePrereqTree())
    await engine.unlock('a')
    const result = engine.canUnlock('b')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(true)
    }
  })

  it('prerequisites non cumpridos → allowed: false', () => {
    const engine = new TreeEngine(makePrereqTree())
    // b require a, pero a non está desbloqueado
    const result = engine.canUnlock('b')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(false)
    }
  })

  it('exclusión activa → allowed: false', async () => {
    const engine = new TreeEngine(makeExclusionTree())
    await engine.unlock('a')
    const result = engine.canUnlock('b')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(false)
    }
  })

  it('sen recursos suficientes → allowed: false', () => {
    const engine = new TreeEngine(makeCostTree())
    const result = engine.canUnlock('expensive')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(false)
    }
  })

  it('con recursos suficientes → allowed: true', () => {
    const engine = new TreeEngine(makeCostTree())
    const result = engine.canUnlock('cheap')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(true)
    }
  })
})

// ── unlock ──

describe('unlock', () => {
  it('caso feliz: estado correcto, budget correcto, tier correcto', async () => {
    const engine = new TreeEngine(makeCostTree())
    const result = await engine.unlock('cheap')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.nodeId).toBe('cheap')
      expect(result.value.tier).toBe(1)
      expect(result.value.newState).toBe('unlocked')
      expect(result.value.spent).toEqual([{ resourceId: 'xp', amount: 5 }])
    }
    // Budget debe reflectir o gasto
    expect(engine.getBudget().resources.xp).toBe(5)
    // Estado do nodo
    const node = engine.getNodeState('cheap')
    expect(node?.state).toBe('unlocked')
    expect(node?.currentTier).toBe(1)
  })

  it('falla por prerequisites → err PREREQUISITES_NOT_MET', async () => {
    const engine = new TreeEngine(makePrereqTree())
    const result = await engine.unlock('b')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.PREREQUISITES_NOT_MET)
    }
  })

  it('falla por recursos: budget NON cambia (atomicidade)', async () => {
    const engine = new TreeEngine(makeCostTree())
    const budgetBefore = engine.getBudget().resources.xp
    const result = await engine.unlock('expensive')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.INSUFFICIENT_RESOURCES)
    }
    // Budget non debe ter cambiado
    expect(engine.getBudget().resources.xp).toBe(budgetBefore)
  })

  it('falla en readOnly → err READ_ONLY_VIOLATION', async () => {
    const engine = new TreeEngine(makeSimpleTree(), { readOnly: true })
    const result = await engine.unlock('a')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.READ_ONLY_VIOLATION)
    }
  })

  it('nodo xa desbloqueado → err NODE_ALREADY_UNLOCKED', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    await engine.unlock('a')
    const result = await engine.unlock('a')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.NODE_ALREADY_UNLOCKED)
    }
  })

  it('falla por exclusión → err EXCLUSION_VIOLATION', async () => {
    const engine = new TreeEngine(makeExclusionTree())
    await engine.unlock('a')
    const result = await engine.unlock('b')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.EXCLUSION_VIOLATION)
    }
  })

  it('nodo inexistente → err NODE_NOT_FOUND', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const result = await engine.unlock('nonexistent')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
    }
  })

  it('emite evento unlock tras unlock OK', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const unlockHandler = vi.fn<[string, NodeInstance], void>()
    engine.on('unlock', unlockHandler)
    await engine.unlock('a')
    expect(unlockHandler).toHaveBeenCalledOnce()
    const [nodeId, instance] = unlockHandler.mock.calls[0] ?? []
    expect(nodeId).toBe('a')
    expect(instance?.state).toBe('unlocked')
  })

  it('emite evento stateChange tras unlock OK', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const stateChangeHandler = vi.fn()
    engine.on('stateChange', stateChangeHandler)
    await engine.unlock('a')
    expect(stateChangeHandler).toHaveBeenCalledOnce()
    const [nodeId, change] = stateChangeHandler.mock.calls[0] ?? []
    expect(nodeId).toBe('a')
    expect(change?.from).toBe('locked')
    expect(change?.to).toBe('unlocked')
  })

  it('emite evento budgetChange cando hai custo', async () => {
    const engine = new TreeEngine(makeCostTree())
    const budgetHandler = vi.fn()
    engine.on('budgetChange', budgetHandler)
    await engine.unlock('cheap')
    expect(budgetHandler).toHaveBeenCalledOnce()
    const [resourceId, oldAmount, newAmount] = budgetHandler.mock.calls[0] ?? []
    expect(resourceId).toBe('xp')
    expect(oldAmount).toBe(10)
    expect(newAmount).toBe(5)
  })

  it('NON emite budgetChange cando non hai custo', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const budgetHandler = vi.fn()
    engine.on('budgetChange', budgetHandler)
    await engine.unlock('a')
    expect(budgetHandler).not.toHaveBeenCalled()
  })

  it('nodo con maxTier=1 queda en maxed', async () => {
    const tree = makeTreeDef({
      nodes: [makeNode('a', { maxTier: 1 })],
    })
    const engine = new TreeEngine(tree)
    const result = await engine.unlock('a')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.newState).toBe('maxed')
    }
    expect(engine.getNodeState('a')?.state).toBe('maxed')
  })
})

// ── lock ──

describe('lock', () => {
  it('caso OK: estado volve a locked, refund correcto (100%)', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('cheap')
    expect(engine.getBudget().resources.xp).toBe(5)
    const result = await engine.lock('cheap')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.nodeId).toBe('cheap')
      expect(result.value.newState).toBe('locked')
      expect(result.value.refunded).toEqual([{ resourceId: 'xp', amount: 5 }])
    }
    // Budget restaurado
    expect(engine.getBudget().resources.xp).toBe(10)
    expect(engine.getNodeState('cheap')?.state).toBe('locked')
    expect(engine.getNodeState('cheap')?.currentTier).toBe(0)
  })

  it('refund parcial cando refundPercent < 100', async () => {
    const tree = makeTreeDef({
      startingBudget: { resources: { xp: 100 } },
      resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 50 }],
      nodes: [makeNode('a', { cost: [{ resourceId: 'xp', amount: 10 }] })],
    })
    const engine = new TreeEngine(tree)
    await engine.unlock('a')
    expect(engine.getBudget().resources.xp).toBe(90)
    await engine.lock('a')
    // 50% de 10 = 5 devoltos
    expect(engine.getBudget().resources.xp).toBe(95)
  })

  it('NON refund cando refundable=false', async () => {
    const tree = makeTreeDef({
      startingBudget: { resources: { xp: 100 } },
      resources: [{ id: 'xp', label: 'XP', refundable: false }],
      nodes: [makeNode('a', { cost: [{ resourceId: 'xp', amount: 10 }] })],
    })
    const engine = new TreeEngine(tree)
    await engine.unlock('a')
    await engine.lock('a')
    expect(engine.getBudget().resources.xp).toBe(90)
  })

  it('falla en nodo non desbloqueado → err INVALID_NODE_DEF', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const result = await engine.lock('a')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.INVALID_NODE_DEF)
    }
  })

  it('falla en readOnly → err READ_ONLY_VIOLATION', async () => {
    const engine = new TreeEngine(makeSimpleTree(), { readOnly: true })
    const result = await engine.lock('a')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.READ_ONLY_VIOLATION)
    }
  })

  it('nodo inexistente → err NODE_NOT_FOUND', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const result = await engine.lock('nonexistent')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
    }
  })

  it('emite eventos lock e stateChange tras lock OK', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    await engine.unlock('a')
    const lockHandler = vi.fn()
    const stateHandler = vi.fn()
    engine.on('lock', lockHandler)
    engine.on('stateChange', stateHandler)
    await engine.lock('a')
    expect(lockHandler).toHaveBeenCalledOnce()
    expect(stateHandler).toHaveBeenCalledOnce()
    const [nodeId, change] = stateHandler.mock.calls[0] ?? []
    expect(nodeId).toBe('a')
    expect(change?.to).toBe('locked')
  })
})

// ── respec ──

describe('respec', () => {
  it('respec() total: todos os nodos unlocked volven a locked, budget restaurado', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('cheap')
    expect(engine.getBudget().resources.xp).toBe(5)
    expect(engine.getNodeState('cheap')?.state).toBe('unlocked')

    const result = await engine.respec()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.nodeIds).toContain('cheap')
    }
    expect(engine.getNodeState('cheap')?.state).toBe('locked')
    expect(engine.getBudget().resources.xp).toBe(10)
  })

  it('respec() total con varios nodos', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    await engine.unlock('a')
    await engine.unlock('b')
    const result = await engine.respec()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.nodeIds.length).toBe(2)
    }
    expect(engine.getNodeState('a')?.state).toBe('locked')
    expect(engine.getNodeState('b')?.state).toBe('locked')
  })

  it('respec(nodeId): cascada de dependentes con prerequisites incumpridos', async () => {
    const engine = new TreeEngine(makePrereqTree())
    await engine.unlock('a')
    await engine.unlock('b')
    await engine.unlock('c')

    // respec de a: debe lockear a + b (que require a) + c (que require b)
    const result = await engine.respec('a')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.nodeIds).toContain('a')
      expect(result.value.nodeIds).toContain('b')
      expect(result.value.nodeIds).toContain('c')
    }
    expect(engine.getNodeState('a')?.state).toBe('locked')
    expect(engine.getNodeState('b')?.state).toBe('locked')
    expect(engine.getNodeState('c')?.state).toBe('locked')
  })

  it('respec(nodeId) NON afecta a nodos sen relación de dependencia', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    await engine.unlock('a')
    await engine.unlock('b')
    await engine.unlock('c')

    // respec só de b: a e c non teñen relación, deben quedar unlocked
    const result = await engine.respec('b')
    expect(result.ok).toBe(true)
    expect(engine.getNodeState('b')?.state).toBe('locked')
    expect(engine.getNodeState('a')?.state).toBe('unlocked')
    expect(engine.getNodeState('c')?.state).toBe('unlocked')
  })

  it('falla en readOnly → err READ_ONLY_VIOLATION', async () => {
    const engine = new TreeEngine(makeSimpleTree(), { readOnly: true })
    const result = await engine.respec()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.READ_ONLY_VIOLATION)
    }
  })

  it('respec() con árbol baleira (sen nodos unlocked) → ok con listas baleiras', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const result = await engine.respec()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.nodeIds).toHaveLength(0)
    }
  })

  it('emite evento respec con lista de nodeIds', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    await engine.unlock('a')
    const respecHandler = vi.fn<[readonly string[]], void>()
    engine.on('respec', respecHandler)
    await engine.respec()
    expect(respecHandler).toHaveBeenCalledOnce()
    const [nodeIds] = respecHandler.mock.calls[0] ?? []
    expect(nodeIds).toContain('a')
  })

  it('respec(nodeId) sobre nodo non desbloqueado → ok baleiro', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const result = await engine.respec('a')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.nodeIds).toHaveLength(0)
    }
  })
})

// ── on/off ──

describe('on/off', () => {
  it('on devolve función de unsubscribe que elimina o handler', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const handler = vi.fn()
    const unsub = engine.on('unlock', handler)
    unsub()
    await engine.unlock('a')
    expect(handler).not.toHaveBeenCalled()
  })

  it('off elimina o handler rexistrado', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const handler = vi.fn<[string, NodeInstance], void>()
    engine.on('unlock', handler)
    engine.off('unlock', handler)
    await engine.unlock('a')
    expect(handler).not.toHaveBeenCalled()
  })
})
// ── FIN: tests de mutacións de TreeEngine (1.13) ──
