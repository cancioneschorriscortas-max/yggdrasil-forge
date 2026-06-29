// ── INICIO: MoveOperation ──
// Operation concreta v1: move múltiple. Captura as posicións iniciais
// dos nodos seleccionados ao inicio do drag; en cada update calcula o
// delta respecto a `startPoint` e actualiza o preview. No commit
// emite UN moveNode por nodo (todos van nunha mesma transacción).

import type { Position } from '@yggdrasil-forge/core'
import type { Command } from '../command/Command.js'
import { moveNode } from '../command/commands/index.js'
import type { EditorDocument } from '../document/EditorDocument.js'
import type { SelectionEngine } from '../selection/Selection.js'
import type { Operation, OperationPreview } from './Operation.js'

/**
 * Crea unha MoveOperation para os nodos actualmente seleccionados que
 * teñan `position` definida. Nodos sen position ignóranse (calculados
 * polo layout — non son movibles a man).
 *
 * `startPoint` é o punto onde comezou o drag (coordenadas de
 * documento); úsase como ancla para calcular deltas en cada update.
 */
export function createMoveOperation(
  doc: EditorDocument,
  selection: SelectionEngine,
  startPoint: Position,
): Operation {
  // Captura inicial: id → posición no instante de iniciar o drag.
  const initial = new Map<string, Position>()
  for (const ref of selection.current()) {
    if (ref.kind !== 'node') continue
    const node = doc.tree.nodes.find((n) => n.id === ref.id)
    if (node?.position === undefined) continue
    initial.set(ref.id, { x: node.position.x, y: node.position.y })
  }

  // Preview mutable: posicións ghost = inicial + delta.
  let ghost = new Map<string, Position>(initial)
  let canceled = false

  return {
    type: 'move',
    preview(): OperationPreview {
      return canceled ? {} : { nodePositions: ghost }
    },
    update(point, _modifiers): void {
      if (canceled) return
      const dx = point.x - startPoint.x
      const dy = point.y - startPoint.y
      const next = new Map<string, Position>()
      for (const [id, pos] of initial) {
        next.set(id, { x: pos.x + dx, y: pos.y + dy })
      }
      ghost = next
    },
    commit(): readonly Command[] {
      if (canceled) return []
      const cmds: Command[] = []
      for (const [id, pos] of ghost) {
        cmds.push(moveNode(id, pos))
      }
      return cmds
    },
    cancel(): void {
      canceled = true
      ghost = new Map()
    },
  }
}
// ── FIN: MoveOperation ──
