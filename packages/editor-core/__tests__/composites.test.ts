// ── INICIO: tests composites (briefing 7.11) ──

import type { TreeDef } from '@yggdrasil-forge/core'
import { TreeEngine } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { EditorEngine } from '../src/EditorEngine.js'
import { addNode } from '../src/command/commands/index.js'
import {
  buildConnect,
  buildNewNode,
  buildRemoveCascade,
  nextFreeId,
} from '../src/command/composites.js'
import { createEditorDocument } from '../src/document/EditorDocument.js'

function treeWithNodes(nodeIds: readonly string[], edges: TreeDef['edges'] = []): TreeDef {
  return {
    id: 'composites-test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { en: 'Composites Test' },
    nodes: nodeIds.map((id, i) => ({
      id,
      type: 'small',
      label: { en: id },
      position: { x: i * 100, y: 0 },
    })),
    edges,
    layout: { type: 'custom' },
  } as TreeDef
}

describe('★ 7.11 — nextFreeId', () => {
  it('devolve prefix-1 se non hai ningún ocupado', () => {
    expect(nextFreeId(new Set(), 'nodo')).toBe('nodo-1')
  })

  it('salta os ocupados en orde', () => {
    expect(nextFreeId(new Set(['nodo-1', 'nodo-2']), 'nodo')).toBe('nodo-3')
  })

  it('salta ocos: se falta nodo-2 pero existe nodo-3, devolve nodo-2', () => {
    expect(nextFreeId(new Set(['nodo-1', 'nodo-3']), 'nodo')).toBe('nodo-2')
  })

  it('prefixos distintos son independentes', () => {
    expect(nextFreeId(new Set(['nodo-1', 'nodo-2']), 'aresta')).toBe('aresta-1')
  })
})

describe('★ 7.11 — buildNewNode', () => {
  it('crea un nodo type=small na posición dada, con id libre', () => {
    const doc = createEditorDocument(treeWithNodes(['a', 'b']))
    const node = buildNewNode(doc, { x: 42, y: 7 })
    expect(node.id).toBe('nodo-1')
    expect(node.type).toBe('small')
    expect(node.position).toEqual({ x: 42, y: 7 })
    expect(node.label).toEqual({ gl: 'Novo nodo', en: 'New node' })
  })

  it('id libre non choca con nodos xa chamados nodo-N', () => {
    const doc = createEditorDocument(treeWithNodes(['nodo-1', 'nodo-2']))
    const node = buildNewNode(doc, { x: 0, y: 0 })
    expect(node.id).toBe('nodo-3')
  })
})

describe('★ 7.11 — buildConnect: ramas do merge de prerequisite', () => {
  it('rama 1: B sen prerequisites → condición simple node_unlocked', () => {
    const doc = createEditorDocument(treeWithNodes(['a', 'b']))
    const cmds = buildConnect(doc, 'a', 'b', { withPrerequisite: true })
    const engine = new EditorEngine(doc)
    const result = engine.transaction(undefined, (tx) => {
      for (const c of cmds) tx.apply(c)
    })
    expect(result.ok).toBe(true)
    const b = engine.getDocument().tree.nodes.find((n) => n.id === 'b')
    expect(b?.prerequisites).toEqual({ type: 'node_unlocked', nodeId: 'a' })
  })

  it('rama 2: B con condición simple → envolve en all cos dous', () => {
    const tree = treeWithNodes(['a', 'b', 'c'])
    tree.nodes[2] = {
      ...tree.nodes[2],
      prerequisites: { type: 'node_unlocked', nodeId: 'a' },
    } as TreeDef['nodes'][number]
    const doc = createEditorDocument(tree)
    const cmds = buildConnect(doc, 'b', 'c', { withPrerequisite: true })
    const engine = new EditorEngine(doc)
    engine.transaction(undefined, (tx) => {
      for (const c of cmds) tx.apply(c)
    })
    const c = engine.getDocument().tree.nodes.find((n) => n.id === 'c')
    expect(c?.prerequisites).toEqual({
      type: 'all',
      conditions: [
        { type: 'node_unlocked', nodeId: 'a' },
        { type: 'node_unlocked', nodeId: 'b' },
      ],
    })
  })

  it('rama 3: B con grupo all → engade a condición ao final', () => {
    const tree = treeWithNodes(['a', 'b', 'c', 'd'])
    tree.nodes[3] = {
      ...tree.nodes[3],
      prerequisites: {
        type: 'all',
        conditions: [{ type: 'node_unlocked', nodeId: 'a' }],
      },
    } as TreeDef['nodes'][number]
    const doc = createEditorDocument(tree)
    const cmds = buildConnect(doc, 'c', 'd', { withPrerequisite: true })
    const engine = new EditorEngine(doc)
    engine.transaction(undefined, (tx) => {
      for (const cmd of cmds) tx.apply(cmd)
    })
    const d = engine.getDocument().tree.nodes.find((n) => n.id === 'd')
    expect(d?.prerequisites).toEqual({
      type: 'all',
      conditions: [
        { type: 'node_unlocked', nodeId: 'a' },
        { type: 'node_unlocked', nodeId: 'c' },
      ],
    })
  })

  it('rama 4a: B con grupo any → NON toca a regra, só crea a aresta', () => {
    const tree = treeWithNodes(['a', 'b', 'c'])
    const anyRule = {
      type: 'any' as const,
      conditions: [{ type: 'node_unlocked' as const, nodeId: 'a' }],
    }
    tree.nodes[2] = { ...tree.nodes[2], prerequisites: anyRule } as TreeDef['nodes'][number]
    const doc = createEditorDocument(tree)
    const cmds = buildConnect(doc, 'b', 'c', { withPrerequisite: true })
    // Só debe haber UN comando (addEdge) — nada de setNodeField.
    expect(cmds).toHaveLength(1)
    const engine = new EditorEngine(doc)
    engine.transaction(undefined, (tx) => {
      for (const c of cmds) tx.apply(c)
    })
    const c = engine.getDocument().tree.nodes.find((n) => n.id === 'c')
    expect(c?.prerequisites).toEqual(anyRule)
    expect(engine.getDocument().tree.edges.some((e) => e.source === 'b' && e.target === 'c')).toBe(
      true,
    )
  })

  it('rama 4b: B con grupo none → NON toca a regra', () => {
    const tree = treeWithNodes(['a', 'b', 'c'])
    const noneRule = {
      type: 'none' as const,
      conditions: [{ type: 'node_unlocked' as const, nodeId: 'a' }],
    }
    tree.nodes[2] = { ...tree.nodes[2], prerequisites: noneRule } as TreeDef['nodes'][number]
    const doc = createEditorDocument(tree)
    const cmds = buildConnect(doc, 'b', 'c', { withPrerequisite: true })
    expect(cmds).toHaveLength(1)
  })

  it('dedupe: se xa existe node_unlocked(A) simple, non duplica', () => {
    const tree = treeWithNodes(['a', 'b'])
    tree.nodes[1] = {
      ...tree.nodes[1],
      prerequisites: { type: 'node_unlocked', nodeId: 'a' },
    } as TreeDef['nodes'][number]
    const doc = createEditorDocument(tree)
    const cmds = buildConnect(doc, 'a', 'b', { withPrerequisite: true })
    // Só addEdge — o prerequisite xa estaba, non se toca.
    expect(cmds).toHaveLength(1)
  })

  it('dedupe: se xa existe node_unlocked(A) dentro dun grupo all, non duplica', () => {
    const tree = treeWithNodes(['a', 'b', 'c'])
    tree.nodes[2] = {
      ...tree.nodes[2],
      prerequisites: {
        type: 'all',
        conditions: [
          { type: 'node_unlocked', nodeId: 'a' },
          { type: 'node_unlocked', nodeId: 'b' },
        ],
      },
    } as TreeDef['nodes'][number]
    const doc = createEditorDocument(tree)
    const cmds = buildConnect(doc, 'a', 'c', { withPrerequisite: true })
    expect(cmds).toHaveLength(1)
  })

  it('withPrerequisite=false: só crea a aresta, nunca toca prerequisites', () => {
    const doc = createEditorDocument(treeWithNodes(['a', 'b']))
    const cmds = buildConnect(doc, 'a', 'b', { withPrerequisite: false })
    expect(cmds).toHaveLength(1)
    expect(cmds[0]?.type).toBe('addEdge')
  })
})

describe('★ 7.11 — buildConnect: rexeitos', () => {
  it('self-loop (A→A) devolve []', () => {
    const doc = createEditorDocument(treeWithNodes(['a']))
    expect(buildConnect(doc, 'a', 'a', { withPrerequisite: false })).toEqual([])
  })

  it('duplicado exacto (xa existe A→B) devolve []', () => {
    const doc = createEditorDocument(
      treeWithNodes(['a', 'b'], [{ id: 'e1', source: 'a', target: 'b', type: 'dependency' }]),
    )
    expect(buildConnect(doc, 'a', 'b', { withPrerequisite: false })).toEqual([])
  })

  it('B→A NON é duplicado de A→B (dirección distinta)', () => {
    const doc = createEditorDocument(
      treeWithNodes(['a', 'b'], [{ id: 'e1', source: 'a', target: 'b', type: 'dependency' }]),
    )
    expect(buildConnect(doc, 'b', 'a', { withPrerequisite: false })).toHaveLength(1)
  })

  it('id de aresta nova é libre (nextFreeId con prefix aresta)', () => {
    const doc = createEditorDocument(
      treeWithNodes(
        ['a', 'b', 'c'],
        [{ id: 'aresta-1', source: 'a', target: 'b', type: 'dependency' }],
      ),
    )
    const cmds = buildConnect(doc, 'b', 'c', { withPrerequisite: false })
    const engine = new EditorEngine(doc)
    engine.transaction(undefined, (tx) => {
      for (const c of cmds) tx.apply(c)
    })
    const newEdge = engine
      .getDocument()
      .tree.edges.find((e) => e.source === 'b' && e.target === 'c')
    expect(newEdge?.id).toBe('aresta-2')
  })
})

describe('★ 7.11 — buildRemoveCascade', () => {
  it('nodo con arestas entrantes/saíntes: bórranse todas', () => {
    const doc = createEditorDocument(
      treeWithNodes(
        ['a', 'b', 'c'],
        [
          { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
          { id: 'e2', source: 'b', target: 'c', type: 'dependency' },
        ],
      ),
    )
    const cmds = buildRemoveCascade(doc, ['b'], [])
    const engine = new EditorEngine(doc)
    const result = engine.transaction(undefined, (tx) => {
      for (const c of cmds) tx.apply(c)
    })
    expect(result.ok).toBe(true)
    const final = engine.getDocument()
    expect(final.tree.nodes.some((n) => n.id === 'b')).toBe(false)
    expect(final.tree.edges).toHaveLength(0)
  })

  it('nodo referenciado en prerequisite ANIÑADO (grupo all): pódase a condición, non a regra enteira', () => {
    const tree = treeWithNodes(['a', 'b', 'c'])
    tree.nodes[2] = {
      ...tree.nodes[2],
      prerequisites: {
        type: 'all',
        conditions: [
          { type: 'node_unlocked', nodeId: 'a' },
          { type: 'node_unlocked', nodeId: 'b' },
        ],
      },
    } as TreeDef['nodes'][number]
    const doc = createEditorDocument(tree)
    const cmds = buildRemoveCascade(doc, ['b'], [])
    const engine = new EditorEngine(doc)
    engine.transaction(undefined, (tx) => {
      for (const c of cmds) tx.apply(c)
    })
    const c = engine.getDocument().tree.nodes.find((n) => n.id === 'c')
    expect(c?.prerequisites).toEqual({
      type: 'all',
      conditions: [{ type: 'node_unlocked', nodeId: 'a' }],
    })
  })

  it('regra que queda baleira tras podar → prerequisites undefined', () => {
    const tree = treeWithNodes(['a', 'b'])
    tree.nodes[1] = {
      ...tree.nodes[1],
      prerequisites: { type: 'node_unlocked', nodeId: 'a' },
    } as TreeDef['nodes'][number]
    const doc = createEditorDocument(tree)
    const cmds = buildRemoveCascade(doc, ['a'], [])
    const engine = new EditorEngine(doc)
    engine.transaction(undefined, (tx) => {
      for (const c of cmds) tx.apply(c)
    })
    const b = engine.getDocument().tree.nodes.find((n) => n.id === 'b')
    expect(b?.prerequisites).toBeUndefined()
  })

  it('nodo referenciado en exclusions: quítase da lista, ou a lista desaparece se queda baleira', () => {
    const tree = treeWithNodes(['a', 'b', 'c'])
    tree.nodes[2] = { ...tree.nodes[2], exclusions: ['a', 'b'] } as TreeDef['nodes'][number]
    const doc = createEditorDocument(tree)
    const cmds = buildRemoveCascade(doc, ['a'], [])
    const engine = new EditorEngine(doc)
    engine.transaction(undefined, (tx) => {
      for (const c of cmds) tx.apply(c)
    })
    const c = engine.getDocument().tree.nodes.find((n) => n.id === 'c')
    expect(c?.exclusions).toEqual(['b'])
  })

  it('exclusions queda baleira tras podar → undefined (non array baleiro)', () => {
    const tree = treeWithNodes(['a', 'b'])
    tree.nodes[1] = { ...tree.nodes[1], exclusions: ['a'] } as TreeDef['nodes'][number]
    const doc = createEditorDocument(tree)
    const cmds = buildRemoveCascade(doc, ['a'], [])
    const engine = new EditorEngine(doc)
    engine.transaction(undefined, (tx) => {
      for (const c of cmds) tx.apply(c)
    })
    const b = engine.getDocument().tree.nodes.find((n) => n.id === 'b')
    expect(b?.exclusions).toBeUndefined()
  })

  it('distance_max: pódase por fromNodeId, non por nodeId', () => {
    const tree = treeWithNodes(['a', 'b'])
    tree.nodes[1] = {
      ...tree.nodes[1],
      prerequisites: { type: 'distance_max', fromNodeId: 'a', maxSteps: 3 },
    } as TreeDef['nodes'][number]
    const doc = createEditorDocument(tree)
    const cmds = buildRemoveCascade(doc, ['a'], [])
    const engine = new EditorEngine(doc)
    engine.transaction(undefined, (tx) => {
      for (const c of cmds) tx.apply(c)
    })
    const b = engine.getDocument().tree.nodes.find((n) => n.id === 'b')
    expect(b?.prerequisites).toBeUndefined()
  })

  it('multi-selección mixta nodos+arestas: todo desaparece nunha soa transacción (un undo)', () => {
    const doc = createEditorDocument(
      treeWithNodes(
        ['a', 'b', 'c', 'd'],
        [
          { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
          { id: 'e2', source: 'c', target: 'd', type: 'dependency' },
        ],
      ),
    )
    const cmds = buildRemoveCascade(doc, ['b'], ['e2'])
    const engine = new EditorEngine(doc)
    const historyBefore = engine.canUndo()
    engine.transaction(undefined, (tx) => {
      for (const c of cmds) tx.apply(c)
    })
    expect(historyBefore).toBe(false)
    expect(engine.canUndo()).toBe(true)
    const final = engine.getDocument()
    expect(final.tree.nodes.map((n) => n.id)).toEqual(['a', 'c', 'd'])
    expect(final.tree.edges).toHaveLength(0)
    const undoResult = engine.undo()
    expect(undoResult.ok).toBe(true)
    expect(engine.getDocument().tree.nodes).toHaveLength(4)
    expect(engine.getDocument().tree.edges).toHaveLength(2)
  })

  it('non deixa issues duros tras a cascada (getIssues limpo)', () => {
    const tree = treeWithNodes(['a', 'b', 'c'])
    tree.nodes[2] = {
      ...tree.nodes[2],
      prerequisites: { type: 'node_unlocked', nodeId: 'b' },
      exclusions: ['b'],
    } as TreeDef['nodes'][number]
    const doc = createEditorDocument(tree)
    const cmds = buildRemoveCascade(doc, ['b'], [])
    const engine = new EditorEngine(doc)
    engine.transaction(undefined, (tx) => {
      for (const c of cmds) tx.apply(c)
    })
    const hardErrors = engine.getIssues().filter((i) => i.severity === 'error')
    expect(hardErrors).toEqual([])
  })
})

describe('★ 7.11 — sonda de fluxo círculo-completo', () => {
  it('crear 2 nodos → conectar con prerequisite → canUnlock reflicte → borrar cascada → undo ×3', () => {
    const doc = createEditorDocument(treeWithNodes([]))
    const engine = new EditorEngine(doc)

    // 1) Crear nodo A.
    const nodeA = buildNewNode(engine.getDocument(), { x: 0, y: 0 })
    let r = engine.transaction(undefined, (tx) => tx.apply(addNode(nodeA)))
    expect(r.ok).toBe(true)

    // 2) Crear nodo B.
    const nodeB = buildNewNode(engine.getDocument(), { x: 100, y: 0 })
    r = engine.transaction(undefined, (tx) => tx.apply(addNode(nodeB)))
    expect(r.ok).toBe(true)
    expect(nodeA.id).not.toBe(nodeB.id) // ids libres distintos

    // 3) Conectar A→B con prerequisite.
    const connectCmds = buildConnect(engine.getDocument(), nodeA.id, nodeB.id, {
      withPrerequisite: true,
    })
    r = engine.transaction(undefined, (tx) => {
      for (const c of connectCmds) tx.apply(c)
    })
    expect(r.ok).toBe(true)
    const bAfterConnect = engine.getDocument().tree.nodes.find((n) => n.id === nodeB.id)
    expect(bAfterConnect?.prerequisites).toEqual({ type: 'node_unlocked', nodeId: nodeA.id })
    expect(engine.getIssues().filter((i) => i.severity === 'error')).toEqual([])

    // 4) canUnlock(B) reflicte o prerequisite: bloqueado mentres A non estea desbloqueado.
    const treeEngine = new TreeEngine(engine.getDocument().tree)
    const checkBefore = treeEngine.canUnlock(nodeB.id)
    expect(checkBefore.ok).toBe(true)
    if (checkBefore.ok) expect(checkBefore.value.allowed).toBe(false)

    // 5) Borrar cascada de A → o prerequisite en B desaparece.
    const cascadeCmds = buildRemoveCascade(engine.getDocument(), [nodeA.id], [])
    r = engine.transaction(undefined, (tx) => {
      for (const c of cascadeCmds) tx.apply(c)
    })
    expect(r.ok).toBe(true)
    const finalDoc = engine.getDocument()
    expect(finalDoc.tree.nodes.map((n) => n.id)).toEqual([nodeB.id])
    expect(finalDoc.tree.edges).toEqual([])
    expect(engine.getIssues().filter((i) => i.severity === 'error')).toEqual([])
    const treeEngineAfter = new TreeEngine(finalDoc.tree)
    const checkAfter = treeEngineAfter.canUnlock(nodeB.id)
    expect(checkAfter.ok).toBe(true)
    if (checkAfter.ok) expect(checkAfter.value.allowed).toBe(true) // sen prerequisite, desbloqueable

    // 6) undo ×3 → estado inicial paso a paso.
    expect(engine.undo().ok).toBe(true) // desfai a cascada
    expect(engine.getDocument().tree.nodes).toHaveLength(2)
    expect(engine.getDocument().tree.edges).toHaveLength(1)

    expect(engine.undo().ok).toBe(true) // desfai o connect
    expect(engine.getDocument().tree.edges).toHaveLength(0)
    expect(
      engine.getDocument().tree.nodes.find((n) => n.id === nodeB.id)?.prerequisites,
    ).toBeUndefined()

    expect(engine.undo().ok).toBe(true) // desfai addNode(B)
    expect(engine.getDocument().tree.nodes).toHaveLength(1)
    expect(engine.getDocument().tree.nodes[0]?.id).toBe(nodeA.id)
  })
})
// ── FIN: tests composites ──
