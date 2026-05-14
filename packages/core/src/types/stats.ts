// ── INICIO: Stats types ──
// Contribucións de nodos a stats globais (procesadas polo StatComputer).

import type { UnlockCondition } from './unlock.js'

/**
 * Operación dunha contribución a un stat.
 */
export type StatContributionOp = '+' | '-' | '*' | '/' | 'min' | 'max' | 'set'

/**
 * Contribución dun nodo a un stat global.
 */
export interface StatContribution {
  readonly statId: string
  readonly op: StatContributionOp
  readonly value: number
  readonly perTier?: boolean
  readonly conditions?: readonly UnlockCondition[]
}

/**
 * Explicación do cálculo dun stat (para devtools e debugging).
 */
export interface StatExplanation {
  readonly statId: string
  readonly finalValue: number
  readonly contributions: readonly {
    readonly nodeId: string
    readonly op: StatContributionOp
    readonly value: number
    readonly appliedTier: number
    readonly conditional?: boolean
  }[]
}
// ── FIN: Stats types ──
