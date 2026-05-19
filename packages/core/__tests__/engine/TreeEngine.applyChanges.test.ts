// ── INICIO: tests de applyChanges de TreeEngine (1.14) ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it, vi } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { EdgeDef, NodeDef, TreeChange, TreeDef } from '../../src/types/index.js'

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

/** TreeDef con tres nodos simples sen custo nin prerequisites. */
function makeSimpleTree(): TreeDef {
  return makeTreeDef({
    startingBudget: { resources: { xp: 100 } },
    resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
    nodes: [makeNode('a'), makeNode('b'), makeNode('c')],
  })
}

function makeEdge(id: string, source: string, target: string): EdgeDef {
  return { id, source, target, type: 'prerequisite' }
}

// ── no-op e guardas ──

describe('applyChanges — no-op e guardas', () => {
  it('lista baleira → ok cun resultado baleiro (no-op)', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const result = await engine.applyChanges([])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.applied).toBe(0)
      expect(result.value.affectedNodes).toEqual([])
      expect(result.value.renames.size).toBe(0)
      expect(result.value.cachesInvalidated).toEqual([])
    }
  })

  it('readOnly → err READ_ONLY_VIOLATION sen tocar nada', async () => {
    const engine = new TreeEngine(makeSimpleTree(), { readOnly: true })
    const before = engine.getTreeDef().nodes.length
    const result = await engine.applyChanges([{ type: 'add_node', node: makeNode('z') }])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.READ_ONLY_VIOLATION)
    }
    expect(engine.getTreeDef().nodes.length).toBe(before)
  })
})

// ── aplicación e reconciliación ──

describe('applyChanges — aplicación', () => {
  it('add_node → engade o nodo á TreeDef e crea NodeInstance inicial', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const result = await engine.applyChanges([{ type: 'add_node', node: makeNode('d') }])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.applied).toBe(1)
    }
    expect(engine.getTreeDef().nodes.some((n) => n.id === 'd')).toBe(true)
    const inst = engine.getNodeState('d')
    expect(inst).not.toBeNull()
    expect(inst?.state).toBe('locked')
    expect(inst?.currentTier).toBe(0)
  })

  it('remove_node → elimina o nodo da TreeDef e a súa NodeInstance', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    await engine.unlock('a')
    expect(engine.getNodeState('a')).not.toBeNull()
    const result = await engine.applyChanges([{ type: 'remove_node', nodeId: 'a' }])
    expect(result.ok).toBe(true)
    expect(engine.getTreeDef().nodes.some((n) => n.id === 'a')).toBe(false)
    expect(engine.getNodeState('a')).toBeNull()
  })

  it('rename_node_id → move a NodeInstance conservando o estado', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    await engine.unlock('a')
    const prev = engine.getNodeState('a')
    expect(prev?.state).toBe('unlocked')
    const result = await engine.applyChanges([{ type: 'rename_node_id', oldId: 'a', newId: 'a2' }])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.renames.get('a')).toBe('a2')
    }
    expect(engine.getNodeState('a')).toBeNull()
    const moved = engine.getNodeState('a2')
    expect(moved).not.toBeNull()
    expect(moved?.id).toBe('a2')
    expect(moved?.state).toBe('unlocked')
    expect(engine.getTreeDef().nodes.some((n) => n.id === 'a2')).toBe(true)
  })

  it('modify_node con maxTier por debaixo do currentTier → clamp', async () => {
    const tree = makeTreeDef({
      startingBudget: { resources: { xp: 100 } },
      resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
      nodes: [makeNode('m', { maxTier: 5 })],
    })
    const engine = new TreeEngine(tree)
    // Un unlock → currentTier real = 1 (maxTier=5, non chega a maxed).
    await engine.unlock('m')
    const inst0 = engine.getNodeState('m')
    expect(inst0?.currentTier).toBe(1)
    // Baixamos maxTier a 0: o currentTier (1) debe clampearse a 0.
    const result = await engine.applyChanges([
      { type: 'modify_node', nodeId: 'm', changes: { maxTier: 0 } },
    ])
    expect(result.ok).toBe(true)
    const inst1 = engine.getNodeState('m')
    expect(inst1).not.toBeNull()
    expect(inst1?.currentTier).toBe(0)
  })

  it('add_edge e remove_edge → modifican a lista de edges', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const addRes = await engine.applyChanges([{ type: 'add_edge', edge: makeEdge('e1', 'a', 'b') }])
    expect(addRes.ok).toBe(true)
    expect(engine.getTreeDef().edges.some((e) => e.id === 'e1')).toBe(true)
    const rmRes = await engine.applyChanges([{ type: 'remove_edge', edgeId: 'e1' }])
    expect(rmRes.ok).toBe(true)
    expect(engine.getTreeDef().edges.some((e) => e.id === 'e1')).toBe(false)
  })
})

// ── conflitos internos (atomicidade) ──

describe('applyChanges — conflitos internos', () => {
  it('conflito interno → err CHANGE_CONFLICT e estado intacto', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const before = engine.getTreeDef().nodes.length
    // duplicate_add_node: o mesmo id engádese dúas veces na lista.
    const changes: TreeChange[] = [
      { type: 'add_node', node: makeNode('dup') },
      { type: 'add_node', node: makeNode('dup') },
    ]
    const result = await engine.applyChanges(changes)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.CHANGE_CONFLICT)
      // O context leva os conflitos para telemetría.
      expect(result.error.context).toBeDefined()
      const ctx = result.error.context as Record<string, unknown> | undefined
      expect(Array.isArray(ctx?.internalConflicts)).toBe(true)
    }
    // Atomicidade: non se aplicou ningún cambio.
    expect(engine.getTreeDef().nodes.length).toBe(before)
    expect(engine.getNodeState('dup')).toBeNull()
  })
})

// ── validación contra a TreeDef actual ──

describe('applyChanges — validación contra TreeDef', () => {
  it('add_node con id xa existente → err INVALID_NODE_STATE, atómico', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const before = engine.getTreeDef().nodes.length
    const result = await engine.applyChanges([{ type: 'add_node', node: makeNode('a') }])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.INVALID_NODE_STATE)
    }
    expect(engine.getTreeDef().nodes.length).toBe(before)
  })

  it('remove_node de id inexistente → err NODE_NOT_FOUND', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const result = await engine.applyChanges([{ type: 'remove_node', nodeId: 'inexistente' }])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
    }
  })

  it('modify_node de id inexistente → err NODE_NOT_FOUND', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const result = await engine.applyChanges([
      { type: 'modify_node', nodeId: 'nope', changes: { label: 'x' } },
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
    }
  })

  it('rename a id existente → err INVALID_NODE_STATE', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const result = await engine.applyChanges([{ type: 'rename_node_id', oldId: 'a', newId: 'b' }])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.INVALID_NODE_STATE)
    }
  })

  it('add_edge con source inexistente → err NODE_NOT_FOUND', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const result = await engine.applyChanges([
      { type: 'add_edge', edge: makeEdge('ex', 'fantasma', 'a') },
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
    }
  })
})

// ── eventos ──

describe('applyChanges — eventos', () => {
  it('emite treeChanged tras aplicar OK', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const handler = vi.fn()
    engine.on('treeChanged', handler)
    const changes: TreeChange[] = [{ type: 'add_node', node: makeNode('ev') }]
    const result = await engine.applyChanges(changes)
    expect(result.ok).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(changes)
  })

  it('NON emite treeChanged se a lista é baleira', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    const handler = vi.fn()
    engine.on('treeChanged', handler)
    await engine.applyChanges([])
    expect(handler).not.toHaveBeenCalled()
  })

  it('emite stateChange ao renomear un nodo con instancia', async () => {
    const engine = new TreeEngine(makeSimpleTree())
    await engine.unlock('a')
    const handler = vi.fn()
    engine.on('stateChange', handler)
    await engine.applyChanges([{ type: 'rename_node_id', oldId: 'a', newId: 'a3' }])
    expect(handler).toHaveBeenCalled()
  })
})
// ── FIN: tests de applyChanges de TreeEngine (1.14) ──
