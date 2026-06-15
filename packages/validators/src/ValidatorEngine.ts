// ── INICIO: ValidatorEngine ──
// Motor de validación pedagóxica para Yggdrasil Forge.
//
// **Sub-fase 8.7.a**: implementación standalone. API:
// registerRule + unregisterRule + validate + getRules + size.

import type { TreeDef } from '@yggdrasil-forge/core'
import type { ValidationIssue, ValidationReport, ValidationRule } from './types.js'

/**
 * Motor de validación pedagóxica.
 *
 * @example
 * const validator = new ValidatorEngine()
 * validator.registerRule(noCyclesRule)
 * const report = await validator.validate(treeDef)
 * if (report.hasErrors) console.error(report.issues)
 */
export class ValidatorEngine {
  private readonly rules = new Map<string, ValidationRule>()

  /**
   * Rexistra unha regra. Se xa existe unha con o mesmo id,
   * substitúe.
   */
  registerRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule)
  }

  /**
   * Desinscribe a regra polo id. Devolve true se existía e foi
   * eliminada; false se non existía.
   */
  unregisterRule(id: string): boolean {
    return this.rules.delete(id)
  }

  /**
   * Devolve un array inmutable das regras rexistradas, en orde
   * de inserción.
   */
  getRules(): readonly ValidationRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * Devolve o número de regras rexistradas.
   */
  size(): number {
    return this.rules.size
  }

  /**
   * Executa tódalas regras rexistradas contra o treeDef.
   *
   * Devolve un ValidationReport con tódolos issues atopados +
   * counters por severidade.
   */
  async validate(treeDef: TreeDef): Promise<ValidationReport> {
    const issues: ValidationIssue[] = []

    for (const rule of this.rules.values()) {
      const ruleIssues = rule.validate(treeDef)
      for (const issue of ruleIssues) {
        issues.push(issue)
      }
    }

    let errorCount = 0
    let warningCount = 0
    let infoCount = 0

    for (const issue of issues) {
      if (issue.severity === 'error') errorCount += 1
      else if (issue.severity === 'warning') warningCount += 1
      else infoCount += 1
    }

    return {
      issues,
      errorCount,
      warningCount,
      infoCount,
      hasErrors: errorCount > 0,
    }
  }
}
// ── FIN: ValidatorEngine ──
