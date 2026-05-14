// ── INICIO: Progress source types ──
// Fontes externas de progreso (Moodle, YouTube, callbacks, eventos, computados).

import type { AuthConfig } from './auth.js'

/**
 * Configuración da fonte de progreso dun nodo.
 *
 * Cinco tipos:
 * - manual — Progreso establecido só pola API
 * - remote — Polling a un endpoint HTTP
 * - callback — Handler async rexistrado polo usuario
 * - event — Reactivo a eventos custom
 * - computed — Calculado a partir doutros nodos
 */
export type ProgressSourceConfig =
  | { readonly type: 'manual' }
  | {
      readonly type: 'remote'
      readonly endpoint: string
      readonly intervalMs?: number
      readonly headers?: Readonly<Record<string, string>>
      readonly auth?: AuthConfig
    }
  | {
      readonly type: 'callback'
      readonly handlerId: string
      readonly intervalMs?: number
    }
  | {
      readonly type: 'event'
      readonly eventName: string
    }
  | {
      readonly type: 'computed'
      readonly dependsOn: readonly string[]
      readonly formula: 'sum' | 'avg' | 'min' | 'max'
    }

/**
 * Handler para fontes de progreso tipo callback.
 */
export type ProgressHandler =
  | (() => Promise<number>)
  | ((nodeId: string) => Promise<number>)
  | ((nodeId: string, ctx: ProgressHandlerContext) => Promise<number>)

/**
 * Contexto pasado aos progress handlers cando se solicita.
 */
export interface ProgressHandlerContext {
  readonly locale: string
  readonly timestamp: number
  readonly metadata: Readonly<Record<string, unknown>>
}
// ── FIN: Progress source types ──
