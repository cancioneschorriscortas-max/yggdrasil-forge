// ── INICIO: Tool ──
// Unha Tool é o **comportamento** dunha interacción do usuario. O
// controller mantén unha tool activa á vez (SelectTool, MoveTool, ...)
// e enruta cada InputEvent á tool.
//
// O ToolContext é a "API" exposta á tool: ten a Session (selection +
// FSM) e os helpers para xestionar a operación activa.
//
// O contrato entre tool e controller é asimétrico:
//   - A tool LE o estado e DECIDE accións (selección, cambio FSM,
//     begin/update/commit Operation).
//   - O controller é o que realmente toca o EditorEngine (transaction).
// Iso mantén a tool pura e testable: nada fala directamente co engine.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { Position } from '@yggdrasil-forge/core'
import type { EditorDocument } from '../document/EditorDocument.js'
import type { InputEvent, Modifiers } from '../interaction/InputEvent.js'
import type { InteractionMachine } from '../interaction/InteractionMachine.js'
import type { Operation } from '../operation/Operation.js'
import type { SelectionEngine } from '../selection/Selection.js'

export interface ToolContext {
  readonly selection: SelectionEngine
  readonly fsm: InteractionMachine
  /** Snapshot actual do documento (lectura). */
  document(): EditorDocument
  /** Inicia unha Operation efímera. Substitúe calquera activa. */
  beginOperation(op: Operation): void
  /** Adianta unha Operation activa (atualiza preview). No-op se non hai. */
  updateOperation(point: Position, modifiers: Modifiers): void
  /**
   * Pecha a Operation activa: pídelle commit() e despacha os Commands
   * resultantes nunha **única** transacción. No-op se non hai activa
   * ou se o commit non produciu Commands.
   */
  commitOperation(label?: LocalizedString): void
  /** Aborta a Operation activa. No-op se non hai. */
  cancelOperation(): void
}

export interface Tool {
  readonly id: string
  readonly label?: LocalizedString
  onInput(event: InputEvent, ctx: ToolContext): void
}
// ── FIN: Tool ──
