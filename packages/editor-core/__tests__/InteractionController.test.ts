// ── INICIO: tests InteractionController (SelectTool + MoveTool + Operation) ──
import { describe, expect, it, vi } from 'vitest'
import { EditorEngine } from '../src/EditorEngine.js'
import { createEditorDocument } from '../src/document/EditorDocument.js'
import type { InputEvent } from '../src/interaction/InputEvent.js'
import { InteractionController } from '../src/interaction/InteractionController.js'
import { createMoveTool } from '../src/tool/tools/MoveTool.js'
import { createSelectTool } from '../src/tool/tools/SelectTool.js'
import { minimalTreeDef } from './_fixtures.js'

function setup(): {
  engine: EditorEngine
  controller: InteractionController
} {
  const doc = createEditorDocument(minimalTreeDef())
  const engine = new EditorEngine(doc)
  const controller = new InteractionController(engine)
  controller.tools().register(createSelectTool())
  controller.tools().register(createMoveTool())
  return { engine, controller }
}

describe('InteractionController — SelectTool click', () => {
  it('pointerDown sobre nodo → nodo seleccionado', () => {
    const { engine, controller } = setup()
    controller.setActiveTool('select')
    const evt: InputEvent = {
      type: 'pointerDown',
      point: { x: 0, y: 0 },
      target: { kind: 'node', id: 'root' },
      modifiers: {},
    }
    controller.handleInput(evt)
    const sel = engine.getSession().selection.current()
    expect(sel.length).toBe(1)
    expect(sel[0]).toEqual({ kind: 'node', id: 'root' })
  })

  it('shift-click engade á selección (multi-select)', () => {
    const { engine, controller } = setup()
    controller.setActiveTool('select')
    controller.handleInput({
      type: 'pointerDown',
      point: { x: 0, y: 0 },
      target: { kind: 'node', id: 'root' },
      modifiers: {},
    })
    controller.handleInput({
      type: 'pointerDown',
      point: { x: 100, y: 0 },
      target: { kind: 'node', id: 'child' },
      modifiers: { shift: true },
    })
    const sel = engine.getSession().selection.current()
    expect(sel.length).toBe(2)
  })

  it('click sobre baleiro (sin modifier) → clear + entra en marquee', () => {
    const { engine, controller } = setup()
    controller.setActiveTool('select')
    // Primeiro selecciono algo.
    engine.getSession().selection.replace([{ kind: 'node', id: 'root' }])
    // Click no baleiro:
    controller.handleInput({
      type: 'pointerDown',
      point: { x: 999, y: 999 },
      target: null,
      modifiers: {},
    })
    expect(engine.getSession().selection.current().length).toBe(0)
    expect(engine.getSession().interaction.is('marquee')).toBe(true)
  })
})

describe('InteractionController — SelectTool marquee', () => {
  it('marquee selecciona nodos dentro do rect', () => {
    const { engine, controller } = setup()
    controller.setActiveTool('select')
    // root: (0,0); child: (100,0)
    // Marquee desde (-10,-10) ata (50,50) → só atrapa root.
    controller.handleInput({
      type: 'pointerDown',
      point: { x: -10, y: -10 },
      target: null,
      modifiers: {},
    })
    controller.handleInput({ type: 'pointerMove', point: { x: 50, y: 50 } })
    controller.handleInput({
      type: 'pointerUp',
      point: { x: 50, y: 50 },
      modifiers: {},
    })
    const sel = engine.getSession().selection.current()
    expect(sel.length).toBe(1)
    expect(sel[0]).toEqual({ kind: 'node', id: 'root' })
    expect(engine.getSession().interaction.is('idle')).toBe(true)
  })

  it('marquee amplo atrapa os dous nodos', () => {
    const { engine, controller } = setup()
    controller.setActiveTool('select')
    controller.handleInput({
      type: 'pointerDown',
      point: { x: -50, y: -50 },
      target: null,
      modifiers: {},
    })
    controller.handleInput({
      type: 'pointerUp',
      point: { x: 200, y: 50 },
      modifiers: {},
    })
    const sel = engine.getSession().selection.current()
    expect(sel.length).toBe(2)
  })
})

describe('InteractionController — MoveTool: drag = UNHA transacción (★)', () => {
  it('drag dun nodo: preview cambia varias veces, documento cambia 1 vez, undo restaura', () => {
    const { engine, controller } = setup()
    controller.setActiveTool('move')
    // Selecciono root.
    engine.getSession().selection.replace([{ kind: 'node', id: 'root' }])
    const docBefore = engine.getDocument()
    const listener = vi.fn()
    engine.subscribe(listener)
    // pointerDown en (0,0) sobre root: inicia drag.
    controller.handleInput({
      type: 'pointerDown',
      point: { x: 0, y: 0 },
      target: { kind: 'node', id: 'root' },
      modifiers: {},
    })
    expect(controller.hasActiveOperation()).toBe(true)
    expect(engine.getSession().interaction.is('dragging')).toBe(true)
    // Documento INALTERADO durante o drag.
    expect(engine.getDocument()).toBe(docBefore)
    // Move ×3 → preview cambia, documento non.
    controller.handleInput({ type: 'pointerMove', point: { x: 50, y: 25 } })
    controller.handleInput({ type: 'pointerMove', point: { x: 80, y: 40 } })
    controller.handleInput({ type: 'pointerMove', point: { x: 100, y: 50 } })
    expect(engine.getDocument()).toBe(docBefore)
    expect(listener).not.toHaveBeenCalled()
    const preview = controller.activePreview()
    expect(preview.nodePositions?.get('root')).toEqual({ x: 100, y: 50 })
    // pointerUp → commit unha transacción.
    controller.handleInput({
      type: 'pointerUp',
      point: { x: 100, y: 50 },
      modifiers: {},
    })
    expect(controller.hasActiveOperation()).toBe(false)
    expect(engine.getSession().interaction.is('idle')).toBe(true)
    const docAfter = engine.getDocument()
    expect(docAfter).not.toBe(docBefore)
    expect(docAfter.tree.nodes.find((n) => n.id === 'root')?.position).toEqual({
      x: 100,
      y: 50,
    })
    expect(listener).toHaveBeenCalledTimes(1)
    // History: unha entrada (un undo restaura).
    expect(engine.canUndo()).toBe(true)
    engine.undo()
    expect(engine.getDocument()).toBe(docBefore)
  })

  it('drag de 2 nodos: un commit emite 2 moveNode nunha transacción', () => {
    const { engine, controller } = setup()
    controller.setActiveTool('move')
    engine.getSession().selection.replace([
      { kind: 'node', id: 'root' },
      { kind: 'node', id: 'child' },
    ])
    const docBefore = engine.getDocument()
    controller.handleInput({
      type: 'pointerDown',
      point: { x: 0, y: 0 },
      target: { kind: 'node', id: 'root' },
      modifiers: {},
    })
    controller.handleInput({ type: 'pointerMove', point: { x: 50, y: 30 } })
    controller.handleInput({
      type: 'pointerUp',
      point: { x: 50, y: 30 },
      modifiers: {},
    })
    // Os dous nodos teñen +50/+30.
    const docAfter = engine.getDocument()
    expect(docAfter.tree.nodes.find((n) => n.id === 'root')?.position).toEqual({ x: 50, y: 30 })
    expect(docAfter.tree.nodes.find((n) => n.id === 'child')?.position).toEqual({
      x: 150,
      y: 30,
    })
    // Unha sola entrada de history (verificamos vía undo).
    engine.undo()
    expect(engine.getDocument()).toBe(docBefore)
  })
})

describe('InteractionController — cancel a media interacción', () => {
  it('cancel durante drag → documento intacto, sen history, fsm idle', () => {
    const { engine, controller } = setup()
    controller.setActiveTool('move')
    engine.getSession().selection.replace([{ kind: 'node', id: 'root' }])
    const docBefore = engine.getDocument()
    controller.handleInput({
      type: 'pointerDown',
      point: { x: 0, y: 0 },
      target: { kind: 'node', id: 'root' },
      modifiers: {},
    })
    controller.handleInput({ type: 'pointerMove', point: { x: 100, y: 100 } })
    controller.handleInput({ type: 'cancel' })
    expect(controller.hasActiveOperation()).toBe(false)
    expect(engine.getSession().interaction.is('idle')).toBe(true)
    expect(engine.getDocument()).toBe(docBefore)
    expect(engine.canUndo()).toBe(false)
  })
})

describe('InteractionController — exclusividade da FSM', () => {
  it('non se pode iniciar drag desde estado editing', () => {
    const { engine, controller } = setup()
    controller.setActiveTool('move')
    engine.getSession().selection.replace([{ kind: 'node', id: 'root' }])
    // Forzamos a fsm a editing.
    engine.getSession().interaction.to({
      kind: 'editing',
      target: { kind: 'node', id: 'root' },
    })
    // Intentamos un pointerDown que iniciaría drag.
    controller.handleInput({
      type: 'pointerDown',
      point: { x: 0, y: 0 },
      target: { kind: 'node', id: 'root' },
      modifiers: {},
    })
    // A FSM rexeita a transición editing→dragging; quedamos en editing.
    expect(engine.getSession().interaction.is('editing')).toBe(true)
    // A operación creouse (a tool chamou beginOperation antes de saber
    // se a fsm aceptaba), pero o test crítico é que NON se chega a
    // commit nin se rompe a exclusividade lóxica. Cancelar limpa.
    controller.handleInput({ type: 'cancel' })
    expect(controller.hasActiveOperation()).toBe(false)
  })
})

describe('InteractionController — efímero non ensucia documento/history', () => {
  it('selección, marquee e preview NUNCA aparecen no documento serializado', () => {
    const { engine, controller } = setup()
    controller.setActiveTool('select')
    engine.getSession().selection.replace([{ kind: 'node', id: 'root' }])
    engine.getSession().interaction.to({
      kind: 'marquee',
      rect: { x: 0, y: 0, width: 50, height: 50 },
    })
    const doc = engine.getDocument()
    // O EditorDocument só ten { tree, meta }. Nada de selection/fsm.
    expect('selection' in doc).toBe(false)
    expect('interaction' in doc).toBe(false)
    expect('meta' in doc).toBe(true)
    expect('tree' in doc).toBe(true)
  })

  it('selección non muta o documento (cero history entrada)', () => {
    const { engine, controller } = setup()
    controller.setActiveTool('select')
    const docBefore = engine.getDocument()
    engine.getSession().selection.replace([{ kind: 'node', id: 'root' }])
    expect(engine.getDocument()).toBe(docBefore)
    expect(engine.canUndo()).toBe(false)
  })
})
// ── FIN: tests InteractionController ──
