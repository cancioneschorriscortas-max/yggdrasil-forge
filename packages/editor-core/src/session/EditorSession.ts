// ── INICIO: EditorSession ──
// Contedor efímero de estado de edición. **Morre ao pechar o documento.**
//
// 7.1 abriu o shell con document + dirty. 7.3 enche os slots
// efímeros que faltaban: selection (SelectionEngine), interaction
// (InteractionMachine), activeOperation. Todos viven aquí porque
// son **efímeros** (Domain Model) — non tocan documento nin history.
//
// History segue na clase EditorEngine (non na Session). Razón: a
// history persiste snapshots inmutables; pertence ao motor de edición.
// Clipboard (v1.x) virá aquí cando exista.

import type { EditorDocument } from '../document/EditorDocument.js'
import {
  type InteractionMachine,
  createInteractionMachine,
} from '../interaction/InteractionMachine.js'
import type { Operation } from '../operation/Operation.js'
import { type SelectionEngine, createSelectionEngine } from '../selection/Selection.js'

export interface EditorSession {
  document: EditorDocument
  dirty: boolean
  /** Selección efímera (7.3). */
  selection: SelectionEngine
  /** FSM de interacción (7.3). */
  interaction: InteractionMachine
  /** Operation viva (null cando non hai drag/manipulación en curso). */
  activeOperation: Operation | null
  // Slots reservados (NON implementar aínda):
  //   history (vive no EditorEngine, non aquí) · clipboard (v1.x)
}

/**
 * Crea unha sesión coa documento inicialmente limpo (sin cambios
 * pendentes). Os subsistemas efímeros (selection, fsm) instánciase
 * frescos por sesión.
 */
export function createSession(document: EditorDocument): EditorSession {
  return {
    document,
    dirty: false,
    selection: createSelectionEngine(),
    interaction: createInteractionMachine(),
    activeOperation: null,
  }
}
// ── FIN: EditorSession ──
