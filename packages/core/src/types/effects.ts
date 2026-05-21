// ── INICIO: Effects DSL ──
// DSL declarativo para describir efectos secundarios ao desbloquear nodos.
// Os efectos son serializables, reversibles (para respec) e seguros (sen eval).

import type { NodeState } from './node.js'
import type { UnlockCondition } from './unlock.js'

/**
 * Efecto declarativo: un cambio que ocorre cando se executa unha acción
 * (desbloquear nodo, alcanzar milestone, etc.).
 *
 * O motor aplica os efectos no orde definido. Para respec, aplícase a operación
 * inversa de cada efecto (cando é reversible).
 *
 * Tipos de efecto:
 *
 * - modify_resource — Cambia a cantidade dun recurso (+/-/*)
 * - modify_stat — Cambia un stat global
 * - modify_node_state — Cambia o estado dun nodo
 * - set_node_visibility — Mostra ou agocha un nodo
 * - unlock_node — Desbloquea outro nodo en cascada
 * - set_progress — Establece a porcentaxe de progreso dun nodo
 * - trigger_event — Emite un evento custom
 * - conditional — Avalía unha condición e aplica then ou else
 * - composite — Agrupación de efectos para executar en sucesión
 * - plugin — Delega a lóxica a un plugin rexistrado
 */
export type Effect =
  | {
      readonly type: 'modify_resource'
      readonly resourceId: string
      readonly op: '+' | '-' | '*'
      readonly amount: number
    }
  | {
      readonly type: 'modify_stat'
      readonly statId: string
      readonly op: '+' | '-' | '*'
      readonly amount: number
    }
  | { readonly type: 'modify_node_state'; readonly nodeId: string; readonly state: NodeState }
  | { readonly type: 'set_node_visibility'; readonly nodeId: string; readonly visible: boolean }
  | { readonly type: 'unlock_node'; readonly nodeId: string }
  | { readonly type: 'set_progress'; readonly nodeId: string; readonly percent: number }
  | {
      readonly type: 'trigger_event'
      readonly eventName: string
      readonly payload?: unknown
      readonly irreversible?: boolean
    }
  | {
      readonly type: 'conditional'
      readonly condition: UnlockCondition
      readonly then: readonly Effect[]
      readonly else?: readonly Effect[]
    }
  | { readonly type: 'composite'; readonly effects: readonly Effect[] }
  | {
      readonly type: 'plugin'
      readonly pluginId: string
      readonly params?: Readonly<Record<string, unknown>>
    }

/**
 * Resultado da aplicación dun efecto.
 */
export interface EffectResult {
  readonly effect: Effect
  readonly applied: boolean
  readonly reason?: string
  /**
   * Valor previo do campo modificado, gardado para soportar `reverse()`.
   * Tratado como `unknown`: cada effect coñece o seu tipo concreto.
   * `composite` e `conditional` poden gardar aquí o array de results
   * dos effects internos (para reverse en cascada). `trigger_event` non
   * garda nada (non hai estado mutable que restaurar).
   */
  readonly previousValue?: unknown
}
// ── FIN: Effects DSL ──
