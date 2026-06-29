// ── INICIO: Operation ──
// Unha Operation é o **agregador efímero** dun drag/manipulación viva.
// Diferencia con Command:
//
//   Command (7.2):       unha receita pura, atómica, aplicable nunha
//                        transacción. É a unidade de history.
//   Operation (7.3):     unha *sesión* de interacción que produce N
//                        actualizacións de preview + UN commit final
//                        que xera M Commands aplicados nunha
//                        transacción (UNHA entrada de history).
//
// Drag de 5 nodos = N updates de preview + 1 commit = 1 transacción
// con 5 moveNode = 1 entrada de history. Iso é o que aliña a
// experiencia "arrastrei e soltei" coa noción de undo do usuario.

import type { Position } from '@yggdrasil-forge/core'
import type { Command } from '../command/Command.js'
import type { Modifiers } from '../interaction/InputEvent.js'

/**
 * Estado efímero que o renderer le para pintar o "ghost" durante a
 * Operation. Cada Operation define que campos enche:
 *   - MoveOperation enche `nodePositions` (ghost dos nodos arrastrados).
 *   - Futuras Operations (resize, rotate, ...) engadirán máis campos.
 */
export interface OperationPreview {
  /** Posicións ghost dos nodos durante un move (ausente fóra de move). */
  readonly nodePositions?: ReadonlyMap<string, Position>
}

export interface Operation {
  /** Identificador do tipo (ex.: 'move', 'resize'). */
  readonly type: string
  /** Estado efímero actual (renderer le isto). */
  preview(): OperationPreview
  /** Chámase con cada pointerMove durante a Operation. NON dispatch. */
  update(point: Position, modifiers: Modifiers): void
  /**
   * Pídelle á Operation que produza os Commands finais para
   * commiteala. O controller envólveos nunha transacción única.
   */
  commit(): readonly Command[]
  /** Abortar: preview baleiro; nada aplicado. */
  cancel(): void
}
// ── FIN: Operation ──
