// ── INICIO: integración — applyChanges + reconciliación (1.18) ──
// Modificar a TreeDef en runtime tras desbloqueos, verificar que as
// NodeInstances se reconcilian (rename, remove, modify, clamp de maxTier)
// e que os conflitos internos se detectan con CHANGE_CONFLICT.

import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { TreeChange } from '../../src/types/index.js'
import { makeEdge, makeNode, makeRichTreeDef } from './fixtures.js'

describe('integración — applyChanges e reconciliación', () => {
  it('add_node + add_edge na mesma chamada: id proxectado é visible', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const changes: TreeChange[] = [
      { type: 'add_node', node: makeNode('novo') },
      { type: 'add_edge', edge: makeEdge('e-novo', 'root', 'novo') },
    ]
    const r = await engine.applyChanges(changes)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.applied).toBe(2)
      expect(engine.getTreeDef().nodes.some((n) => n.id === 'novo')).toBe(true)
      expect(engine.getTreeDef().edges.some((e) => e.id === 'e-novo')).toBe(true)
      // NodeInstance inicial creada (locked, tier 0).
      const inst = engine.getNodeState('novo')
      expect(inst?.state).toBe('locked')
      expect(inst?.currentTier).toBe(0)
    }
  })

  it('rename_node_id tras unlock: instancia movida co estado intacto, edges reapuntan, rootNodeId actualiza', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    await engine.unlock('root')
    expect(engine.getNodeState('root')?.state).toBe('unlocked')

    const r = await engine.applyChanges([{ type: 'rename_node_id', oldId: 'root', newId: 'coroa' }])
    expect(r.ok).toBe(true)

    // Instancia movida.
    expect(engine.getNodeState('root')).toBeNull()
    expect(engine.getNodeState('coroa')?.state).toBe('unlocked')

    // rootNodeId actualizado.
    expect(engine.getTreeDef().rootNodeId).toBe('coroa')

    // Todas as edges que apuntaban a 'root' reapuntan a 'coroa'.
    const edges = engine.getTreeDef().edges
    expect(edges.some((e) => e.source === 'root' || e.target === 'root')).toBe(false)
    expect(edges.some((e) => e.source === 'coroa')).toBe(true)
  })

  it('remove_node con cascadeEdges=true elimina edges referenciantes', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    await engine.unlock('root')

    const r = await engine.applyChanges([{ type: 'remove_node', nodeId: 'a', cascadeEdges: true }])
    expect(r.ok).toBe(true)

    expect(engine.getTreeDef().nodes.some((n) => n.id === 'a')).toBe(false)
    expect(engine.getTreeDef().edges.some((e) => e.source === 'a' || e.target === 'a')).toBe(false)
    // NodeInstance tamén eliminada.
    expect(engine.getNodeState('a')).toBeNull()
  })

  it('modify_node baixa maxTier → reconcilia clamp de currentTier', async () => {
    // Construímos unha árbore cun nodo en tier 2.
    const def = makeRichTreeDef()
    const engine = new TreeEngine(def)
    await engine.unlock('root')
    await engine.unlock('a') // a queda en tier 1 (unlocked)

    // Forzamos un tier maior usando applyChanges para modificar a definición
    // (en runtime non se pode subir tier via unlock, así que simulamos vía
    // modify_node baixando maxTier a 0, que disparará o clamp).
    const r = await engine.applyChanges([
      { type: 'modify_node', nodeId: 'a', changes: { maxTier: 0 } },
    ])
    expect(r.ok).toBe(true)
    // Clamp: currentTier = min(1, 0) = 0.
    expect(engine.getNodeState('a')?.currentTier).toBe(0)
  })

  it('conflito interno duplicate_add_node → err CHANGE_CONFLICT, treeDef intacta', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const before = engine.getTreeDef().nodes.length

    const r = await engine.applyChanges([
      { type: 'add_node', node: makeNode('x') },
      { type: 'add_node', node: makeNode('x') },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.CHANGE_CONFLICT)
    }
    // Atomicidade: nada aplicado.
    expect(engine.getTreeDef().nodes.length).toBe(before)
  })

  it('conflito add_then_remove → err CHANGE_CONFLICT', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([
      { type: 'add_node', node: makeNode('temp') },
      { type: 'remove_node', nodeId: 'temp' },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.CHANGE_CONFLICT)
    }
  })

  it('validateChange rexeita add_edge con source inexistente (NODE_NOT_FOUND)', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([
      { type: 'add_edge', edge: makeEdge('e-x', 'no-existe', 'a') },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
    }
  })

  it('validateChange rexeita remove_edge inexistente (INVALID_EDGE_DEF)', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([{ type: 'remove_edge', edgeId: 'no-existe' }])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.INVALID_EDGE_DEF)
    }
  })

  it('validateChange rexeita modify_node sobre id inexistente (NODE_NOT_FOUND)', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.applyChanges([
      { type: 'modify_node', nodeId: 'no-existe', changes: { label: 'x' } },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
    }
  })
})
// ── FIN: integración — applyChanges + reconciliación (1.18) ──
