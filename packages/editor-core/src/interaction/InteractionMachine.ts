// ── INICIO: InteractionMachine ──
// Máquina de estados FINITA da interacción. **Un só estado á vez** =
// exclusividade. Garante que non se pode arrastrar mentres editas, ou
// crear unha aresta no medio dun marquee, etc.
//
// Táboa de transicións (regra xeral):
//   - Calquera estado activo NON-idle só se entra desde `idle`.
//   - `idle` é destino sempre válido (reset/cancel).
//
// Iso resólvese co helper `canTransition(from, to)` interno.

import type { SelectionRef } from '../selection/Selection.js'
import type { Rect } from './InputEvent.js'

export type InteractionState =
  | { readonly kind: 'idle' }
  /** Operation activa (Move, en v1; outras virán). */
  | { readonly kind: 'dragging' }
  /** Marquee aberto (rectángulo de selección en construcción). */
  | { readonly kind: 'marquee'; readonly rect: Rect }
  /** Edición inline dun campo (ex.: label en NodeRef). */
  | { readonly kind: 'editing'; readonly target: SelectionRef }
  /** Creando unha aresta desde un nodo "from". (v1.2 — pero o estado modela). */
  | { readonly kind: 'creatingEdge'; readonly from: string }

export interface InteractionMachine {
  state(): InteractionState
  is(kind: InteractionState['kind']): boolean
  /**
   * Transición GARDADA. Devolve `true` se aplicou, `false` se a
   * transición non é válida desde o estado actual.
   */
  to(next: InteractionState): boolean
  /** Forzar volta a idle (sempre permitido). */
  reset(): void
  subscribe(listener: () => void): () => void
}

/**
 * Táboa de transicións. **Calquera kind activo só se entra desde
 * idle**; calquera estado pode ir a idle (vía `reset`).
 *
 * Caso especial: re-entrar no mesmo estado activo NON é permitido a
 * través de `to()` (ex.: dragging→dragging). O autor debe `reset()`
 * primeiro. Isto evita confusión por dobres `pointerDown`.
 *
 * Excepción: `marquee` → `marquee` SI é válido (actualización do rect
 * durante drag do propio marquee). Iso permite que a tool faga
 * `to({ kind: 'marquee', rect: ... })` repetidamente en pointerMove
 * sen pasar por idle.
 */
function canTransition(from: InteractionState, to: InteractionState): boolean {
  // Sempre podemos ir a idle (reset implícito).
  if (to.kind === 'idle') return true
  // Excepción: marquee→marquee (refresh do rect durante drag).
  if (from.kind === 'marquee' && to.kind === 'marquee') return true
  // Calquera outro estado activo só se entra desde idle.
  return from.kind === 'idle'
}

const IDLE_STATE: InteractionState = { kind: 'idle' }

export function createInteractionMachine(): InteractionMachine {
  let current: InteractionState = IDLE_STATE
  const listeners = new Set<() => void>()

  function notify(): void {
    for (const listener of listeners) listener()
  }

  return {
    state(): InteractionState {
      return current
    },
    is(kind): boolean {
      return current.kind === kind
    },
    to(next: InteractionState): boolean {
      if (!canTransition(current, next)) return false
      current = next
      notify()
      return true
    },
    reset(): void {
      if (current.kind === 'idle') return
      current = IDLE_STATE
      notify()
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
// ── FIN: InteractionMachine ──
