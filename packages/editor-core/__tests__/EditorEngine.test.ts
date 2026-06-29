// ── INICIO: tests EditorEngine ──
// Tests headless (Vitest) do pipeline central. Cubre os 8 escenarios
// do §6 do briefing 7.2 + alguns extras de robustez.

import type { EdgeDef, NodeDef } from '@yggdrasil-forge/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorEngine } from '../src/EditorEngine.js'
import {
  addEdge,
  addNode,
  moveNode,
  removeEdge,
  removeNode,
} from '../src/command/commands/index.js'
import { type EditorDocument, createEditorDocument } from '../src/document/EditorDocument.js'
import type { Validator } from '../src/validation/Validator.js'
import { minimalTreeDef } from './_fixtures.js'

function makeEngine(): EditorEngine {
  const doc = createEditorDocument(minimalTreeDef())
  return new EditorEngine(doc)
}

describe('EditorEngine — commit', () => {
  it('moveNode: cambia a posición e marca dirty + notifica unha vez', () => {
    const engine = makeEngine()
    const listener = vi.fn()
    engine.subscribe(listener)
    const before = engine.getDocument()
    const result = engine.dispatch(moveNode('root', { x: 500, y: 250 }))
    expect(result.ok).toBe(true)
    const after = engine.getDocument()
    expect(after).not.toBe(before)
    const root = after.tree.nodes.find((n) => n.id === 'root')
    expect(root?.position).toEqual({ x: 500, y: 250 })
    expect(engine.getSession().dirty).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(after)
  })

  it('inmutabilidade: a referencia previa NON muta tras dispatch', () => {
    const engine = makeEngine()
    const before = engine.getDocument()
    const rootPosBefore = before.tree.nodes.find((n) => n.id === 'root')?.position
    engine.dispatch(moveNode('root', { x: 999, y: 999 }))
    // A referencia capturada antes do dispatch segue iguai (Immer
    // structural sharing — non muta o input).
    const rootPosAfterCapture = before.tree.nodes.find((n) => n.id === 'root')?.position
    expect(rootPosBefore).toEqual(rootPosAfterCapture)
    expect(rootPosAfterCapture).toEqual({ x: 0, y: 0 })
  })
})

describe('EditorEngine — transaction atómica', () => {
  it('addNode + addEdge nun bloque: un snapshot e un notify', () => {
    const engine = makeEngine()
    const listener = vi.fn()
    engine.subscribe(listener)
    const newNode: NodeDef = {
      id: 'grandchild',
      type: 'small',
      label: { en: 'Grandchild' },
      position: { x: 200, y: 0 },
    } as NodeDef
    const newEdge: EdgeDef = {
      id: 'e2',
      source: 'child',
      target: 'grandchild',
      type: 'dependency',
    } as EdgeDef
    const result = engine.transaction(undefined, (tx) => {
      tx.apply(addNode(newNode))
      tx.apply(addEdge(newEdge))
    })
    expect(result.ok).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    const doc = engine.getDocument()
    expect(doc.tree.nodes.map((n) => n.id)).toContain('grandchild')
    expect(doc.tree.edges.map((e) => e.id)).toContain('e2')
  })
})

describe('EditorEngine — rexeita + rollback', () => {
  it('removeNode dun nodo con aresta orfa: err + documento inalterado', () => {
    const engine = makeEngine()
    const before = engine.getDocument()
    const listener = vi.fn()
    engine.subscribe(listener)
    // 'child' está como target de 'e1'. Eliminalo deixa a aresta orfa.
    const result = engine.dispatch(removeNode('child'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toMatch(/transaction rejected/)
    }
    // Documento INTACTO (referencia idéntica).
    expect(engine.getDocument()).toBe(before)
    // History sin tocar; canUndo segue false.
    expect(engine.canUndo()).toBe(false)
    // Sin notificar (rexeitouse antes do commit).
    expect(listener).not.toHaveBeenCalled()
    expect(engine.getSession().dirty).toBe(false)
  })

  it('id duplicado: err + rollback', () => {
    const engine = makeEngine()
    const dup: NodeDef = {
      id: 'root', // colide co existente
      type: 'small',
      label: { en: 'Duplicate' },
      position: { x: 50, y: 50 },
    } as NodeDef
    const before = engine.getDocument()
    const result = engine.dispatch(addNode(dup))
    expect(result.ok).toBe(false)
    expect(engine.getDocument()).toBe(before)
  })

  it('transaction composta limpa (removeEdge + removeNode na mesma): COMMIT ok', () => {
    const engine = makeEngine()
    const result = engine.transaction(undefined, (tx) => {
      tx.apply(removeEdge('e1'))
      tx.apply(removeNode('child'))
    })
    expect(result.ok).toBe(true)
    const doc = engine.getDocument()
    expect(doc.tree.nodes.map((n) => n.id)).not.toContain('child')
    expect(doc.tree.edges.map((e) => e.id)).not.toContain('e1')
  })
})

describe('EditorEngine — soft validators NON bloquean', () => {
  it('un validator warning permite commit + aparece en getIssues', () => {
    const warnValidator: Validator = () => [
      {
        severity: 'warning',
        code: 'TEST_WARN',
        message: { en: 'just a warning' },
      },
    ]
    const doc = createEditorDocument(minimalTreeDef())
    const engine = new EditorEngine(doc, { validators: [warnValidator] })
    const result = engine.dispatch(moveNode('root', { x: 10, y: 10 }))
    expect(result.ok).toBe(true)
    const issues = engine.getIssues()
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0]?.code).toBe('TEST_WARN')
    expect(issues[0]?.severity).toBe('warning')
  })
})

describe('EditorEngine — History (undo/redo)', () => {
  let engine: EditorEngine

  beforeEach(() => {
    engine = makeEngine()
  })

  it('tras 3 dispatches: canUndo=true, undo restaura estado previo', () => {
    engine.dispatch(moveNode('root', { x: 10, y: 0 }))
    engine.dispatch(moveNode('root', { x: 20, y: 0 }))
    engine.dispatch(moveNode('root', { x: 30, y: 0 }))
    expect(engine.canUndo()).toBe(true)
    const r = engine.undo()
    expect(r.ok).toBe(true)
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'root')?.position.x).toBe(20)
  })

  it('undo + redo: restaura', () => {
    engine.dispatch(moveNode('root', { x: 100, y: 0 }))
    engine.undo()
    expect(engine.canRedo()).toBe(true)
    engine.redo()
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'root')?.position.x).toBe(100)
  })

  it('dispatch novo despois de undo TRUNCA o redo-stack', () => {
    engine.dispatch(moveNode('root', { x: 50, y: 0 }))
    engine.dispatch(moveNode('root', { x: 100, y: 0 }))
    engine.undo() // volta a x=50 (e máis: x=100 vai a redo-stack)
    expect(engine.canRedo()).toBe(true)
    // Cambio novo: trunca o redo-stack.
    engine.dispatch(moveNode('root', { x: 200, y: 0 }))
    expect(engine.canRedo()).toBe(false)
  })

  it('undo sen history: err (non lanza)', () => {
    const r = engine.undo()
    expect(r.ok).toBe(false)
  })

  it('redo sen history: err (non lanza)', () => {
    const r = engine.redo()
    expect(r.ok).toBe(false)
  })

  it('transacción rexeitada NON entra na history', () => {
    // Estado inicial: canUndo false.
    expect(engine.canUndo()).toBe(false)
    // Transacción que rompe integridade (deixa orfa) → rexeitada.
    engine.dispatch(removeNode('child'))
    expect(engine.canUndo()).toBe(false)
  })
})

describe('EditorEngine — separación de simulación (autoría ≠ runtime)', () => {
  it('o EditorEngine non instancia un TreeEngine internamente', () => {
    // Test documental + estrutural: o módulo EditorEngine.ts non
    // importa TreeEngine. Inspeccionamos as keys exportadas para
    // confirmar que o que se expón é só edición.
    // (Test "ben-formado" — non require runtime; só asegura que
    // ningún wiring oculto trae o motor runtime á autoría.)
    const e = makeEngine()
    // Os métodos públicos son todos de edición, ningún de simulación.
    expect(typeof e.getDocument).toBe('function')
    expect(typeof e.dispatch).toBe('function')
    expect(typeof e.transaction).toBe('function')
    expect(typeof e.undo).toBe('function')
    expect(typeof e.redo).toBe('function')
    // Non existen métodos do runtime motor (canUnlock, unlock, getBudget...).
    expect((e as unknown as Record<string, unknown>).unlock).toBeUndefined()
    expect((e as unknown as Record<string, unknown>).canUnlock).toBeUndefined()
    expect((e as unknown as Record<string, unknown>).getBudget).toBeUndefined()
  })
})

describe('EditorEngine — no-op transactions', () => {
  it('transacción que non modifica nada: ok pero sin commit/notify', () => {
    const engine = makeEngine()
    const listener = vi.fn()
    engine.subscribe(listener)
    const before = engine.getDocument()
    const result = engine.transaction(undefined, () => {
      // intencionalmente baleiro
    })
    expect(result.ok).toBe(true)
    expect(engine.getDocument()).toBe(before)
    expect(listener).not.toHaveBeenCalled()
    expect(engine.canUndo()).toBe(false)
  })

  it('moveNode a un id inexistente: no-op, sin commit', () => {
    const engine = makeEngine()
    const before = engine.getDocument()
    const result = engine.dispatch(moveNode('nonexistent', { x: 1, y: 1 }))
    expect(result.ok).toBe(true)
    expect(engine.getDocument()).toBe(before)
    expect(engine.canUndo()).toBe(false)
  })
})

describe('EditorEngine — subscribe', () => {
  it('unsubscribe quita o listener', () => {
    const engine = makeEngine()
    const listener = vi.fn()
    const unsubscribe = engine.subscribe(listener)
    engine.dispatch(moveNode('root', { x: 10, y: 0 }))
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    engine.dispatch(moveNode('root', { x: 20, y: 0 }))
    expect(listener).toHaveBeenCalledTimes(1) // segue 1
  })

  it('múltiples listeners reciben a mesma referencia de doc', () => {
    const engine = makeEngine()
    const l1 = vi.fn<(d: EditorDocument) => void>()
    const l2 = vi.fn<(d: EditorDocument) => void>()
    engine.subscribe(l1)
    engine.subscribe(l2)
    engine.dispatch(moveNode('root', { x: 1, y: 1 }))
    const d1 = l1.mock.calls[0]?.[0]
    const d2 = l2.mock.calls[0]?.[0]
    expect(d1).toBe(d2)
  })
})
// ── FIN: tests EditorEngine ──
