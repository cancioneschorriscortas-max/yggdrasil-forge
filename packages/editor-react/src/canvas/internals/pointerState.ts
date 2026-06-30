// ── INICIO: pointerState ──
// Máquina de estados local da interacción de punteiro no canvas.
//
// **Por que non usar o InteractionController de 7.3?**
// O InteractionController + Tools de 7.3 modela "tool activa fixa
// que decide en cada InputEvent". O caso real do editor é "drag vs
// click polo limiar de movemento" — non se sabe se é select ou move
// ata que se ve se hai pointermove despois do pointerdown. Iso non
// encaixa limpamente co modelo Tool actual.
//
// **Decisión arquitectural** (banco para o Arquitecto): o
// InteractionController + Tools quedan latentes en editor-core para
// cando exista UI de barra de tools (v1.2: Move tool, Edge tool,
// etc.). O editor v1 usa esta máquina local + createMoveOperation +
// SelectionEngine directamente. Cero cambio en headless.

import type { Position } from '@yggdrasil-forge/core'
import type { Operation, SelectionRef } from '@yggdrasil-forge/editor-core'

/**
 * Limiar de drag en píxeles pantalla. Pointermove con desprazamento
 * menor que isto considerase clic, non drag. (Convención común.)
 */
export const DRAG_THRESHOLD_PX = 4

export interface Modifiers {
  readonly shift: boolean
  readonly ctrl: boolean
  readonly meta: boolean
  readonly alt: boolean
}

/**
 * Estado da interacción de punteiro. Discriminated union por `kind`.
 *
 * - `idle`: sin pointer down activo.
 * - `pressed-node`: pointer down sobre un nodo, pendente saber se vai
 *   ser clic (pointer up sin movemento) ou drag (pointer move ≥ limiar).
 * - `dragging`: drag confirmado; hai Operation activa que se actualiza
 *   en cada pointermove.
 * - `marquee`: shift-drag sobre baleiro; rect sendo construído.
 */
export type PointerState =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'pressed-node'
      readonly target: SelectionRef
      readonly startScreenX: number
      readonly startScreenY: number
      readonly startDoc: Position
      readonly modifiers: Modifiers
    }
  | {
      readonly kind: 'dragging'
      readonly operation: Operation
    }
  | {
      readonly kind: 'marquee'
      readonly startDoc: Position
      readonly currentDoc: Position
      readonly additive: boolean
    }

export const IDLE: PointerState = { kind: 'idle' }

/** Normaliza un PointerEvent a Modifiers. */
export function modifiersOf(e: {
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}): Modifiers {
  return {
    shift: e.shiftKey,
    ctrl: e.ctrlKey,
    meta: e.metaKey,
    alt: e.altKey,
  }
}

/** Devolve true se hai algún modificador "additive" (shift / ctrl / meta). */
export function isAdditive(m: Modifiers): boolean {
  return m.shift || m.ctrl || m.meta
}

/**
 * Devolve true se o desprazamento desde o punto inicial superou o
 * limiar de drag (en píxeles pantalla).
 */
export function exceededDragThreshold(
  startScreenX: number,
  startScreenY: number,
  currentScreenX: number,
  currentScreenY: number,
): boolean {
  const dx = currentScreenX - startScreenX
  const dy = currentScreenY - startScreenY
  return dx * dx + dy * dy >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX
}

/**
 * Calcula o rectángulo doc-space normalizado entre dous puntos
 * (usado polo marquee).
 */
export function rectBetween(
  a: Position,
  b: Position,
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const width = Math.abs(b.x - a.x)
  const height = Math.abs(b.y - a.y)
  return { x, y, width, height }
}
// ── FIN: pointerState ──
