// ── INICIO: Unlock conditions and rules ──
// Sistema declarativo de prerrequisitos: condicións atómicas + combinacións.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { NodeState } from './node.js'

/**
 * Condición atómica para desbloquear un nodo.
 *
 * Cada condición avalíase contra o estado actual da árbore.
 * As condicións combínanse mediante UnlockRule (AND, OR, NOT).
 *
 * Tipos:
 *
 * - `node_unlocked` — Outro nodo está unlocked/maxed
 * - `node_maxed` — Outro nodo está maxed
 * - `node_state` — Outro nodo está nun estado concreto
 * - `nodes_count` — N nodos están unlocked en total (ou nun scope)
 * - `resource_min` — Un recurso ten polo menos X
 * - `tier_min` — Outro nodo está en tier ≥ X
 * - `distance_max` — Este nodo está a ≤ N steps doutro (estilo PoE)
 * - `tag_count` — Hai N nodos cunha tag concreta unlocked
 * - `progress_min` — Outro nodo ten progreso ≥ X%
 * - `subtree_completion` — Unha sub-árbore está completa en ≥ X%
 * - `stat_min` — Un stat global é ≥ X
 * - `time_after` — Pasou o timestamp X (UTC ms)
 * - `time_before` — Aínda non pasou o timestamp X
 * - `custom` — Avaliador rexistrado polo usuario
 */
export type UnlockCondition =
  | { readonly type: 'node_unlocked'; readonly nodeId: string }
  | { readonly type: 'node_maxed'; readonly nodeId: string }
  | { readonly type: 'node_state'; readonly nodeId: string; readonly state: NodeState }
  | { readonly type: 'nodes_count'; readonly count: number; readonly scope?: string }
  | { readonly type: 'resource_min'; readonly resourceId: string; readonly amount: number }
  | { readonly type: 'tier_min'; readonly nodeId: string; readonly tier: number }
  | { readonly type: 'distance_max'; readonly fromNodeId: string; readonly maxSteps: number }
  | { readonly type: 'tag_count'; readonly tag: string; readonly count: number }
  | { readonly type: 'progress_min'; readonly nodeId: string; readonly percent: number }
  | { readonly type: 'subtree_completion'; readonly subtreeId: string; readonly percent: number }
  | { readonly type: 'stat_min'; readonly statId: string; readonly amount: number }
  | { readonly type: 'time_after'; readonly timestamp: number }
  | { readonly type: 'time_before'; readonly timestamp: number }
  | { readonly type: 'custom'; readonly evaluator: string }

/**
 * Regra de desbloqueo: combinación lóxica de condicións.
 *
 * Recursiva: as condicións dentro de "all"/"any"/"none" poden ser tamén
 * UnlockCondition simples (caso máis común) OU outras UnlockRules aniñadas
 * via `as UnlockCondition[]`.
 *
 * @example AND simple
 * { type: 'all', conditions: [
 *   { type: 'node_unlocked', nodeId: 'a' },
 *   { type: 'resource_min', resourceId: 'xp', amount: 100 }
 * ] }
 *
 * @example OR simple
 * { type: 'any', conditions: [
 *   { type: 'node_unlocked', nodeId: 'a' },
 *   { type: 'node_unlocked', nodeId: 'b' }
 * ] }
 *
 * @example Condición simple (sen wrapper)
 * { type: 'node_unlocked', nodeId: 'a' }
 */
export type UnlockRule =
  | { readonly type: 'all'; readonly conditions: readonly UnlockCondition[] }
  | { readonly type: 'any'; readonly conditions: readonly UnlockCondition[] }
  | { readonly type: 'none'; readonly conditions: readonly UnlockCondition[] }
  | UnlockCondition

/**
 * Resultado da avaliación dun UnlockRule.
 */
export interface UnlockCheck {
  /** True se o nodo pode desbloquearse agora mesmo. */
  readonly allowed: boolean
  /** Mensaxe localizada sobre por que está/non está permitido. */
  readonly reason?: LocalizedString
}

/**
 * Explicación detallada da avaliación dun UnlockRule.
 *
 * Útil para UI ("necesitas A, B e C"), debugging e devtools.
 */
export interface UnlockExplanation {
  readonly satisfied: boolean
  readonly conditions: readonly UnlockConditionEvaluation[]
}

/**
 * Resultado de avaliar unha condición concreta dentro dun UnlockExplanation.
 */
export interface UnlockConditionEvaluation {
  readonly condition: UnlockCondition
  readonly satisfied: boolean
  readonly reason: LocalizedString
}
// ── FIN: Unlock conditions and rules ──
