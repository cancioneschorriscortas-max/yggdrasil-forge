// ── INICIO: InputEvent ──
// Eventos de entrada que consume a capa de interacción.
//
// **Coordenadas en espazo de documento** — a UI (7.5) traduce
// pantalla→doc co viewport antes de despachar o evento. O
// editor-core non fai xeometría de render nin hit-test.
//
// `target` resólveo a UI mediante hit-test no renderer e pásao
// como SelectionRef xa identificado. Esta é a costura limpa entre
// a capa headless (este paquete) e o render (futuro @editor-react).

import type { Position } from '@yggdrasil-forge/core'
import type { SelectionRef } from '../selection/Selection.js'

/** Modificadores do teclado durante un evento de punteiro/key. */
export interface Modifiers {
  readonly shift?: boolean
  readonly ctrl?: boolean
  readonly meta?: boolean
  readonly alt?: boolean
}

/** Rectángulo en coordenadas de documento (usado polo marquee). */
export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Unión discriminada de eventos. As tools consómenos via `onInput`;
 * o controller só os enruta á tool activa.
 */
export type InputEvent =
  | {
      readonly type: 'pointerDown'
      readonly point: Position
      readonly target: SelectionRef | null
      readonly modifiers: Modifiers
    }
  | { readonly type: 'pointerMove'; readonly point: Position }
  | { readonly type: 'pointerUp'; readonly point: Position; readonly modifiers: Modifiers }
  | { readonly type: 'key'; readonly key: string; readonly modifiers: Modifiers }
  /** Escape, blur, ou calquera xeito de abortar a interacción en curso. */
  | { readonly type: 'cancel' }
// ── FIN: InputEvent ──
