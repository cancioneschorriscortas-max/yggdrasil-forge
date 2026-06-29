// ── INICIO: History ──
// Pila de snapshots de EditorDocument. Immer dá structural sharing →
// cada snapshot é barato (só clona o que cambia).
//
// Modelo: dúas pilas (undo + redo). `push` engade un snapshot novo e
// limpa a pila redo (un cambio novo "trunca o futuro").
//
// API mínima requirida polo briefing §4. Clipboard e wiring de teclas
// son v1.1 (fora desta sesión).

import type { EditorDocument } from '../document/EditorDocument.js'

export interface HistoryOptions {
  /** Máximo de snapshots a manter na pila undo. Default 100. */
  readonly maxDepth?: number
}

export class History {
  private readonly maxDepth: number
  // O snapshot "actual" non vive na pila — vive no engine.
  // A pila `undo` ten os snapshots **anteriores** (top = máis recente).
  // A pila `redo` ten snapshots desfeitos por undo.
  private undoStack: EditorDocument[] = []
  private redoStack: EditorDocument[] = []

  constructor(options?: HistoryOptions) {
    this.maxDepth = options?.maxDepth ?? 100
  }

  /**
   * Despois dun commit exitoso, o snapshot ANTERIOR pásase para undo.
   * Calquera redo pendente queda invalidado (trunca o futuro).
   */
  push(previous: EditorDocument): void {
    this.undoStack.push(previous)
    if (this.undoStack.length > this.maxDepth) {
      // Bota o máis vello (FIFO no overflow).
      this.undoStack.shift()
    }
    // Cambio novo: o redo-stack queda invalidado.
    this.redoStack = []
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Aplica undo. Devolve o snapshot ao que se vai (o anterior, que
   * agora pasa a ser o currentDocument do engine), e move o `current`
   * que se pasa á redo-stack.
   *
   * Retorna `null` se non hai nada que desfacer.
   */
  undo(current: EditorDocument): EditorDocument | null {
    const previous = this.undoStack.pop()
    if (previous === undefined) return null
    this.redoStack.push(current)
    return previous
  }

  /**
   * Aplica redo. Move o snapshot máis recente da redo-stack a undo, e
   * devolve o doc ao que se vai.
   *
   * Retorna `null` se non hai nada que refacer.
   */
  redo(current: EditorDocument): EditorDocument | null {
    const next = this.redoStack.pop()
    if (next === undefined) return null
    this.undoStack.push(current)
    return next
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}
// ── FIN: History ──
