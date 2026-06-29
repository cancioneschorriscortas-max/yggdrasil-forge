// ── INICIO: SelectTool ──
// Tool de selección. Comportamento (resumido):
//
//   pointerDown sobre nodo:
//     - se shift/ctrl/meta: selection.toggle(ref)
//     - senón: selection.replace([ref])
//   pointerDown sobre baleiro (target===null):
//     - sen modificador: selection.clear() + fsm.to(marquee, rect 0×0)
//     - con shift/ctrl/meta: NON clear (additive marquee) + fsm.to(marquee)
//   pointerMove en marquee:
//     - actualiza fsm.to(marquee, novo rect desde startPoint a point)
//   pointerUp en marquee:
//     - selecciona TODOS os nodos con position dentro do rect
//       (replace, ou add cando o marquee era additive)
//     - fsm.reset()
//   cancel:
//     - fsm.reset()
//
// O marquee é puramente headless: point-in-rect sobre node.position
// (doc-space). Nodos sen position ignóranse.

import type { InputEvent, Modifiers, Rect } from '../../interaction/InputEvent.js'
import type { SelectionRef } from '../../selection/Selection.js'
import type { Tool, ToolContext } from '../Tool.js'

function isAdditive(mods: Modifiers): boolean {
  return Boolean(mods.shift) || Boolean(mods.ctrl) || Boolean(mods.meta)
}

/** Estado interno da Tool. Vive na clausura, non na Session. */
interface SelectToolState {
  /** O punto onde comezou o marquee actual (se hai). */
  marqueeStart: { x: number; y: number } | null
  /** Se o marquee era additive (non substitúe a selección existente). */
  marqueeAdditive: boolean
}

function rectFromPoints(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const width = Math.abs(b.x - a.x)
  const height = Math.abs(b.y - a.y)
  return { x, y, width, height }
}

function inRect(p: { x: number; y: number }, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height
}

export function createSelectTool(): Tool {
  const state: SelectToolState = {
    marqueeStart: null,
    marqueeAdditive: false,
  }

  function resetState(): void {
    state.marqueeStart = null
    state.marqueeAdditive = false
  }

  return {
    id: 'select',
    label: { en: 'Select' },
    onInput(event: InputEvent, ctx: ToolContext): void {
      switch (event.type) {
        case 'pointerDown': {
          // 1. Sobre un nodo (ou outro tipo de target): replace/toggle.
          if (event.target !== null) {
            if (isAdditive(event.modifiers)) {
              ctx.selection.toggle(event.target)
            } else {
              ctx.selection.replace([event.target])
            }
            return
          }
          // 2. Sobre baleiro: abrir marquee.
          if (!isAdditive(event.modifiers)) {
            ctx.selection.clear()
          }
          state.marqueeStart = { x: event.point.x, y: event.point.y }
          state.marqueeAdditive = isAdditive(event.modifiers)
          ctx.fsm.to({
            kind: 'marquee',
            rect: { x: event.point.x, y: event.point.y, width: 0, height: 0 },
          })
          return
        }
        case 'pointerMove': {
          if (state.marqueeStart === null) return
          if (!ctx.fsm.is('marquee')) return
          const rect = rectFromPoints(state.marqueeStart, event.point)
          ctx.fsm.to({ kind: 'marquee', rect })
          return
        }
        case 'pointerUp': {
          if (state.marqueeStart === null) {
            // Click sobre un nodo: pointerUp non fai nada extra.
            return
          }
          if (!ctx.fsm.is('marquee')) {
            resetState()
            ctx.fsm.reset()
            return
          }
          const rect = rectFromPoints(state.marqueeStart, event.point)
          const inside: SelectionRef[] = []
          for (const node of ctx.document().tree.nodes) {
            if (node.position === undefined) continue
            if (inRect(node.position, rect)) {
              inside.push({ kind: 'node', id: node.id })
            }
          }
          if (state.marqueeAdditive) {
            for (const ref of inside) ctx.selection.add(ref)
          } else {
            ctx.selection.replace(inside)
          }
          resetState()
          ctx.fsm.reset()
          return
        }
        case 'cancel': {
          resetState()
          ctx.fsm.reset()
          return
        }
        case 'key': {
          // Key bindings (Escape, Delete...) son v1.1 — fsm cancel
          // chega via event 'cancel' do controller.
          return
        }
      }
    },
  }
}
// ── FIN: SelectTool ──
