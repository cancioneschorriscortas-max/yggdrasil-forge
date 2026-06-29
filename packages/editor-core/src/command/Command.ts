// ── INICIO: Command ──
// O Command é a unidade do pipeline de edición. Encapsula UNHA
// receita de mutación pura sobre un draft Immer do EditorDocument.
//
// Regras:
//   - SEN efectos colaterais (nin I/O, nin random, nin Date.now). A
//     mutación é determinista en función do estado actual + parámetros
//     fechados no Command.
//   - SEN despachar outros comandos dentro do mutate. A composición
//     faise no nivel da Transaction (engine.transaction(...)).
//   - Os Commands son DATOS: o mesmo Command pode replicarse,
//     serializarse (para futuros collaborative cursors) ou inspeccionar.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { Draft } from 'immer'
import type { EditorDocument } from '../document/EditorDocument.js'

/** Receita de mutación sobre un draft Immer do documento. */
export interface Command {
  /** Identificador do tipo (ex. 'moveNode', 'addEdge'). */
  readonly type: string
  /** Etiqueta opcional para o historial / UI undo. */
  readonly label?: LocalizedString
  /**
   * Aplica a mutación. O draft é o documento "candidato" desa
   * transacción; pode haberse mutado xa por comandos previos da mesma
   * transacción. NON gardar referencias ao draft fora da chamada.
   */
  mutate(draft: Draft<EditorDocument>): void
}
// ── FIN: Command ──
