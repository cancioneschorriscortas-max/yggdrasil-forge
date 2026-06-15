// ── INICIO: ValidatorEngine types ──

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { TreeDef } from '@yggdrasil-forge/core'

/**
 * Severidade dunha ValidationIssue.
 */
export type ValidationSeverity = 'error' | 'warning' | 'info'

/**
 * Issue individual atopada durante validación.
 */
export interface ValidationIssue {
  /** Id da regra que producíu este issue. */
  readonly ruleId: string
  /** Severidade do issue. */
  readonly severity: ValidationSeverity
  /** Mensaxe humana describindo o problema. */
  readonly message: string
  /** Id do nodo afectado (se aplica). */
  readonly nodeId?: string
  /** Id do edge afectado (se aplica). */
  readonly edgeId?: string
}

/**
 * Regra de validación. Pode rexistrarse en ValidatorEngine.
 */
export interface ValidationRule {
  /** Identificador único da regra (e.g., 'no_cycles'). */
  readonly id: string
  /** Etiqueta visible localizable. */
  readonly label: LocalizedString
  /** Severidade dos issues que producirá. */
  readonly severity: ValidationSeverity
  /**
   * Validar o treeDef. Devolve array de issues (vacío se cero
   * problemas).
   */
  validate(treeDef: TreeDef): readonly ValidationIssue[]
}

/**
 * Resultado da validación. Contén issues + counters por severidade.
 */
export interface ValidationReport {
  /** Tódalas issues producidas, en orde de aparición. */
  readonly issues: readonly ValidationIssue[]
  /** Número de issues con severity='error'. */
  readonly errorCount: number
  /** Número de issues con severity='warning'. */
  readonly warningCount: number
  /** Número de issues con severity='info'. */
  readonly infoCount: number
  /** True se errorCount > 0. */
  readonly hasErrors: boolean
}

// ── FIN: ValidatorEngine types ──
