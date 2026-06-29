// ── INICIO: MoveTool ──
// Tool de mover. Comportamento (resumido):
//
//   pointerDown sobre nodo:
//     - se o nodo NON está seleccionado: replace([node]) primeiro.
//     - beginOperation(MoveOperation(doc, selection, point))
//     - fsm.to(dragging)
//   pointerMove durante dragging:
//     - updateOperation(point, modifiers)
//   pointerUp durante dragging:
//     - commitOperation('Move')      ← UNHA transacción para N nodos
//     - fsm.reset()
//   cancel:
//     - cancelOperation() + fsm.reset()
//
// Se pointerDown chega sobre baleiro coa MoveTool activa, NON pasa
// nada (a tool é só para mover; o marquee é da SelectTool). O usuario
// debería cambiar de tool primeiro.

import type { InputEvent } from '../../interaction/InputEvent.js'
import { createMoveOperation } from '../../operation/MoveOperation.js'
import type { Tool, ToolContext } from '../Tool.js'

export function createMoveTool(): Tool {
  return {
    id: 'move',
    label: { en: 'Move' },
    onInput(event: InputEvent, ctx: ToolContext): void {
      switch (event.type) {
        case 'pointerDown': {
          if (event.target === null) return
          if (event.target.kind !== 'node') return
          // Se o nodo non está seleccionado, replace antes do drag.
          if (!ctx.selection.isSelected(event.target)) {
            ctx.selection.replace([event.target])
          }
          // Iniciar Operation. O controller mantén a op activa.
          const op = createMoveOperation(ctx.document(), ctx.selection, event.point)
          ctx.beginOperation(op)
          ctx.fsm.to({ kind: 'dragging' })
          return
        }
        case 'pointerMove': {
          if (!ctx.fsm.is('dragging')) return
          ctx.updateOperation(event.point, {})
          return
        }
        case 'pointerUp': {
          if (!ctx.fsm.is('dragging')) return
          ctx.commitOperation({ en: 'Move' })
          ctx.fsm.reset()
          return
        }
        case 'cancel': {
          ctx.cancelOperation()
          ctx.fsm.reset()
          return
        }
        case 'key': {
          return
        }
      }
    },
  }
}
// ── FIN: MoveTool ──
