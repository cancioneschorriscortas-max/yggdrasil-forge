// ── INICIO: EditorSession ──
// Contedor efímero de estado de edición. **Morre ao pechar o documento.**
//
// En 7.1 só ten os dous slots permanentes: `document` (fonte de
// verdade) e `dirty` (cambios non gardados). Os subsistemas con vida
// propia (Selection 7.3, History 7.2, Clipboard 7.x, InteractionState
// FSM 7.3) van **nos seus servizos**, non aquí. Esta é unha lección
// do Domain Model: a Session é un **shell**, non un mega-objecto.

import type { EditorDocument } from '../document/EditorDocument.js'

export interface EditorSession {
  /** Documento aberto: a fonte de verdade en memoria. */
  document: EditorDocument
  /** Cambios sen gardar desde a última carga/save. */
  dirty: boolean
  // Slots reservados (NON implementar en 7.1):
  //   selection (7.3) · history (7.2) · clipboard (7.x) · interactionState (7.3)
}

/**
 * Crea unha sesión coa documento inicialmente limpo (sin cambios
 * pendentes). O `dirty` virá-se a `true` cando o pipeline de comandos
 * (7.2) modifique o documento.
 */
export function createSession(document: EditorDocument): EditorSession {
  return { document, dirty: false }
}
// ── FIN: EditorSession ──
