// ── INICIO: tests EditorCanvas — fluxo drag a nivel de Operation ──
// ★ A nivel de componente é difícil simular pointer events porque
// jsdom non implementa getScreenCTM (e logo non hai screen→doc real).
//
// **Estratexia**: probar o fluxo que executa o EditorCanvas usando
// directamente createMoveOperation + editorEngine.transaction (mesma
// lóxica que se executa no handlePointerUp 'dragging'). Iso verifica
// que: drag = 1 transacción = 1 entrada history, e undo restaura.
//
// O test puramente de pointerdown→pointermove→pointerup queda para
// 7.5b-iii (cando teñamos un wrap de helpers) ou ata que xeitemos
// integrar @testing-library/user-event con shims para CTM.

import type { TreeDef } from '@yggdrasil-forge/core'
import {
  EditorEngine,
  createEditorDocument,
  createMoveOperation,
} from '@yggdrasil-forge/editor-core'
import { describe, expect, it } from 'vitest'

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'drag-flow',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'Drag flow' },
    groups: [],
    nodes: [
      { id: 'a', type: 'small', label: { en: 'A' }, position: { x: 0, y: 0 } },
      { id: 'b', type: 'small', label: { en: 'B' }, position: { x: 100, y: 0 } },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

describe('EditorCanvas — fluxo de drag (★ drag = 1 transacción)', () => {
  it('drag dun nodo: preview cambia varias veces, doc cambia 1 vez, undo restaura', () => {
    const engine = buildEngine()
    const docBefore = engine.getDocument()
    // Selección inicial (replace antes do drag, como fai pointermove tras superar limiar).
    engine.getSession().selection.replace([{ kind: 'node', id: 'a' }])
    // createMoveOperation: captura inicial.
    const op = createMoveOperation(engine.getDocument(), engine.getSession().selection, {
      x: 0,
      y: 0,
    })
    // Tres updates (simulan pointermove).
    op.update({ x: 30, y: 10 }, {})
    op.update({ x: 60, y: 25 }, {})
    op.update({ x: 100, y: 50 }, {})
    // O documento NON cambia ata o commit.
    expect(engine.getDocument()).toBe(docBefore)
    expect(engine.canUndo()).toBe(false)
    // Preview ten as posicións ghost.
    expect(op.preview().nodePositions?.get('a')).toEqual({ x: 100, y: 50 })
    // Commit: engine.transaction con cmds da Operation.
    const cmds = op.commit()
    engine.transaction({ en: 'Move' }, (tx) => {
      for (const cmd of cmds) tx.apply(cmd)
    })
    const docAfter = engine.getDocument()
    // Doc cambiou EXACTAMENTE unha vez.
    expect(docAfter).not.toBe(docBefore)
    expect(docAfter.tree.nodes.find((n) => n.id === 'a')?.position).toEqual({ x: 100, y: 50 })
    // History: unha entrada.
    expect(engine.canUndo()).toBe(true)
    // Undo restaura.
    engine.undo()
    expect(engine.getDocument()).toBe(docBefore)
  })

  it('drag de DOUS nodos (multi-selección): commit en 1 sola transacción', () => {
    const engine = buildEngine()
    const docBefore = engine.getDocument()
    engine.getSession().selection.replace([
      { kind: 'node', id: 'a' },
      { kind: 'node', id: 'b' },
    ])
    const op = createMoveOperation(engine.getDocument(), engine.getSession().selection, {
      x: 0,
      y: 0,
    })
    op.update({ x: 50, y: 30 }, {})
    const cmds = op.commit()
    expect(cmds.length).toBe(2)
    engine.transaction({ en: 'Move' }, (tx) => {
      for (const cmd of cmds) tx.apply(cmd)
    })
    const docAfter = engine.getDocument()
    expect(docAfter.tree.nodes.find((n) => n.id === 'a')?.position).toEqual({ x: 50, y: 30 })
    expect(docAfter.tree.nodes.find((n) => n.id === 'b')?.position).toEqual({ x: 150, y: 30 })
    // ★ Unha sola entrada de history: undo restaura ambos.
    engine.undo()
    expect(engine.getDocument()).toBe(docBefore)
  })

  it('cancel a media interacción: documento intacto, sin entrada de history', () => {
    const engine = buildEngine()
    const docBefore = engine.getDocument()
    engine.getSession().selection.replace([{ kind: 'node', id: 'a' }])
    const op = createMoveOperation(engine.getDocument(), engine.getSession().selection, {
      x: 0,
      y: 0,
    })
    op.update({ x: 50, y: 50 }, {})
    op.cancel()
    // O commit() tras cancel devolve cmds baleiros → transaction non se executa.
    const cmds = op.commit()
    expect(cmds.length).toBe(0)
    expect(engine.getDocument()).toBe(docBefore)
    expect(engine.canUndo()).toBe(false)
  })
})
// ── FIN: tests EditorCanvas drag flow ──
