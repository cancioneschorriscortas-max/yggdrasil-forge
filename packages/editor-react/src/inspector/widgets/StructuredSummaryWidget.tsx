// ── INICIO: StructuredSummaryWidget ──
// Resumo de lectura para campos `kind:'structured'` (effects,
// prerequisites, exclusions, cost, etc.). **Non editable en 7.5c-i**;
// edición vén en 7.5c-ii con sub-editores específicos por kind.
//
// Mostra unha contaxe simple ("3 effects · edición en 7.5c-ii") para
// que o Inspector se vexa completo e o usuario saiba que existe o
// campo.

import type { JSX } from 'react'

export interface StructuredSummaryWidgetProps {
  /** Categoría: 'effects' | 'prerequisites' | 'exclusions' | 'cost' | etc. */
  readonly of: string
  /** Valor actual (array, obxecto, etc. — só se usa para conta/non-vacuidade). */
  readonly value: unknown
}

/** Conta elementos cunha heurística simple. */
function summarize(of: string, value: unknown): string {
  if (value === undefined || value === null) return `Sen ${of}`
  if (Array.isArray(value)) {
    return `${value.length} ${of}${value.length === 1 ? '' : 's'}`
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as object)
    return `${keys.length} entrada${keys.length === 1 ? '' : 's'}`
  }
  return `1 ${of}`
}

export function StructuredSummaryWidget({ of, value }: StructuredSummaryWidgetProps): JSX.Element {
  return (
    <div className="editor-inspector-structured-summary">
      <span className="editor-inspector-structured-count">{summarize(of, value)}</span>
      <span className="editor-inspector-structured-hint">· edición en 7.5c-ii</span>
    </div>
  )
}
// ── FIN: StructuredSummaryWidget ──
