// ── INICIO: tests replaceDocument (7.15b, Decisión 4) ──
// O comando substitúe tree E meta dun golpe: un commit → un undo
// devolve o documento anterior ENTEIRO. Base do «Aplicar» do panel
// Código.

import type { TreeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { EditorEngine } from '../src/EditorEngine.js'
import { replaceDocument } from '../src/command/commands/index.js'
import { createEditorDocument } from '../src/document/EditorDocument.js'
import { deserializeDocument, serializeDocument } from '../src/document/serialize.js'

function treeA(): TreeDef {
  return {
    id: 'arbore-a',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'A' },
    nodes: [{ id: 'a1', type: 'small', label: { gl: 'a1' }, position: { x: 0, y: 0 } }],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
}

function treeB(): TreeDef {
  return {
    id: 'arbore-b',
    schemaVersion: '1.0.0',
    version: '2.0.0',
    label: { gl: 'B' },
    nodes: [
      { id: 'b1', type: 'small', label: { gl: 'b1' }, position: { x: 0, y: 0 } },
      { id: 'b2', type: 'keystone', label: { gl: 'b2' }, position: { x: 100, y: 0 } },
    ],
    edges: [{ id: 'be1', source: 'b1', target: 'b2', type: 'dependency' }],
    layout: { type: 'custom' },
  } as TreeDef
}

describe('replaceDocument — substitución completa como UN paso de undo', () => {
  it('★ substitúe tree E meta; un undo devolve TODO o anterior; redo volve', () => {
    const docA = createEditorDocument(treeA(), {
      coordinateBounds: { minX: -10, minY: -10, maxX: 10, maxY: 10 },
      theme: { preset: 'tintado' },
    })
    const engine = new EditorEngine(docA)

    const docB = createEditorDocument(treeB(), {
      coordinateBounds: { minX: 0, minY: 0, maxX: 200, maxY: 100 },
    })
    const result = engine.transaction({ gl: 'Aplicar código' }, (tx) => {
      tx.apply(replaceDocument(docB))
    })
    expect(result.ok).toBe(true)

    // O documento novo está enteiro (tree + meta).
    expect(engine.getDocument().tree.id).toBe('arbore-b')
    expect(engine.getDocument().tree.nodes).toHaveLength(2)
    expect(engine.getDocument().meta.coordinateBounds?.maxX).toBe(200)
    expect(engine.getDocument().meta.theme).toBeUndefined()

    // UN undo → documento anterior ENTEIRO (tree E meta).
    expect(engine.canUndo()).toBe(true)
    engine.undo()
    expect(engine.getDocument().tree.id).toBe('arbore-a')
    expect(engine.getDocument().tree.nodes).toHaveLength(1)
    expect(engine.getDocument().meta.theme?.preset).toBe('tintado')
    expect(engine.getDocument().meta.coordinateBounds?.maxX).toBe(10)

    // Redo → documento novo outra vez.
    engine.redo()
    expect(engine.getDocument().tree.id).toBe('arbore-b')
    expect(engine.getDocument().meta.coordinateBounds?.maxX).toBe(200)
  })

  it('as issues re-avalíanse sobre o documento novo', () => {
    const engine = new EditorEngine(createEditorDocument(treeA()))
    expect(engine.getIssues()).toHaveLength(0)

    // Documento B cunha aresta órfa NON pasaría; usamos un válido e
    // comprobamos que getIssues reflicte o candidato tras o commit.
    const docB = createEditorDocument(treeB())
    engine.transaction({ gl: 'x' }, (tx) => tx.apply(replaceDocument(docB)))
    // treeB é válido → sen issues bloqueantes.
    expect(engine.getIssues().filter((i) => i.severity === 'error')).toHaveLength(0)
    expect(engine.getDocument().tree.id).toBe('arbore-b')
  })

  it('round-trip: aplicar un doc vindo de deserializeDocument conserva todo', () => {
    const engine = new EditorEngine(createEditorDocument(treeA()))
    const source = createEditorDocument(treeB(), {
      theme: { nodeFills: { locked: '#111111' } },
    })
    const restored = deserializeDocument(serializeDocument(source))
    expect(restored.ok).toBe(true)
    if (!restored.ok) return

    engine.transaction({ gl: 'importar' }, (tx) => tx.apply(replaceDocument(restored.value)))
    expect(serializeDocument(engine.getDocument())).toBe(serializeDocument(source))
  })

  it('a etiqueta por defecto é bilingüe (historial lexible)', () => {
    const cmd = replaceDocument(createEditorDocument(treeA()))
    expect(cmd.type).toBe('replaceDocument')
    expect(cmd.label).toEqual({ en: 'Replace document', gl: 'Substituír o documento' })
  })
})
// ── FIN: tests replaceDocument ──
