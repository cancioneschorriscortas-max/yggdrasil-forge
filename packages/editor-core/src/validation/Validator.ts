// ── INICIO: Validator (tipos + Issue + Registry) ──
// O sistema de validación. Cada Validator é unha función pura que
// inspecciona un EditorDocument e devolve ValidationIssues.
//
// Decisión de deseño (§3 do briefing 7.2):
//   - SEVERIDADE 'error' BLOQUEA a transacción → rollback total.
//   - SEVERIDADE 'warning' ou 'info' NON bloquea → vai ao panel
//     Problemas (futuro 7.4+). O editor debe permitir estados
//     intermedios mentres autoras.
//
// Validadores duros (7.2): integridade estrutural (que o doc nunca se
// corrompa). Validadores semánticos (exclusión asimétrica, ciclos,
// overflow) van como soft non bloqueantes en 7.4+.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { EditorDocument } from '../document/EditorDocument.js'

export type Severity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  readonly severity: Severity
  /** Código identificable (ex. 'YGG_ED_DUP_ID', 'YGG_ED_ORPHAN_EDGE'). */
  readonly code: string
  readonly message: LocalizedString
  readonly nodeId?: string
  readonly edgeId?: string
}

/** Función pura: documento → issues. */
export type Validator = (doc: EditorDocument) => readonly ValidationIssue[]

/**
 * Rexistro mutable de validadores. O `EditorEngine` ten un por
 * defecto, e o consumidor pode engadir/quitar validadores propios.
 */
export class ValidatorRegistry {
  private readonly validators: Validator[] = []

  register(v: Validator): void {
    this.validators.push(v)
  }

  unregister(v: Validator): void {
    const idx = this.validators.indexOf(v)
    if (idx >= 0) this.validators.splice(idx, 1)
  }

  /** Devolve a lista actual (immutable view). */
  list(): readonly Validator[] {
    return this.validators
  }

  /**
   * Corre TODOS os validadores e devolve a unión dos issues.
   * Cada validator é puro: ningún ten efectos colaterais sobre o doc.
   */
  run(doc: EditorDocument): readonly ValidationIssue[] {
    const all: ValidationIssue[] = []
    for (const v of this.validators) {
      const issues = v(doc)
      for (const issue of issues) all.push(issue)
    }
    return all
  }
}

/** Helper: hai algún issue bloqueante (severity='error')? */
export function hasErrors(issues: readonly ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error')
}
// ── FIN: Validator ──
