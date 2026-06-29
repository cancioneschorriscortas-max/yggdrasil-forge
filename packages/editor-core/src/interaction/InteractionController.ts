// ── INICIO: InteractionController ──
// Controller que une todo. Constrúese co EditorEngine; mantén:
//   - tool activa (id).
//   - operación activa + o seu preview (viven na Session).
//   - rexistro de tools.
//
// Expón `handleInput(event)` para que a UI lle enrute eventos. As
// tools NON falan co engine directamente — pasan polo ToolContext, que
// pasa polo controller, que é o ÚNICO que toca `engine.transaction(...)`.
//
// Isto mantén:
//   - Tool pura (cero dispatch directo).
//   - Operation pura (só produce Commands).
//   - Atomicidade: commitOperation envolve N Commands nunha sola
//     `engine.transaction(...)` → unha entrada de history.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { Position } from '@yggdrasil-forge/core'
import type { EditorEngine } from '../EditorEngine.js'
import type { EditorDocument } from '../document/EditorDocument.js'
import type { Operation, OperationPreview } from '../operation/Operation.js'
import type { Tool, ToolContext } from '../tool/Tool.js'
import type { ToolRegistry } from '../tool/ToolRegistry.js'
import { createToolRegistry } from '../tool/ToolRegistry.js'
import type { InputEvent, Modifiers } from './InputEvent.js'

export interface InteractionControllerOptions {
  /**
   * Rexistro de tools a usar. Se non se pasa, créase un baleiro. O
   * consumidor debe `register()` as tools desexadas antes de
   * `setActiveTool(id)`.
   */
  readonly toolRegistry?: ToolRegistry
}

export class InteractionController {
  private readonly engine: EditorEngine
  private readonly registry: ToolRegistry
  private activeToolId: string | null = null
  private readonly subscribers = new Set<() => void>()

  constructor(engine: EditorEngine, options?: InteractionControllerOptions) {
    this.engine = engine
    this.registry = options?.toolRegistry ?? createToolRegistry()
  }

  // ── API de configuración ────────────────────────────────────────

  tools(): ToolRegistry {
    return this.registry
  }

  setActiveTool(id: string | null): boolean {
    if (id === null) {
      this.activeToolId = null
      this.notify()
      return true
    }
    if (this.registry.get(id) === undefined) return false
    this.activeToolId = id
    this.notify()
    return true
  }

  getActiveTool(): Tool | null {
    if (this.activeToolId === null) return null
    return this.registry.get(this.activeToolId) ?? null
  }

  // ── Operación activa (lectura) ──────────────────────────────────

  activePreview(): OperationPreview {
    const op = this.engine.getSession().activeOperation
    return op === null ? {} : op.preview()
  }

  // ── Eventos ────────────────────────────────────────────────────

  handleInput(event: InputEvent): void {
    const tool = this.getActiveTool()
    if (tool === null) return
    tool.onInput(event, this.makeContext())
  }

  // ── Subscrición (para preview/selección/fsm) ────────────────────

  subscribe(listener: () => void): () => void {
    this.subscribers.add(listener)
    return () => {
      this.subscribers.delete(listener)
    }
  }

  private notify(): void {
    for (const sub of this.subscribers) sub()
  }

  // ── Helpers internos ────────────────────────────────────────────

  private makeContext(): ToolContext {
    const session = this.engine.getSession()
    return {
      selection: session.selection,
      fsm: session.interaction,
      document: () => this.engine.getDocument(),
      beginOperation: (op: Operation) => this.beginOperation(op),
      updateOperation: (point: Position, modifiers: Modifiers) =>
        this.updateOperation(point, modifiers),
      commitOperation: (label?: LocalizedString) => this.commitOperation(label),
      cancelOperation: () => this.cancelOperation(),
    }
  }

  private beginOperation(op: Operation): void {
    const session = this.engine.getSession()
    // Se xa había unha operación viva, descártase (cancel implícito).
    if (session.activeOperation !== null) {
      session.activeOperation.cancel()
    }
    session.activeOperation = op
    this.notify()
  }

  private updateOperation(point: Position, modifiers: Modifiers): void {
    const session = this.engine.getSession()
    if (session.activeOperation === null) return
    session.activeOperation.update(point, modifiers)
    this.notify()
  }

  private commitOperation(label?: LocalizedString): void {
    const session = this.engine.getSession()
    const op = session.activeOperation
    if (op === null) return
    const cmds = op.commit()
    session.activeOperation = null
    if (cmds.length === 0) {
      this.notify()
      return
    }
    // ★ A clave de 7.3: TODOS os Commands da Operation van NUNHA
    // soa transacción → unha soa entrada de history → un único undo.
    this.engine.transaction(label, (tx) => {
      for (const cmd of cmds) tx.apply(cmd)
    })
    this.notify()
  }

  private cancelOperation(): void {
    const session = this.engine.getSession()
    if (session.activeOperation === null) return
    session.activeOperation.cancel()
    session.activeOperation = null
    this.notify()
  }

  // ── Expón o documento (utilidade para consumers) ───────────────

  getDocument(): EditorDocument {
    return this.engine.getDocument()
  }

  /** Útil para tests: ¿hai operación activa? */
  hasActiveOperation(): boolean {
    return this.engine.getSession().activeOperation !== null
  }
}
// ── FIN: InteractionController ──
